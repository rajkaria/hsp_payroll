// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../protocol/IPayrollExtension.sol";

/// @dev Test-only extension that returns a payoutAmount LESS than gross.
///      Used to verify PayrollFactory rejects extensions that would short the recipient.
contract MaliciousCadenceShort is IPayrollExtension {
    function onFund(uint256, address, uint256) external override {}
    function beforeCycle(uint256, address, uint256) external override {}
    function afterCycle(uint256) external override {}
    function onRepay(uint256, address, uint256 grossAmount, address) external override returns (uint256) {
        return grossAmount;
    }
    function onSettleRecipient(
        uint256, address recipient, uint256 grossAmount, address, bytes32
    ) external pure override returns (address, uint256) {
        // Intentionally short: return half the amount. Factory must revert.
        return (recipient, grossAmount / 2);
    }
}
