// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialReputationRegistry
/// @notice Encrypted credit score registry plus encrypted on-time-streak
/// counter. Mirrors HashPay's ReputationRegistry on HSK but stores the
/// numeric score and streak as ciphertexts so lenders can underwrite using
/// FHE comparisons without ever seeing the raw values.
/// @dev Score lives in 0..1000. Streak counts consecutive on-time HSK
/// payroll cycles attested by the relayer.
contract ConfidentialReputationRegistry is ZamaEthereumConfig {
    address public immutable owner;
    address public oracle; // PayrollAttestorMirror, set after deployment

    struct Record {
        euint32 score;
        euint32 streak;
        bool exists;
        uint64 updatedAt;
    }

    mapping(address borrower => Record) private _records;

    event OracleUpdated(address indexed oracle);
    event ScoreUpdated(address indexed borrower, uint64 updatedAt);
    event StreakUpdated(address indexed borrower, uint64 updatedAt);
    event ViewerAuthorized(address indexed borrower, address indexed viewer);

    error NotOwner();
    error NotOracle();
    error UnknownBorrower();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOracle(address newOracle) external onlyOwner {
        oracle = newOracle;
        emit OracleUpdated(newOracle);
    }

    /// @notice Update a borrower's encrypted credit score. Only the oracle
    /// (PayrollAttestorMirror) may call.
    function updateScore(address borrower, externalEuint32 encryptedScore, bytes calldata inputProof) external onlyOracle {
        euint32 score = FHE.fromExternal(encryptedScore, inputProof);
        Record storage rec = _records[borrower];
        rec.score = score;
        if (!rec.exists) {
            rec.streak = FHE.asEuint32(0);
            rec.exists = true;
        }
        rec.updatedAt = uint64(block.timestamp);

        FHE.allowThis(score);
        FHE.allow(score, borrower);
        FHE.allowThis(rec.streak);
        FHE.allow(rec.streak, borrower);

        emit ScoreUpdated(borrower, uint64(block.timestamp));
    }

    /// @notice Increment or reset the on-time-streak counter. The oracle
    /// posts an encrypted delta — `1` to increment, `0` to reset (combined
    /// with `reset=true`).
    function updateStreak(address borrower, externalEuint32 encryptedDelta, bytes calldata inputProof, bool reset) external onlyOracle {
        Record storage rec = _records[borrower];
        if (!rec.exists) {
            rec.score = FHE.asEuint32(0);
            rec.streak = FHE.asEuint32(0);
            rec.exists = true;
        }
        euint32 delta = FHE.fromExternal(encryptedDelta, inputProof);
        rec.streak = reset ? FHE.asEuint32(0) : FHE.add(rec.streak, delta);
        rec.updatedAt = uint64(block.timestamp);

        FHE.allowThis(rec.streak);
        FHE.allow(rec.streak, borrower);

        emit StreakUpdated(borrower, uint64(block.timestamp));
    }

    /// @notice Authorize a contract (e.g. ConfidentialAdvance) to use the
    /// encrypted score and streak. The borrower controls who underwrites
    /// against their reputation.
    function authorizeViewer(address viewer) external {
        Record storage rec = _records[msg.sender];
        if (!rec.exists) revert UnknownBorrower();
        FHE.allow(rec.score, viewer);
        FHE.allow(rec.streak, viewer);
        emit ViewerAuthorized(msg.sender, viewer);
    }

    function scoreOf(address borrower) external view returns (euint32) {
        Record storage rec = _records[borrower];
        if (!rec.exists) revert UnknownBorrower();
        return rec.score;
    }

    function streakOf(address borrower) external view returns (euint32) {
        Record storage rec = _records[borrower];
        if (!rec.exists) revert UnknownBorrower();
        return rec.streak;
    }

    function lastUpdated(address borrower) external view returns (uint64) {
        return _records[borrower].updatedAt;
    }
}
