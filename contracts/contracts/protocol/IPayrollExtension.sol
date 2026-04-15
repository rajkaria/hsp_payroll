// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPayrollExtension
/// @notice Pluggable hook interface used by PayrollFactory for per-cycle customization.
///         Extensions may opt into any subset — unused hooks can be no-ops.
interface IPayrollExtension {
    /// Called from fundPayroll after tokens are moved into the extension.
    /// Implementations can deposit into yield vaults, update internal accounting, etc.
    function onFund(uint256 payrollId, address token, uint256 amount) external;

    /// Called from executeCycle before per-recipient settlement starts.
    /// Yield extensions should return `amountNeeded` to PayrollFactory.
    function beforeCycle(uint256 payrollId, address token, uint256 amountNeeded) external;

    /// Called per-recipient during executeCycle.
    /// @return payoutTarget address that will receive tokens from PayrollFactory (may be this extension, the recipient, or address(0) to skip)
    /// @return payoutAmount amount to transfer (may differ from grossAmount if the extension keeps part)
    function onSettleRecipient(
        uint256 payrollId,
        address recipient,
        uint256 grossAmount,
        address token,
        bytes32 requestId
    ) external returns (address payoutTarget, uint256 payoutAmount);

    /// Called once after per-recipient loop completes.
    function afterCycle(uint256 payrollId) external;

    /// Called during executeCycle to net advance debt out of recipient's gross payout.
    /// Default implementation (no advance) would return grossAmount unchanged.
    /// @return netAmount amount remaining after debt deduction
    function onRepay(
        uint256 payrollId,
        address recipient,
        uint256 grossAmount,
        address token
    ) external returns (uint256 netAmount);
}

/// @notice Compliance hook evaluator — runs all attached hooks; short-circuits on first failure.
interface IComplianceRegistry {
    function runHooks(uint256 payrollId, address recipient, uint256 amount)
        external
        view
        returns (bool passed, string memory reason);
}
