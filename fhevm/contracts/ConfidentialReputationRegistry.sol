// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialReputationRegistry
/// @notice Encrypted credit score registry. Mirrors HashPay's ReputationRegistry
/// on HSK but stores the numeric score as euint32 so lenders can underwrite
/// using FHE comparisons without ever seeing the score.
/// @dev Score lives in 0..1000. The on-chain HSK side keeps the public
/// boolean attestation; this side stores the private numeric value.
contract ConfidentialReputationRegistry is SepoliaConfig {
    address public immutable owner;
    address public oracle; // PayrollAttestorMirror, set after deployment

    struct Score {
        euint32 value;
        bool exists;
        uint64 updatedAt;
    }

    mapping(address borrower => Score) private _scores;

    event OracleUpdated(address indexed oracle);
    event ScoreUpdated(address indexed borrower, uint64 updatedAt);
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

    /// @notice Update a borrower's encrypted credit score. Only callable
    /// by the oracle (PayrollAttestorMirror), which derives the score from
    /// HSK payroll cycle attestations.
    function updateScore(address borrower, externalEuint32 encryptedScore, bytes calldata inputProof) external onlyOracle {
        euint32 score = FHE.fromExternal(encryptedScore, inputProof);
        _scores[borrower] = Score({value: score, exists: true, updatedAt: uint64(block.timestamp)});

        FHE.allowThis(score);
        FHE.allow(score, borrower); // borrower can decrypt their own score

        emit ScoreUpdated(borrower, uint64(block.timestamp));
    }

    /// @notice Authorize a contract (e.g. ConfidentialAdvance) to use the
    /// encrypted score as input for FHE comparisons. The borrower controls
    /// who can underwrite against their score.
    function authorizeViewer(address viewer) external {
        if (!_scores[msg.sender].exists) revert UnknownBorrower();
        FHE.allow(_scores[msg.sender].value, viewer);
        emit ViewerAuthorized(msg.sender, viewer);
    }

    function scoreOf(address borrower) external view returns (euint32) {
        if (!_scores[borrower].exists) revert UnknownBorrower();
        return _scores[borrower].value;
    }

    function lastUpdated(address borrower) external view returns (uint64) {
        return _scores[borrower].updatedAt;
    }
}
