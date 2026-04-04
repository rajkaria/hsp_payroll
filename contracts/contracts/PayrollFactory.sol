// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./HSPAdapter.sol";

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
        require(escrowBalances[payrollId] >= cycleCost, "Insufficient escrow balance");

        p.cycleCount++;
        uint256 cycleNumber = p.cycleCount;

        bytes32[] memory requestIds = hspAdapter.createBatchRequests(
            msg.sender, p.recipients, p.token, p.amounts
        );

        for (uint256 i = 0; i < p.recipients.length; i++) {
            IERC20(p.token).safeTransfer(p.recipients[i], p.amounts[i]);
            hspAdapter.confirmPayment(requestIds[i]);
            hspAdapter.markSettled(requestIds[i]);

            cycleReceipts[payrollId][cycleNumber].push(Receipt({
                payrollId: payrollId,
                cycleNumber: cycleNumber,
                recipient: p.recipients[i],
                amount: p.amounts[i],
                timestamp: block.timestamp,
                hspRequestId: requestIds[i]
            }));

            emit PaymentSettled(payrollId, p.recipients[i], p.amounts[i], requestIds[i]);
        }

        escrowBalances[payrollId] -= cycleCost;
        p.totalPaid += cycleCost;
        p.lastExecuted = block.timestamp;

        emit CycleExecuted(payrollId, cycleNumber, cycleCost);
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
