// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPayrollExtension.sol";

interface IPayrollFactoryMin {
    struct Payroll {
        address owner; address token; address[] recipients; uint256[] amounts;
        uint256 frequency; uint256 startTime; uint256 lastExecuted;
        uint256 cycleCount; uint256 totalDeposited; uint256 totalPaid;
        bool active; string name;
    }
    function payrolls(uint256 id) external view returns (
        address owner, address token,
        uint256 frequency, uint256 startTime, uint256 lastExecuted,
        uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
        bool active, string memory name
    );
    function getPayrollDetails(uint256 payrollId) external view returns (
        address owner, address token, string memory name,
        address[] memory recipients, uint256[] memory amounts,
        uint256 frequency, uint256 startTime, uint256 lastExecuted,
        uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
        bool active
    );
}

/// @title AdaptiveCadence — recipient-selected payout cadence (BATCH | STREAM | PULL | HYBRID)
/// @notice Cadence = how money flows. Employer funds once; recipient picks the delivery mode
///         (within employer-permitted bounds). HYBRID = split-mode: X% streams, 1-X% batches.
contract AdaptiveCadence is IPayrollExtension, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum CadenceMode { BATCH, STREAM, PULL, HYBRID }

    struct CadenceState {
        CadenceMode mode;
        uint256 lastClaimTime;
        uint256 accruedBalance;
        uint256 committedBalance;  // amount actually delivered to this contract for recipient
        uint256 cyclesAvailable;
        uint256 streamRate;        // wei/second
        uint256 hybridStreamBps;   // only used for HYBRID (0-10000)
        bool recipientCanSwitch;
        bool configured;
    }

    address public factory;
    address public governance;

    // payrollId => recipient => state
    mapping(uint256 => mapping(address => CadenceState)) public cadenceState;

    event CadenceModeChanged(uint256 indexed payrollId, address indexed recipient, CadenceMode mode);
    event CadencePolicySet(uint256 indexed payrollId, address indexed recipient, CadenceMode mode, bool canSwitch);
    event Claimed(uint256 indexed payrollId, address indexed recipient, uint256 amount);
    event AccrualUpdated(uint256 indexed payrollId, address indexed recipient, uint256 newAccrued);

    modifier onlyFactory() { require(msg.sender == factory, "Only factory"); _; }
    modifier onlyGovernance() { require(msg.sender == governance, "Not governance"); _; }

    constructor(address _factory) {
        factory = _factory;
        governance = msg.sender;
    }

    // ---- Config ----

    function setCadencePolicy(
        uint256 payrollId,
        address recipient,
        CadenceMode mode,
        bool canSwitch,
        uint256 hybridStreamBps
    ) external {
        _ensureEmployer(payrollId);
        require(hybridStreamBps <= 10000, "bps > 10000");
        CadenceState storage s = cadenceState[payrollId][recipient];
        s.mode = mode;
        s.recipientCanSwitch = canSwitch;
        s.hybridStreamBps = hybridStreamBps;
        s.configured = true;
        // streamRate derived lazily from amount/period in onSettleRecipient
        if (s.lastClaimTime == 0) s.lastClaimTime = block.timestamp;
        emit CadencePolicySet(payrollId, recipient, mode, canSwitch);
        emit CadenceModeChanged(payrollId, recipient, mode);
    }

    function setRecipientCadence(uint256 payrollId, CadenceMode mode) external {
        CadenceState storage s = cadenceState[payrollId][msg.sender];
        require(s.configured, "Not configured");
        require(s.recipientCanSwitch, "Switching not permitted");
        _tickStream(payrollId, msg.sender);
        s.mode = mode;
        emit CadenceModeChanged(payrollId, msg.sender, mode);
    }

    // ---- IPayrollExtension ----

    function onFund(uint256, address, uint256) external override {}
    function beforeCycle(uint256, address, uint256) external override {}
    function afterCycle(uint256) external override {}

    /// Advance hook — default passthrough (Cadence doesn't touch debt repayment)
    function onRepay(uint256, address, uint256 grossAmount, address) external override returns (uint256) {
        return grossAmount;
    }

    function onSettleRecipient(
        uint256 payrollId,
        address recipient,
        uint256 grossAmount,
        address /*token*/,
        bytes32 /*requestId*/
    ) external override onlyFactory returns (address payoutTarget, uint256 payoutAmount) {
        CadenceState storage s = cadenceState[payrollId][recipient];
        if (!s.configured) {
            // default behavior = BATCH
            return (recipient, grossAmount);
        }

        // Derive streamRate from frequency & gross (first settle)
        if (s.streamRate == 0) {
            uint256 freq = _getFrequency(payrollId);
            if (freq > 0) s.streamRate = grossAmount / freq;
        }

        if (s.mode == CadenceMode.BATCH) {
            return (recipient, grossAmount);
        } else if (s.mode == CadenceMode.STREAM) {
            s.committedBalance += grossAmount;
            s.accruedBalance += grossAmount;
            emit AccrualUpdated(payrollId, recipient, s.accruedBalance);
            return (address(this), grossAmount);
        } else if (s.mode == CadenceMode.PULL) {
            s.committedBalance += grossAmount;
            s.cyclesAvailable += 1;
            s.accruedBalance += grossAmount;
            emit AccrualUpdated(payrollId, recipient, s.accruedBalance);
            return (address(this), grossAmount);
        } else {
            // HYBRID — split
            uint256 streamPart = (grossAmount * s.hybridStreamBps) / 10000;
            uint256 batchPart = grossAmount - streamPart;
            s.committedBalance += streamPart;
            s.accruedBalance += streamPart;
            emit AccrualUpdated(payrollId, recipient, s.accruedBalance);
            // factory will transfer batchPart to recipient and streamPart to this contract
            // but factory only supports a single payoutTarget, so we take the full amount here
            // and transfer the batch part out immediately.
            if (batchPart > 0) {
                // We can't do transferFrom since factory already has the funds and will send
                // payoutAmount to payoutTarget. Solution: take full amount, then push batchPart
                // out in afterHybridSettle via a post-hook. Simpler: we just return recipient
                // for the full amount and rebook accounting to track the stream liability,
                // paid back out by a synthetic claim.
                // Implementation: take full, send batchPart to recipient here.
                // But we can't transfer before receiving. Adjustment: factory sends full to us,
                // we immediately forward batchPart below.
            }
            // Schedule follow-up push: we can't trigger transfer from msg.sender since factory
            // hasn't sent yet. Instead take full and let `afterCycle` flush batch payouts via
            // a recorded queue; simpler still: transfer batchPart synchronously from ourselves
            // after factory sends. Since factory will safeTransfer(amount, this) right after
            // this call, we mark a queued batch payout for post-settlement.
            if (batchPart > 0) {
                _queueBatch(payrollId, recipient, batchPart);
            }
            return (address(this), grossAmount);
        }
    }

    // ---- HYBRID queue flush (called by recipient or anyone after cycle) ----

    struct BatchQueue { address recipient; uint256 amount; }
    mapping(uint256 => BatchQueue[]) private _batchQueue;

    function _queueBatch(uint256 payrollId, address recipient, uint256 amount) internal {
        _batchQueue[payrollId].push(BatchQueue(recipient, amount));
    }

    function flushBatchQueue(uint256 payrollId) public nonReentrant {
        BatchQueue[] storage q = _batchQueue[payrollId];
        address token = _getToken(payrollId);
        while (q.length > 0) {
            BatchQueue memory item = q[q.length - 1];
            q.pop();
            // track: reduce committed/accrued so HYBRID batch portion isn't double-counted
            CadenceState storage s = cadenceState[payrollId][item.recipient];
            if (s.accruedBalance >= item.amount) s.accruedBalance -= item.amount;
            if (s.committedBalance >= item.amount) s.committedBalance -= item.amount;
            IERC20(token).safeTransfer(item.recipient, item.amount);
        }
    }

    // ---- Claim ----

    function claim(uint256 payrollId) external nonReentrant returns (uint256 amount) {
        // auto-flush any pending HYBRID batch payouts before claim so recipient sees full UX
        if (_batchQueue[payrollId].length > 0) flushBatchQueue(payrollId);
        CadenceState storage s = cadenceState[payrollId][msg.sender];
        amount = _accruedFor(s);
        require(amount > 0, "Nothing to claim");
        require(amount <= s.accruedBalance, "Exceeds accrued");

        s.accruedBalance -= amount;
        if (s.mode == CadenceMode.PULL) {
            // consume one cycle per full cycleCost; approximate by resetting to remaining balance
            if (s.cyclesAvailable > 0) s.cyclesAvailable -= 1;
        }
        s.lastClaimTime = block.timestamp;

        address token = _getToken(payrollId);
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Claimed(payrollId, msg.sender, amount);
    }

    // ---- Views ----

    function accruedFor(uint256 payrollId, address recipient) external view returns (uint256) {
        return _accruedFor(cadenceState[payrollId][recipient]);
    }

    function _accruedFor(CadenceState storage s) internal view returns (uint256) {
        if (s.mode == CadenceMode.BATCH) return 0;
        if (s.mode == CadenceMode.PULL) return s.accruedBalance;
        // STREAM / HYBRID: ticking portion bounded by committed balance
        if (s.committedBalance == 0) return 0;
        uint256 dt = block.timestamp - s.lastClaimTime;
        uint256 ticked = dt * s.streamRate;
        if (s.mode == CadenceMode.HYBRID) {
            // stream-only portion ticks; batch portion already queued out
        }
        if (ticked > s.accruedBalance) ticked = s.accruedBalance;
        return ticked;
    }

    function getCadenceState(uint256 payrollId, address recipient)
        external
        view
        returns (CadenceState memory)
    {
        return cadenceState[payrollId][recipient];
    }

    // ---- Internals ----

    function _tickStream(uint256 payrollId, address recipient) internal {
        CadenceState storage s = cadenceState[payrollId][recipient];
        uint256 ticked = _accruedFor(s);
        // fold into claimable — just update lastClaimTime forward so accrual "pauses" on mode switch
        if (ticked > 0) {
            s.lastClaimTime = block.timestamp;
        }
    }

    function _ensureEmployer(uint256 payrollId) internal view {
        (address owner,,,,,,,,,) = IPayrollFactoryMin(factory).payrolls(payrollId);
        require(owner == msg.sender, "Not employer");
    }

    function _getFrequency(uint256 payrollId) internal view returns (uint256) {
        (,, uint256 freq,,,,,,,) = IPayrollFactoryMin(factory).payrolls(payrollId);
        return freq;
    }

    function _getToken(uint256 payrollId) internal view returns (address) {
        (, address token,,,,,,,,) = IPayrollFactoryMin(factory).payrolls(payrollId);
        return token;
    }
}
