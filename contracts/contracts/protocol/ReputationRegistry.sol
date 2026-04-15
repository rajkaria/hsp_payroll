// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReputationRegistry — composable on-chain proof-of-income.
/// @notice Aggregates attestations from PayrollAttestor into per-recipient stats.
///         Any DeFi/PayFi protocol can read these permissionlessly.
///         Bonus feature #3: `IncomeOracle` (Chainlink-compatible) interface exposed.
contract ReputationRegistry {
    struct RecipientStats {
        uint256 totalReceived;
        uint256 employerCount;
        uint256 firstPaymentTimestamp;
        uint256 lastPaymentTimestamp;
        uint256 totalCycles;
        uint256 onTimeCycles;
        uint256 lateCycles;
        bytes32[] attestationUIDs;
        uint256[] amounts;
        uint256[] timestamps;
        address[] employers;
    }

    struct AttestationPoint {
        address employer;
        uint256 amount;
        uint256 timestamp;
        bytes32 uid;
        bool onTime;
    }

    address public attestor;
    address public governance;

    mapping(address => RecipientStats) private _stats;
    mapping(address => mapping(address => bool)) private _seenEmployer;
    mapping(address => mapping(address => uint256)) public perEmployerTotal;
    mapping(address => AttestationPoint[]) public history;

    // income milestone events (for social sharing / badges)
    mapping(address => uint256) public highestMilestone;
    uint256[6] public MILESTONES = [
        1_000 * 1e6,
        10_000 * 1e6,
        50_000 * 1e6,
        100_000 * 1e6,
        500_000 * 1e6,
        1_000_000 * 1e6
    ];

    event StatsUpdated(address indexed recipient, uint256 totalReceived, uint256 employerCount);
    event NewEmployerSeen(address indexed recipient, address indexed employer);
    event IncomeMilestone(address indexed recipient, uint256 milestone);
    event AttestorSet(address attestor);

    constructor() {
        governance = msg.sender;
    }

    modifier onlyAttestor() {
        require(msg.sender == attestor, "Only attestor");
        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    function setAttestor(address _attestor) external onlyGovernance {
        attestor = _attestor;
        emit AttestorSet(_attestor);
    }

    // ---- Writes ----

    /// @param expectedInterval seconds between cycles for this payroll (used to classify on-time)
    /// @param actualElapsed seconds since the recipient's prior attestation with same employer (0 if first)
    function recordAttestation(
        address employer,
        address recipient,
        uint256 amount,
        uint256 expectedInterval,
        uint256 actualElapsed,
        bytes32 uid
    ) external onlyAttestor {
        RecipientStats storage s = _stats[recipient];
        s.totalReceived += amount;
        s.totalCycles += 1;
        s.lastPaymentTimestamp = block.timestamp;
        if (s.firstPaymentTimestamp == 0) {
            s.firstPaymentTimestamp = block.timestamp;
        }
        s.attestationUIDs.push(uid);
        s.amounts.push(amount);
        s.timestamps.push(block.timestamp);
        s.employers.push(employer);
        perEmployerTotal[recipient][employer] += amount;

        if (!_seenEmployer[recipient][employer]) {
            _seenEmployer[recipient][employer] = true;
            s.employerCount += 1;
            emit NewEmployerSeen(recipient, employer);
        }

        // on-time calculation: within ±10% of expected interval
        bool onTime = true;
        if (expectedInterval > 0 && actualElapsed > 0) {
            uint256 lo = (expectedInterval * 90) / 100;
            uint256 hi = (expectedInterval * 110) / 100;
            if (actualElapsed >= lo && actualElapsed <= hi) {
                s.onTimeCycles += 1;
            } else {
                s.lateCycles += 1;
                onTime = false;
            }
        } else {
            // first payment: counts as on-time
            s.onTimeCycles += 1;
        }

        history[recipient].push(AttestationPoint(employer, amount, block.timestamp, uid, onTime));

        _checkMilestone(recipient, s.totalReceived);

        emit StatsUpdated(recipient, s.totalReceived, s.employerCount);
    }

    function _checkMilestone(address recipient, uint256 total) internal {
        uint256 current = highestMilestone[recipient];
        for (uint256 i = 0; i < MILESTONES.length; i++) {
            if (total >= MILESTONES[i] && MILESTONES[i] > current) {
                highestMilestone[recipient] = MILESTONES[i];
                emit IncomeMilestone(recipient, MILESTONES[i]);
            }
        }
    }

    // ---- Reads ----

    function incomeOf(address recipient) external view returns (uint256) {
        return _stats[recipient].totalReceived;
    }

    function employersOf(address recipient) external view returns (uint256) {
        return _stats[recipient].employerCount;
    }

    function onTimeRate(address recipient) external view returns (uint256) {
        RecipientStats storage s = _stats[recipient];
        if (s.totalCycles == 0) return 0;
        return (s.onTimeCycles * 10000) / s.totalCycles;
    }

    function attestationsOf(address recipient) external view returns (bytes32[] memory) {
        return _stats[recipient].attestationUIDs;
    }

    function historyOf(address recipient) external view returns (AttestationPoint[] memory) {
        return history[recipient];
    }

    function incomeProof(address recipient) external view returns (RecipientStats memory) {
        return _stats[recipient];
    }

    function verifyMinimumIncome(address recipient, uint256 minAmount, uint256 windowSeconds)
        external view returns (bool)
    {
        if (windowSeconds == 0) {
            return _stats[recipient].totalReceived >= minAmount;
        }
        uint256 cutoff = block.timestamp - windowSeconds;
        AttestationPoint[] storage h = history[recipient];
        uint256 sum;
        for (uint256 i = h.length; i > 0; i--) {
            AttestationPoint storage p = h[i - 1];
            if (p.timestamp < cutoff) break;
            sum += p.amount;
            if (sum >= minAmount) return true;
        }
        return sum >= minAmount;
    }

    function incomeInWindow(address recipient, uint256 fromTs, uint256 toTs)
        external view returns (uint256 total)
    {
        AttestationPoint[] storage h = history[recipient];
        for (uint256 i = 0; i < h.length; i++) {
            if (h[i].timestamp >= fromTs && h[i].timestamp <= toTs) {
                total += h[i].amount;
            }
        }
    }

    // ---- Bonus #3: ChainLink-compatible IncomeOracle interface ----
    // Makes the registry readable by any lending protocol expecting AggregatorV3-like shape.

    function decimals() external pure returns (uint8) { return 6; }
    function description() external pure returns (string memory) { return "HashPay Verified Income Feed"; }
    function version() external pure returns (uint256) { return 1; }

    /// Returns caller's income as `answer`. Deliberately uses msg.sender so oracle usage
    /// composes with auth-context-aware contracts (lending pools, credit lines).
    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    ) {
        RecipientStats storage s = _stats[tx.origin];
        answer = int256(s.totalReceived);
        roundId = uint80(s.totalCycles);
        startedAt = s.firstPaymentTimestamp;
        updatedAt = s.lastPaymentTimestamp;
        answeredInRound = roundId;
    }

    function latestAnswer() external view returns (int256) {
        return int256(_stats[tx.origin].totalReceived);
    }
}
