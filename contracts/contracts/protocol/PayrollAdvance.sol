// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPayrollExtension.sol";

interface IReputationRegistryRead {
    function incomeOf(address) external view returns (uint256);
    function onTimeRate(address) external view returns (uint256);
}

interface IPayrollFactoryMin {
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

/// @title PayrollAdvance — receipt-backed income advances.
/// @notice Closes the PayFi loop: Income → Reputation → Credit → Settlement.
///         Lenders pool liquidity, earn interest from advances, auto-repaid on next executeCycle.
///         Reputation score gates LTV and APR (bonus #6: reputation-priced APR).
contract PayrollAdvance is IPayrollExtension, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Advance {
        uint256 id;
        uint256 payrollId;
        address recipient;
        address token;
        uint256 principal;
        uint256 interestBps;
        uint256 takenAt;
        bool repaid;
    }

    uint256 public constant MAX_LTV_BPS = 7000; // 70%
    uint256 public constant BASE_INTEREST_BPS = 100; // 1% per cycle baseline

    address public factory;
    address public governance;
    IReputationRegistryRead public reputation;

    uint256 public advanceCount;
    mapping(uint256 => Advance) public advances;
    mapping(address => uint256[]) public advancesOf;
    mapping(address => uint256) public outstandingPerRecipient;
    mapping(uint256 => uint256) public outstandingPerPayroll;

    // lender pool (token-agnostic not supported; one active token per advance pool)
    mapping(address => uint256) public lenderPoolBalance;
    mapping(address => mapping(address => uint256)) public lenderShares; // token => lender => shares
    mapping(address => uint256) public totalShares; // token => shares

    event AdvanceRequested(uint256 indexed id, address indexed recipient, uint256 principal, uint256 interestBps);
    event AdvanceRepaid(uint256 indexed id, uint256 principal, uint256 interest);
    event AdvanceDenied(address indexed recipient, string reason);
    event LenderPoolFunded(address indexed lender, address indexed token, uint256 amount, uint256 shares);
    event LenderWithdrew(address indexed lender, address indexed token, uint256 shares, uint256 amount);

    modifier onlyFactory() { require(msg.sender == factory, "Only factory"); _; }
    modifier onlyGovernance() { require(msg.sender == governance, "Not governance"); _; }

    constructor(address _factory, address _reputation) {
        factory = _factory;
        reputation = IReputationRegistryRead(_reputation);
        governance = msg.sender;
    }

    // ---- Lender pool ----

    function fundLenderPool(address token, uint256 amount) external nonReentrant returns (uint256 shares) {
        require(amount > 0, "Zero amount");
        uint256 pool = lenderPoolBalance[token];
        uint256 ts = totalShares[token];
        shares = ts == 0 || pool == 0 ? amount : (amount * ts) / pool;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        lenderPoolBalance[token] += amount;
        lenderShares[token][msg.sender] += shares;
        totalShares[token] += shares;
        emit LenderPoolFunded(msg.sender, token, amount, shares);
    }

    function withdrawFromPool(address token, uint256 shares) external nonReentrant returns (uint256 amount) {
        require(shares > 0, "Zero shares");
        uint256 userShares = lenderShares[token][msg.sender];
        require(userShares >= shares, "Not enough shares");
        uint256 ts = totalShares[token];
        uint256 pool = lenderPoolBalance[token];
        amount = (shares * pool) / ts;
        lenderShares[token][msg.sender] -= shares;
        totalShares[token] -= shares;
        lenderPoolBalance[token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit LenderWithdrew(msg.sender, token, shares, amount);
    }

    // ---- Advance ----

    /// Reputation-tier lookup (bonus #6 — APR scales w/ reputation).
    /// Returns (ltvBps, interestBps).
    function tierFor(address recipient) public view returns (uint256 ltvBps, uint256 interestBps) {
        uint256 income = reputation.incomeOf(recipient);
        uint256 onTime = reputation.onTimeRate(recipient);
        if (income >= 10_000 * 1e6 && onTime >= 8000) {
            return (MAX_LTV_BPS, BASE_INTEREST_BPS);           // 70% LTV, 1% interest
        } else if (income >= 1_000 * 1e6) {
            return (5000, BASE_INTEREST_BPS + 50);             // 50% LTV, 1.5%
        } else if (income >= 100 * 1e6) {
            return (3000, BASE_INTEREST_BPS + 100);            // 30% LTV, 2%
        }
        return (0, 0);
    }

    function maxAdvanceFor(address recipient, uint256 payrollId) public view returns (uint256) {
        (uint256 ltvBps, ) = tierFor(recipient);
        if (ltvBps == 0) return 0;
        uint256 nextPayout = _nextPayout(recipient, payrollId);
        if (nextPayout == 0) return 0;
        uint256 cap = (nextPayout * ltvBps) / 10000;
        uint256 outstanding = outstandingPerRecipient[recipient];
        if (outstanding >= cap) return 0;
        return cap - outstanding;
    }

    function requestAdvance(uint256 payrollId, uint256 amount) external nonReentrant returns (uint256 id) {
        (address owner, address token,,,,,,,, ) = IPayrollFactoryMin(factory).payrolls(payrollId);
        require(owner != address(0), "No payroll");
        uint256 max = maxAdvanceFor(msg.sender, payrollId);
        if (amount == 0 || amount > max) {
            emit AdvanceDenied(msg.sender, amount == 0 ? "Zero amount" : "Exceeds LTV");
            revert("Advance denied");
        }
        require(lenderPoolBalance[token] >= amount, "Insufficient pool");
        (, uint256 interestBps) = tierFor(msg.sender);

        advanceCount++;
        id = advanceCount;
        advances[id] = Advance({
            id: id,
            payrollId: payrollId,
            recipient: msg.sender,
            token: token,
            principal: amount,
            interestBps: interestBps,
            takenAt: block.timestamp,
            repaid: false
        });
        advancesOf[msg.sender].push(id);
        outstandingPerRecipient[msg.sender] += amount;
        outstandingPerPayroll[payrollId] += amount;
        lenderPoolBalance[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);
        emit AdvanceRequested(id, msg.sender, amount, interestBps);
    }

    // ---- IPayrollExtension ----

    function onFund(uint256, address, uint256) external override {}
    function beforeCycle(uint256, address, uint256) external override {}
    function afterCycle(uint256) external override {}
    function onSettleRecipient(
        uint256, address recipient, uint256 grossAmount, address, bytes32
    ) external override returns (address, uint256) {
        return (recipient, grossAmount);
    }

    /// Repay hook — deducts outstanding debt + interest from gross payout, returns net.
    function onRepay(
        uint256 payrollId,
        address recipient,
        uint256 grossAmount,
        address token
    ) external override onlyFactory returns (uint256 netAmount) {
        uint256 debt = outstandingPerRecipient[recipient];
        if (debt == 0) return grossAmount;

        // Sum interest across this recipient's unpaid advances
        uint256 totalOwed;
        uint256[] storage ids = advancesOf[recipient];
        for (uint256 i = 0; i < ids.length; i++) {
            Advance storage a = advances[ids[i]];
            if (a.repaid) continue;
            if (a.token != token) continue;
            uint256 interest = (a.principal * a.interestBps) / 10000;
            totalOwed += a.principal + interest;
        }
        if (totalOwed > grossAmount) totalOwed = grossAmount;

        // mark advances as repaid in order until totalOwed is consumed
        uint256 remaining = totalOwed;
        uint256 principalRepaid;
        uint256 interestRepaid;
        for (uint256 i = 0; i < ids.length && remaining > 0; i++) {
            Advance storage a = advances[ids[i]];
            if (a.repaid || a.token != token) continue;
            uint256 interest = (a.principal * a.interestBps) / 10000;
            uint256 owed = a.principal + interest;
            if (remaining >= owed) {
                a.repaid = true;
                remaining -= owed;
                principalRepaid += a.principal;
                interestRepaid += interest;
                outstandingPerRecipient[recipient] -= a.principal;
                outstandingPerPayroll[payrollId] -= a.principal;
                emit AdvanceRepaid(a.id, a.principal, interest);
            } else {
                // partial repayment: reduce principal proportionally
                uint256 ratio = (remaining * 10000) / owed;
                uint256 pPart = (a.principal * ratio) / 10000;
                uint256 iPart = (interest * ratio) / 10000;
                a.principal -= pPart;
                principalRepaid += pPart;
                interestRepaid += iPart;
                outstandingPerRecipient[recipient] -= pPart;
                outstandingPerPayroll[payrollId] -= pPart;
                remaining = 0;
            }
        }

        // factory pushes `grossAmount - netAmount` to this contract after onRepay returns
        lenderPoolBalance[token] += principalRepaid + interestRepaid;
        netAmount = grossAmount - totalOwed;
    }

    function outstandingDebt(address recipient) external view returns (uint256) {
        return outstandingPerRecipient[recipient];
    }

    function _nextPayout(address recipient, uint256 payrollId) internal view returns (uint256) {
        (,,,address[] memory recipients, uint256[] memory amounts,,,,,,,) =
            IPayrollFactoryMin(factory).getPayrollDetails(payrollId);
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == recipient) return amounts[i];
        }
        return 0;
    }
}
