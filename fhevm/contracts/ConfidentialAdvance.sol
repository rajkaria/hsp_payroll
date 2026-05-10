// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialSalaryIndex {
    function salaryOf(address employee) external view returns (euint64);
}

interface IConfidentialReputationRegistry {
    function scoreOf(address borrower) external view returns (euint32);
}

interface IConfidentialUSDT {
    function confidentialMint(address to, euint64 amount) external;
    function confidentialBalanceOf(address account) external view returns (euint64);
}

/// @title ConfidentialAdvance
/// @notice Privacy-preserving payroll advances. The borrower's salary,
/// credit score, and the requested advance amount are all encrypted. The
/// contract underwrites the advance using FHE comparisons — neither the
/// protocol operator, the lender, nor any observer learns any of the
/// values. Only the borrower can decrypt the resulting cUSDT balance to
/// see whether (and how much) was approved.
/// @dev Underwriting rule (all encrypted):
///         approved = (score >= minScore) AND (salary >= amount * salaryMultiplier)
///         disbursed = approved ? amount : 0
///      The disbursed value is minted as cUSDT to the borrower. Whether
///      approved or denied, an identical "ConfidentialDecisionEmitted"
///      event is emitted — denial is indistinguishable from approval to
///      an outside observer.
contract ConfidentialAdvance is ZamaEthereumConfig {
    address public immutable owner;

    IConfidentialSalaryIndex public immutable salaryIndex;
    IConfidentialReputationRegistry public immutable reputationRegistry;
    IConfidentialUSDT public immutable cUSDT;

    /// @notice Minimum encrypted credit score required, plaintext public
    /// parameter. Stored encrypted at runtime via FHE.asEuint32 for
    /// comparison against the encrypted score.
    uint32 public minScore;

    /// @notice Encrypted advance amount must satisfy
    ///   salary >= amount * salaryMultiplier
    /// where salaryMultiplier expresses how many months of salary the
    /// requested amount may represent. Default 3 — i.e. the encrypted
    /// salary must cover three months of the encrypted requested advance.
    uint64 public salaryMultiplier;

    struct Decision {
        ebool approved;
        euint64 disbursed;
        uint64 timestamp;
    }

    mapping(address borrower => Decision) public lastDecision;
    mapping(address borrower => uint256) public requestCount;

    event ParametersUpdated(uint32 minScore, uint64 salaryMultiplier);
    event ConfidentialDecisionEmitted(address indexed borrower, uint256 indexed requestId);

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address salaryIndex_,
        address reputationRegistry_,
        address cUSDT_,
        uint32 minScore_,
        uint64 salaryMultiplier_
    ) {
        owner = msg.sender;
        salaryIndex = IConfidentialSalaryIndex(salaryIndex_);
        reputationRegistry = IConfidentialReputationRegistry(reputationRegistry_);
        cUSDT = IConfidentialUSDT(cUSDT_);
        minScore = minScore_;
        salaryMultiplier = salaryMultiplier_;
        emit ParametersUpdated(minScore_, salaryMultiplier_);
    }

    function setParameters(uint32 minScore_, uint64 salaryMultiplier_) external onlyOwner {
        minScore = minScore_;
        salaryMultiplier = salaryMultiplier_;
        emit ParametersUpdated(minScore_, salaryMultiplier_);
    }

    /// @notice Request a confidential payroll advance.
    /// @param encryptedAmount External handle to the encrypted requested amount.
    /// @param inputProof Zero-knowledge proof of input from the relayer.
    function requestAdvance(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Encrypted underwriting inputs.
        euint32 score = reputationRegistry.scoreOf(msg.sender);
        euint64 salary = salaryIndex.salaryOf(msg.sender);

        // Compare against plaintext thresholds — these become encrypted
        // ciphertexts inside FHE.
        ebool scoreOk = FHE.ge(score, FHE.asEuint32(minScore));

        euint64 maxBorrowable = FHE.div(salary, salaryMultiplier);
        ebool salaryOk = FHE.le(amount, maxBorrowable);

        ebool approved = FHE.and(scoreOk, salaryOk);
        euint64 disbursed = FHE.select(approved, amount, FHE.asEuint64(0));

        // ACL: this contract uses the values; borrower can decrypt their
        // own decision and disbursed amount.
        FHE.allowThis(approved);
        FHE.allowThis(disbursed);
        FHE.allow(approved, msg.sender);
        FHE.allow(disbursed, msg.sender);

        // Grant the cUSDT contract transient permission to operate on the
        // disbursed handle for the duration of this transaction. Without
        // this, the FHE.add inside cUSDT._credit reverts with ACLNotAllowed.
        FHE.allowTransient(disbursed, address(cUSDT));

        // Disburse cUSDT (encrypted; 0 if denied).
        cUSDT.confidentialMint(msg.sender, disbursed);

        uint256 id = ++requestCount[msg.sender];
        lastDecision[msg.sender] = Decision({approved: approved, disbursed: disbursed, timestamp: uint64(block.timestamp)});

        // Identical event regardless of outcome — denial is
        // indistinguishable from approval on-chain.
        emit ConfidentialDecisionEmitted(msg.sender, id);
    }

    /// @notice Returns the borrower's last decision handles. The caller
    /// must hold ACL permission to decrypt these.
    function decisionOf(address borrower) external view returns (ebool, euint64, uint64) {
        Decision memory d = lastDecision[borrower];
        return (d.approved, d.disbursed, d.timestamp);
    }
}
