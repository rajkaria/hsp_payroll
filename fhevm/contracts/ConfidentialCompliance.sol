// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialCompliance
/// @notice Stores one encrypted KYC/AML pass-flag per address. The
/// confidential underwriting product (`ConfidentialAdvance`) ANDs the flag
/// into its approval predicate so a sanctioned or KYC-failing address
/// silently fails to qualify — without anyone (including the borrower's
/// peers, lenders, or chain observers) learning the membership of the
/// blacklist itself.
/// @dev The compliance officer holds the only ACL grant on the encrypted
/// flag, plus the borrower (so the borrower can self-check). Lenders are
/// given input-only ACL via `authorizeChecker`.
contract ConfidentialCompliance is ZamaEthereumConfig {
    address public immutable owner;
    mapping(address => bool) public isOfficer;

    struct Flag {
        ebool passed;
        bool exists;
        uint64 updatedAt;
    }

    mapping(address subject => Flag) private _flags;

    event OfficerUpdated(address indexed officer, bool allowed);
    event FlagUpdated(address indexed subject, uint64 updatedAt);
    event CheckerAuthorized(address indexed subject, address indexed checker);

    error NotOwner();
    error NotOfficer();
    error UnknownSubject();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOfficer() {
        if (!isOfficer[msg.sender]) revert NotOfficer();
        _;
    }

    constructor() {
        owner = msg.sender;
        isOfficer[msg.sender] = true;
    }

    function setOfficer(address officer, bool allowed) external onlyOwner {
        isOfficer[officer] = allowed;
        emit OfficerUpdated(officer, allowed);
    }

    /// @notice Set the encrypted KYC pass flag for a subject. Officers
    /// flip the bit using `FHE.asEbool(true|false)` client-side.
    function setFlag(address subject, bool passed) external onlyOfficer {
        ebool flag = FHE.asEbool(passed);
        _flags[subject] = Flag({passed: flag, exists: true, updatedAt: uint64(block.timestamp)});
        FHE.allowThis(flag);
        FHE.allow(flag, msg.sender);
        FHE.allow(flag, subject);
        emit FlagUpdated(subject, uint64(block.timestamp));
    }

    /// @notice Grant a contract (e.g. ConfidentialAdvance) permission to
    /// AND the encrypted compliance flag into its approval predicate. The
    /// caller is the subject — a borrower opts in to having their flag
    /// consulted by a specific lender.
    function authorizeChecker(address checker) external {
        Flag storage f = _flags[msg.sender];
        if (!f.exists) revert UnknownSubject();
        FHE.allow(f.passed, checker);
        emit CheckerAuthorized(msg.sender, checker);
    }

    function flagOf(address subject) external view returns (ebool) {
        Flag storage f = _flags[subject];
        if (!f.exists) revert UnknownSubject();
        return f.passed;
    }

    function exists(address subject) external view returns (bool) {
        return _flags[subject].exists;
    }
}
