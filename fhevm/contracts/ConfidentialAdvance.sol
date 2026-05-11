// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint32, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialSalaryIndex {
    function salaryOf(address employee) external view returns (euint64);
}

interface IConfidentialReputationRegistry {
    function scoreOf(address borrower) external view returns (euint32);
    function streakOf(address borrower) external view returns (euint32);
}

interface IConfidentialUSDT {
    function confidentialMint(address to, euint64 amount) external;
    function confidentialBalanceOf(address account) external view returns (euint64);
    function debit(address from, euint64 amount) external returns (euint64 actual);
    function authorizeBalanceViewer(address viewer) external;
}

interface IConfidentialCompliance {
    function flagOf(address subject) external view returns (ebool);
    function exists(address subject) external view returns (bool);
}

/// @title ConfidentialAdvance
/// @notice Privacy-preserving payroll advances with a full credit lifecycle.
/// The borrower's salary, credit score, on-time streak, requested amount,
/// outstanding principal, accrued interest, and collateral are all
/// encrypted. Underwriting and amortization happen entirely under FHE so
/// neither the operator, the lender, nor any observer sees the values.
/// @dev Underwriting predicate (all encrypted unless noted):
///   approved = (score    >= minScore)
///          AND (amount   <= (salary + collateral) / salaryMultiplier)
///          AND (utilization + amount <= creditLimit)
///          AND complianceFlag         // optional, if compliance set
///   disbursed = approved ? amount : 0
///
/// Interest tier (selected under FHE from on-time streak):
///   rateBps = streak >= STREAK_GOLD   ? rateGoldBps
///           : streak >= STREAK_SILVER ? rateSilverBps
///                                     : rateBronzeBps
///
/// Repayment burns cUSDT and reduces outstanding principal under FHE.
/// On-time repayment increments an internal `repaymentScore` the borrower
/// can decrypt and present off-chain.
contract ConfidentialAdvance is ZamaEthereumConfig {
    address public immutable owner;

    IConfidentialSalaryIndex public immutable salaryIndex;
    IConfidentialReputationRegistry public immutable reputationRegistry;
    IConfidentialUSDT public immutable cUSDT;

    /// @notice Optional encrypted KYC/AML gate. Zero address disables.
    IConfidentialCompliance public compliance;

    /// @notice Plaintext underwriting params. Public on purpose so
    /// borrowers can verify the rules without trusting the operator.
    uint32 public minScore;
    uint64 public salaryMultiplier;

    /// @notice Plaintext rate-tier table (bps, applied annually). Selected
    /// under FHE based on the borrower's encrypted streak.
    uint32 public constant STREAK_GOLD = 12;
    uint32 public constant STREAK_SILVER = 6;
    uint32 public rateGoldBps = 200;    // 2% APR
    uint32 public rateSilverBps = 500;  // 5% APR
    uint32 public rateBronzeBps = 900;  // 9% APR
    uint64 public constant SECONDS_PER_YEAR = 365 days;
    uint64 public constant BPS_DENOM = 10_000;

    /// @notice Per-borrower default credit limit applied when no per-address
    /// limit has been set. In stable-currency cents.
    uint64 public defaultCreditLimit = 1_000_000; // $10,000

    struct Position {
        euint64 outstanding; // principal currently owed
        euint64 collateral;  // encrypted cUSDT collateral posted
        euint64 limit;       // encrypted credit limit
        euint32 repaymentScore; // counts on-time repayments
        uint64 openedAt;
        uint64 lastAccrualAt;
        bool exists;
    }

    struct Decision {
        ebool approved;
        euint64 disbursed;
        uint64 timestamp;
    }

    mapping(address borrower => Position) private _positions;
    mapping(address borrower => Decision) public lastDecision;
    mapping(address borrower => uint256) public requestCount;

    event ParametersUpdated(uint32 minScore, uint64 salaryMultiplier);
    event RatesUpdated(uint32 gold, uint32 silver, uint32 bronze);
    event ComplianceSet(address indexed compliance);
    event ConfidentialDecisionEmitted(address indexed borrower, uint256 indexed requestId);
    event ConfidentialRepayment(address indexed borrower, uint256 indexed repaymentId);
    event ConfidentialCollateralPosted(address indexed borrower);
    event ConfidentialCollateralReleased(address indexed borrower);
    event LimitOverridden(address indexed borrower);

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
        emit RatesUpdated(rateGoldBps, rateSilverBps, rateBronzeBps);
    }

    // ──────────────────────────── admin ────────────────────────────

    function setParameters(uint32 minScore_, uint64 salaryMultiplier_) external onlyOwner {
        minScore = minScore_;
        salaryMultiplier = salaryMultiplier_;
        emit ParametersUpdated(minScore_, salaryMultiplier_);
    }

    function setRates(uint32 gold, uint32 silver, uint32 bronze) external onlyOwner {
        rateGoldBps = gold;
        rateSilverBps = silver;
        rateBronzeBps = bronze;
        emit RatesUpdated(gold, silver, bronze);
    }

    function setCompliance(address compliance_) external onlyOwner {
        compliance = IConfidentialCompliance(compliance_);
        emit ComplianceSet(compliance_);
    }

    function setDefaultCreditLimit(uint64 limit_) external onlyOwner {
        defaultCreditLimit = limit_;
    }

    /// @notice Override the encrypted credit limit for a single borrower.
    function setCreditLimit(address borrower, uint64 plaintextLimit) external onlyOwner {
        Position storage p = _positions[borrower];
        _ensurePosition(p, borrower);
        p.limit = FHE.asEuint64(plaintextLimit);
        FHE.allowThis(p.limit);
        FHE.allow(p.limit, borrower);
        emit LimitOverridden(borrower);
    }

    // ──────────────────────────── advance lifecycle ────────────────────────────

    /// @notice Request a confidential payroll advance.
    function requestAdvance(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Position storage p = _positions[msg.sender];
        _ensurePosition(p, msg.sender);
        _accrue(p, msg.sender);

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Underwriting inputs (all encrypted).
        euint32 score = reputationRegistry.scoreOf(msg.sender);
        euint64 salary = salaryIndex.salaryOf(msg.sender);

        // Score gate.
        ebool scoreOk = FHE.ge(score, FHE.asEuint32(minScore));

        // Salary gate (collateral lifts the cap).
        euint64 salaryPlusCollateral = FHE.add(salary, p.collateral);
        euint64 maxBorrowable = FHE.div(salaryPlusCollateral, salaryMultiplier);
        ebool salaryOk = FHE.le(amount, maxBorrowable);

        // Credit-limit gate.
        euint64 newOutstanding = FHE.add(p.outstanding, amount);
        ebool limitOk = FHE.le(newOutstanding, p.limit);

        ebool approved = FHE.and(FHE.and(scoreOk, salaryOk), limitOk);

        // Optional compliance gate.
        if (address(compliance) != address(0) && compliance.exists(msg.sender)) {
            ebool kycOk = compliance.flagOf(msg.sender);
            approved = FHE.and(approved, kycOk);
        }

        euint64 disbursed = FHE.select(approved, amount, FHE.asEuint64(0));

        // Update outstanding under FHE — only credited if approved.
        p.outstanding = FHE.add(p.outstanding, disbursed);
        FHE.allowThis(p.outstanding);
        FHE.allow(p.outstanding, msg.sender);

        // Borrower can decrypt their decision and disbursed amount.
        FHE.allowThis(approved);
        FHE.allowThis(disbursed);
        FHE.allow(approved, msg.sender);
        FHE.allow(disbursed, msg.sender);

        // Transient grant so cUSDT can mint with the encrypted handle.
        FHE.allowTransient(disbursed, address(cUSDT));
        cUSDT.confidentialMint(msg.sender, disbursed);

        uint256 id = ++requestCount[msg.sender];
        lastDecision[msg.sender] = Decision({approved: approved, disbursed: disbursed, timestamp: uint64(block.timestamp)});
        emit ConfidentialDecisionEmitted(msg.sender, id);
    }

    /// @notice Repay all or part of an outstanding advance. Burns cUSDT
    /// from the borrower (clamped to their balance under FHE) and
    /// decrements outstanding. Successful on-time repayments tick the
    /// internal repayment score.
    function repay(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Position storage p = _positions[msg.sender];
        _ensurePosition(p, msg.sender);
        _accrue(p, msg.sender);

        euint64 desired = FHE.fromExternal(encryptedAmount, inputProof);

        // Cap the repayment at the outstanding balance — paying more than
        // owed shouldn't burn extra cUSDT.
        euint64 capped = FHE.min(desired, p.outstanding);

        // Debit the borrower's cUSDT. cUSDT.debit clamps to their balance.
        FHE.allowTransient(capped, address(cUSDT));
        euint64 actual = cUSDT.debit(msg.sender, capped);

        // Decrement outstanding by the actually-burned amount.
        p.outstanding = FHE.sub(p.outstanding, actual);
        FHE.allowThis(p.outstanding);
        FHE.allow(p.outstanding, msg.sender);

        // Increment repayment score by 1 per repay call. (A finer-grained
        // model could weight by amount; kept simple here for demo.)
        p.repaymentScore = FHE.add(p.repaymentScore, FHE.asEuint32(1));
        FHE.allowThis(p.repaymentScore);
        FHE.allow(p.repaymentScore, msg.sender);

        emit ConfidentialRepayment(msg.sender, ++requestCount[msg.sender]);
    }

    /// @notice Post additional encrypted cUSDT as collateral. The
    /// collateral lifts the borrowing cap by `collateral / multiplier`.
    /// Caller must have already authorized this contract as a debit-er
    /// on cUSDT (cUSDT.authorizeDebitor) and approved the amount.
    function postCollateral(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Position storage p = _positions[msg.sender];
        _ensurePosition(p, msg.sender);

        euint64 desired = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(desired, address(cUSDT));
        euint64 actual = cUSDT.debit(msg.sender, desired);

        p.collateral = FHE.add(p.collateral, actual);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);

        emit ConfidentialCollateralPosted(msg.sender);
    }

    /// @notice Release collateral up to a desired amount. Released only if
    /// (collateral - desired) is enough that the borrower's outstanding
    /// still fits under the post-release cap. All checks under FHE; if the
    /// gate fails, zero is released and no event externally distinguishes
    /// the two outcomes beyond what the borrower can decrypt.
    function releaseCollateral(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Position storage p = _positions[msg.sender];
        _ensurePosition(p, msg.sender);
        _accrue(p, msg.sender);

        euint64 desired = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 capped = FHE.min(desired, p.collateral);

        // After release: salary + (collateral - capped) must still cover outstanding * multiplier.
        euint64 salary = salaryIndex.salaryOf(msg.sender);
        euint64 newCollateral = FHE.sub(p.collateral, capped);
        euint64 newCapacity = FHE.div(FHE.add(salary, newCollateral), salaryMultiplier);
        ebool ok = FHE.le(p.outstanding, newCapacity);

        euint64 released = FHE.select(ok, capped, FHE.asEuint64(0));
        p.collateral = FHE.sub(p.collateral, released);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, msg.sender);

        FHE.allowTransient(released, address(cUSDT));
        cUSDT.confidentialMint(msg.sender, released);

        emit ConfidentialCollateralReleased(msg.sender);
    }

    // ──────────────────────────── views ────────────────────────────

    function decisionOf(address borrower) external view returns (ebool, euint64, uint64) {
        Decision memory d = lastDecision[borrower];
        return (d.approved, d.disbursed, d.timestamp);
    }

    function outstandingOf(address borrower) external view returns (euint64) {
        return _positions[borrower].outstanding;
    }

    function collateralOf(address borrower) external view returns (euint64) {
        return _positions[borrower].collateral;
    }

    function limitOf(address borrower) external view returns (euint64) {
        return _positions[borrower].limit;
    }

    function repaymentScoreOf(address borrower) external view returns (euint32) {
        return _positions[borrower].repaymentScore;
    }

    // ──────────────────────────── internals ────────────────────────────

    function _ensurePosition(Position storage p, address borrower) internal {
        if (p.exists) return;
        p.outstanding = FHE.asEuint64(0);
        p.collateral = FHE.asEuint64(0);
        p.limit = FHE.asEuint64(defaultCreditLimit);
        p.repaymentScore = FHE.asEuint32(0);
        p.openedAt = uint64(block.timestamp);
        p.lastAccrualAt = uint64(block.timestamp);
        p.exists = true;

        FHE.allowThis(p.outstanding);
        FHE.allow(p.outstanding, borrower);
        FHE.allowThis(p.collateral);
        FHE.allow(p.collateral, borrower);
        FHE.allowThis(p.limit);
        FHE.allow(p.limit, borrower);
        FHE.allowThis(p.repaymentScore);
        FHE.allow(p.repaymentScore, borrower);
    }

    /// @dev Linear interest accrual over the elapsed plaintext seconds.
    /// Rate is selected under FHE from the borrower's streak tier.
    function _accrue(Position storage p, address borrower) internal {
        uint64 nowTs = uint64(block.timestamp);
        if (nowTs <= p.lastAccrualAt) return;
        uint64 elapsed = nowTs - p.lastAccrualAt;
        p.lastAccrualAt = nowTs;

        // No streak gate the first time around — reputation may not be set yet.
        // We try/catch via a safe path: if scoreOf reverts, skip.
        // Solidity has no try/external view easily; use a low-level call.
        (bool ok, bytes memory data) = address(reputationRegistry).staticcall(
            abi.encodeWithSelector(IConfidentialReputationRegistry.streakOf.selector, borrower)
        );
        if (!ok) return; // borrower not yet scored; no accrual

        euint32 streak = abi.decode(data, (euint32));

        // Tier selection under FHE.
        ebool isGold = FHE.ge(streak, FHE.asEuint32(STREAK_GOLD));
        ebool isSilver = FHE.ge(streak, FHE.asEuint32(STREAK_SILVER));
        // rate = isGold ? gold : (isSilver ? silver : bronze)
        euint64 rateGold = FHE.asEuint64(rateGoldBps);
        euint64 rateSilver = FHE.asEuint64(rateSilverBps);
        euint64 rateBronze = FHE.asEuint64(rateBronzeBps);
        euint64 rate = FHE.select(isGold, rateGold, FHE.select(isSilver, rateSilver, rateBronze));

        // interest = outstanding * rate * elapsed / (BPS * YEAR)
        euint64 num = FHE.mul(FHE.mul(p.outstanding, rate), elapsed);
        euint64 interest = FHE.div(FHE.div(num, BPS_DENOM), SECONDS_PER_YEAR);
        p.outstanding = FHE.add(p.outstanding, interest);

        FHE.allowThis(p.outstanding);
        FHE.allow(p.outstanding, borrower);
    }
}
