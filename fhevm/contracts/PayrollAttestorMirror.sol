// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialReputationRegistry {
    function updateScore(address borrower, externalEuint32 encryptedScore, bytes calldata inputProof) external;
}

/// @title PayrollAttestorMirror
/// @notice Cross-chain mirror that ingests payroll cycle attestations from
/// HashPay's HSK PayrollAttestor and forwards encrypted credit-score
/// updates to the ConfidentialReputationRegistry. The relayer is run by
/// the protocol; the relayed payload is plaintext (cycle id, executed flag,
/// employee, employer) but the resulting score update is encrypted before
/// it touches FHEVM state.
/// @dev The plaintext side is a denormalised event log of public HSK
/// activity. The encrypted side is the credit score that lenders consume.
/// No HSK contract is modified — the relayer reads HSK events off-chain.
contract PayrollAttestorMirror is SepoliaConfig {
    address public immutable owner;
    address public relayer;
    address public reputationRegistry;

    struct CycleAttestation {
        bytes32 hskTxHash;
        address employer;
        address employee;
        uint256 cycleId;
        bool executed;
        uint64 mirroredAt;
    }

    mapping(bytes32 => CycleAttestation) public attestations; // hskTxHash => attestation
    mapping(address => uint256) public successfulCycles;
    mapping(address => uint256) public totalCycles;

    event RelayerUpdated(address indexed relayer);
    event ReputationRegistryUpdated(address indexed registry);
    event CycleMirrored(bytes32 indexed hskTxHash, address indexed employee, bool executed);
    event ScoreForwarded(address indexed borrower);

    error NotOwner();
    error NotRelayer();
    error AlreadyMirrored();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
        emit RelayerUpdated(newRelayer);
    }

    function setReputationRegistry(address registry) external onlyOwner {
        reputationRegistry = registry;
        emit ReputationRegistryUpdated(registry);
    }

    /// @notice Mirror a single payroll cycle from HSK.
    function mirrorCycle(
        bytes32 hskTxHash,
        address employer,
        address employee,
        uint256 cycleId,
        bool executed
    ) external onlyRelayer {
        if (attestations[hskTxHash].mirroredAt != 0) revert AlreadyMirrored();
        attestations[hskTxHash] = CycleAttestation({
            hskTxHash: hskTxHash,
            employer: employer,
            employee: employee,
            cycleId: cycleId,
            executed: executed,
            mirroredAt: uint64(block.timestamp)
        });
        if (executed) successfulCycles[employee]++;
        totalCycles[employee]++;
        emit CycleMirrored(hskTxHash, employee, executed);
    }

    /// @notice Forward an updated, encrypted credit score for a borrower.
    /// The score is derived off-chain (encrypted client-side) from the
    /// mirrored HSK cycle counts plus any other inputs the protocol
    /// chooses to factor in (tenure, on-time ratio, etc.).
    function forwardScore(
        address borrower,
        externalEuint32 encryptedScore,
        bytes calldata inputProof
    ) external onlyRelayer {
        IConfidentialReputationRegistry(reputationRegistry).updateScore(borrower, encryptedScore, inputProof);
        emit ScoreForwarded(borrower);
    }
}
