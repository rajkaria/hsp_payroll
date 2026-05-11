// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialReputationRegistry {
    function updateScore(address borrower, externalEuint32 encryptedScore, bytes calldata inputProof) external;
    function updateStreak(address borrower, externalEuint32 encryptedDelta, bytes calldata inputProof, bool reset) external;
}

/// @title PayrollAttestorMirror
/// @notice Cross-chain mirror that ingests payroll cycle attestations from
/// HashPay's HSK PayrollAttestor and forwards encrypted credit-score and
/// streak updates to the ConfidentialReputationRegistry.
/// @dev Adds:
///   - Replay protection via a monotonically-non-decreasing high-block
///     watermark per (employee). Cycles older than the watermark are
///     rejected.
///   - `scoringHash`: a content hash of the published scoring spec
///     (`docs/SCORING_SPEC.md`). The relayer commits to a specific
///     formula at deploy time; downstream borrowers can verify the spec
///     hasn't been silently swapped.
contract PayrollAttestorMirror is ZamaEthereumConfig {
    address public immutable owner;
    address public relayer;
    address public reputationRegistry;

    /// @notice keccak256 of the published off-chain scoring specification.
    /// Set at deploy and rotated only by an explicit owner call.
    bytes32 public scoringHash;

    struct CycleAttestation {
        bytes32 hskTxHash;
        address employer;
        address employee;
        uint256 cycleId;
        uint256 hskBlock;
        bool executed;
        uint64 mirroredAt;
    }

    mapping(bytes32 => CycleAttestation) public attestations; // hskTxHash => attestation
    mapping(address => uint256) public successfulCycles;
    mapping(address => uint256) public totalCycles;

    /// @notice Per-employee high-water-mark of the latest HSK block
    /// successfully mirrored. Cycles strictly below this watermark are
    /// rejected to prevent replay/reorg amplification of the streak.
    mapping(address => uint256) public lastBlockOf;

    event RelayerUpdated(address indexed relayer);
    event ReputationRegistryUpdated(address indexed registry);
    event ScoringHashUpdated(bytes32 indexed scoringHash);
    event CycleMirrored(bytes32 indexed hskTxHash, address indexed employee, bool executed);
    event ScoreForwarded(address indexed borrower);
    event StreakForwarded(address indexed borrower, bool reset);

    error NotOwner();
    error NotRelayer();
    error AlreadyMirrored();
    error StaleCycle();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    constructor(bytes32 scoringHash_) {
        owner = msg.sender;
        scoringHash = scoringHash_;
        emit ScoringHashUpdated(scoringHash_);
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
        emit RelayerUpdated(newRelayer);
    }

    function setReputationRegistry(address registry) external onlyOwner {
        reputationRegistry = registry;
        emit ReputationRegistryUpdated(registry);
    }

    function setScoringHash(bytes32 newHash) external onlyOwner {
        scoringHash = newHash;
        emit ScoringHashUpdated(newHash);
    }

    /// @notice Mirror a single payroll cycle from HSK with replay
    /// protection. `hskBlock` must be strictly greater than the last
    /// mirrored block for the same employee.
    function mirrorCycle(
        bytes32 hskTxHash,
        address employer,
        address employee,
        uint256 cycleId,
        uint256 hskBlock,
        bool executed
    ) external onlyRelayer {
        if (attestations[hskTxHash].mirroredAt != 0) revert AlreadyMirrored();
        if (hskBlock <= lastBlockOf[employee]) revert StaleCycle();
        attestations[hskTxHash] = CycleAttestation({
            hskTxHash: hskTxHash,
            employer: employer,
            employee: employee,
            cycleId: cycleId,
            hskBlock: hskBlock,
            executed: executed,
            mirroredAt: uint64(block.timestamp)
        });
        lastBlockOf[employee] = hskBlock;
        if (executed) successfulCycles[employee]++;
        totalCycles[employee]++;
        emit CycleMirrored(hskTxHash, employee, executed);
    }

    /// @notice Forward an updated, encrypted credit score for a borrower.
    function forwardScore(
        address borrower,
        externalEuint32 encryptedScore,
        bytes calldata inputProof
    ) external onlyRelayer {
        IConfidentialReputationRegistry(reputationRegistry).updateScore(borrower, encryptedScore, inputProof);
        emit ScoreForwarded(borrower);
    }

    /// @notice Forward an updated encrypted streak delta. `reset` true
    /// zeros the streak (after a missed cycle). `reset` false adds the
    /// encrypted delta (typically `1` after an on-time cycle).
    function forwardStreak(
        address borrower,
        externalEuint32 encryptedDelta,
        bytes calldata inputProof,
        bool reset
    ) external onlyRelayer {
        IConfidentialReputationRegistry(reputationRegistry).updateStreak(borrower, encryptedDelta, inputProof, reset);
        emit StreakForwarded(borrower, reset);
    }
}
