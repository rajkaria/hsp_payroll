// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./HSPAdapter.sol";
import "./protocol/IPayrollExtension.sol";

contract PayrollFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Payroll {
        address owner;
        address token;
        address[] recipients;
        uint256[] amounts;
        uint256 frequency;       // seconds between cycles
        uint256 startTime;
        uint256 lastExecuted;
        uint256 cycleCount;
        uint256 totalDeposited;
        uint256 totalPaid;
        bool active;
        string name;
    }

    struct Receipt {
        uint256 payrollId;
        uint256 cycleNumber;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 hspRequestId;
    }

    HSPAdapter public hspAdapter;
    uint256 public payrollCount;
    mapping(uint256 => Payroll) public payrolls;
    mapping(uint256 => mapping(uint256 => Receipt[])) public cycleReceipts;
    mapping(address => uint256[]) public recipientPayrolls;
    mapping(uint256 => uint256) public escrowBalances;

    // --- Protocol extensions (appended; storage-layout-safe) ---
    address public governance;
    IPayrollExtension public extension;       // optional: routes per-recipient payouts
    IPayrollExtension public yieldExtension;  // optional: wraps fund/execute with vault
    IPayrollExtension public advanceExtension;// optional: repay hook for advances
    address public complianceRegistry;        // optional: compliance hook evaluator

    event ExtensionSet(bytes32 indexed kind, address indexed extension);
    event RecipientSkipped(uint256 indexed payrollId, address indexed recipient, string reason);

    event PayrollCreated(uint256 indexed payrollId, address indexed owner, address token, string name);
    event PayrollFunded(uint256 indexed payrollId, uint256 amount, uint256 newBalance);
    event CycleExecuted(uint256 indexed payrollId, uint256 cycleNumber, uint256 totalPaid);
    event PaymentSettled(uint256 indexed payrollId, address indexed recipient, uint256 amount, bytes32 hspRequestId);
    event PayrollCancelled(uint256 indexed payrollId, uint256 refundedAmount);
    event RecipientAdded(uint256 indexed payrollId, address recipient, uint256 amount);
    event RecipientRemoved(uint256 indexed payrollId, address recipient);
    event FundsWithdrawn(uint256 indexed payrollId, uint256 amount);

    constructor(address _hspAdapter) {
        hspAdapter = HSPAdapter(_hspAdapter);
        governance = msg.sender;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    function setGovernance(address g) external onlyGovernance {
        require(g != address(0), "Zero address");
        governance = g;
    }

    function setExtension(address ext) external onlyGovernance {
        extension = IPayrollExtension(ext);
        emit ExtensionSet("cadence", ext);
    }

    function setYieldExtension(address ext) external onlyGovernance {
        yieldExtension = IPayrollExtension(ext);
        emit ExtensionSet("yield", ext);
    }

    function setAdvanceExtension(address ext) external onlyGovernance {
        advanceExtension = IPayrollExtension(ext);
        emit ExtensionSet("advance", ext);
    }

    function setComplianceRegistry(address r) external onlyGovernance {
        complianceRegistry = r;
        emit ExtensionSet("compliance", r);
    }

    modifier onlyPayrollOwner(uint256 payrollId) {
        require(payrolls[payrollId].owner == msg.sender, "Not payroll owner");
        _;
    }

    function createPayroll(
        string calldata name,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 frequency
    ) external returns (uint256 payrollId) {
        require(recipients.length > 0, "No recipients");
        require(recipients.length == amounts.length, "Length mismatch");
        require(frequency >= 60, "Frequency too short");

        payrollCount++;
        payrollId = payrollCount;

        Payroll storage p = payrolls[payrollId];
        p.owner = msg.sender;
        p.token = token;
        p.recipients = recipients;
        p.amounts = amounts;
        p.frequency = frequency;
        p.startTime = block.timestamp;
        p.lastExecuted = 0;
        p.cycleCount = 0;
        p.totalDeposited = 0;
        p.totalPaid = 0;
        p.active = true;
        p.name = name;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero address recipient");
            require(amounts[i] > 0, "Zero amount");
            recipientPayrolls[recipients[i]].push(payrollId);
        }

        emit PayrollCreated(payrollId, msg.sender, token, name);
    }

    function fundPayroll(uint256 payrollId, uint256 amount) external onlyPayrollOwner(payrollId) nonReentrant {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");

        IERC20(p.token).safeTransferFrom(msg.sender, address(this), amount);
        escrowBalances[payrollId] += amount;
        p.totalDeposited += amount;

        // Yield extension: forward funds to vault if configured
        if (address(yieldExtension) != address(0)) {
            IERC20(p.token).safeTransfer(address(yieldExtension), amount);
            yieldExtension.onFund(payrollId, p.token, amount);
        }

        emit PayrollFunded(payrollId, amount, escrowBalances[payrollId]);
    }

    function executeCycle(uint256 payrollId) external onlyPayrollOwner(payrollId) nonReentrant {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");
        if (p.lastExecuted > 0) {
            require(
                block.timestamp >= p.lastExecuted + p.frequency,
                "Too early for next cycle"
            );
        }

        uint256 cycleCost = _getCycleCost(payrollId);

        // If yield extension holds funds, ask it to return cycleCost's worth to this contract
        if (address(yieldExtension) != address(0)) {
            yieldExtension.beforeCycle(payrollId, p.token, cycleCost);
        }

        require(escrowBalances[payrollId] >= cycleCost, "Insufficient escrow balance");

        p.cycleCount++;
        uint256 cycleNumber = p.cycleCount;

        bytes32[] memory requestIds = hspAdapter.createBatchRequests(
            msg.sender, p.recipients, p.token, p.amounts
        );

        uint256 actualSpent;
        for (uint256 i = 0; i < p.recipients.length; i++) {
            uint256 amt = p.amounts[i];
            address recipient = p.recipients[i];

            // 1) Compliance gating (skip recipient on failure, keep others flowing)
            if (complianceRegistry != address(0)) {
                (bool ok, string memory reason) = IComplianceRegistry(complianceRegistry)
                    .runHooks(payrollId, recipient, amt);
                if (!ok) {
                    hspAdapter.cancelPayment(requestIds[i]);
                    emit RecipientSkipped(payrollId, recipient, reason);
                    continue;
                }
            }

            // 2) Advance repay hook nets debt out of gross amount
            uint256 netAmount = amt;
            if (address(advanceExtension) != address(0)) {
                netAmount = advanceExtension.onRepay(payrollId, recipient, amt, p.token);
                uint256 debtPortion = amt - netAmount;
                if (debtPortion > 0) {
                    IERC20(p.token).safeTransfer(address(advanceExtension), debtPortion);
                }
            }

            // 3) Cadence extension decides payout routing
            address payoutTarget = recipient;
            uint256 payoutAmount = netAmount;
            if (address(extension) != address(0)) {
                (payoutTarget, payoutAmount) = extension.onSettleRecipient(
                    payrollId, recipient, netAmount, p.token, requestIds[i]
                );
            }

            if (payoutAmount > 0 && payoutTarget != address(0)) {
                IERC20(p.token).safeTransfer(payoutTarget, payoutAmount);
            }
            hspAdapter.confirmPayment(requestIds[i]);
            hspAdapter.markSettled(requestIds[i]);

            cycleReceipts[payrollId][cycleNumber].push(Receipt({
                payrollId: payrollId,
                cycleNumber: cycleNumber,
                recipient: recipient,
                amount: amt,
                timestamp: block.timestamp,
                hspRequestId: requestIds[i]
            }));

            emit PaymentSettled(payrollId, recipient, amt, requestIds[i]);
            actualSpent += amt; // gross amount from escrow is fully consumed; advance/cadence reroute within amt
        }

        escrowBalances[payrollId] -= actualSpent;
        p.totalPaid += actualSpent;
        p.lastExecuted = block.timestamp;

        if (address(extension) != address(0)) {
            extension.afterCycle(payrollId);
        }

        emit CycleExecuted(payrollId, cycleNumber, actualSpent);
    }

    function cancelPayroll(uint256 payrollId) external onlyPayrollOwner(payrollId) nonReentrant {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Already cancelled");

        p.active = false;
        uint256 refund = escrowBalances[payrollId];
        if (refund > 0) {
            escrowBalances[payrollId] = 0;
            IERC20(p.token).safeTransfer(msg.sender, refund);
        }

        emit PayrollCancelled(payrollId, refund);
    }

    function withdrawExcess(uint256 payrollId, uint256 amount) external onlyPayrollOwner(payrollId) nonReentrant {
        require(escrowBalances[payrollId] >= amount, "Insufficient balance");
        escrowBalances[payrollId] -= amount;
        IERC20(payrolls[payrollId].token).safeTransfer(msg.sender, amount);
        emit FundsWithdrawn(payrollId, amount);
    }

    function addRecipient(uint256 payrollId, address recipient, uint256 amount) external onlyPayrollOwner(payrollId) {
        require(recipient != address(0), "Zero address");
        require(amount > 0, "Zero amount");
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");

        p.recipients.push(recipient);
        p.amounts.push(amount);
        recipientPayrolls[recipient].push(payrollId);

        emit RecipientAdded(payrollId, recipient, amount);
    }

    function removeRecipient(uint256 payrollId, uint256 recipientIndex) external onlyPayrollOwner(payrollId) {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");
        require(recipientIndex < p.recipients.length, "Index out of bounds");

        address removed = p.recipients[recipientIndex];
        p.recipients[recipientIndex] = p.recipients[p.recipients.length - 1];
        p.recipients.pop();
        p.amounts[recipientIndex] = p.amounts[p.amounts.length - 1];
        p.amounts.pop();

        emit RecipientRemoved(payrollId, removed);
    }

    function getPayrollDetails(uint256 payrollId)
        external view returns (
            address owner, address token, string memory name,
            address[] memory recipients, uint256[] memory amounts,
            uint256 frequency, uint256 startTime, uint256 lastExecuted,
            uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
            bool active
        )
    {
        Payroll storage p = payrolls[payrollId];
        return (p.owner, p.token, p.name, p.recipients, p.amounts,
            p.frequency, p.startTime, p.lastExecuted,
            p.cycleCount, p.totalDeposited, p.totalPaid, p.active);
    }

    function getReceipts(uint256 payrollId, uint256 cycleNumber)
        external view returns (Receipt[] memory)
    {
        return cycleReceipts[payrollId][cycleNumber];
    }

    function getRunway(uint256 payrollId) external view returns (uint256 cyclesRemaining) {
        uint256 cycleCost = _getCycleCost(payrollId);
        if (cycleCost == 0) return 0;
        return escrowBalances[payrollId] / cycleCost;
    }

    function getRecipientPayrolls(address recipient) external view returns (uint256[] memory) {
        return recipientPayrolls[recipient];
    }

    function _getCycleCost(uint256 payrollId) internal view returns (uint256 total) {
        Payroll storage p = payrolls[payrollId];
        for (uint256 i = 0; i < p.amounts.length; i++) {
            total += p.amounts[i];
        }
    }
}
