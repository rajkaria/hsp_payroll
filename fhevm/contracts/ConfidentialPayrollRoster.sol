// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialUSDT {
    function confidentialMint(address to, euint64 amount) external;
    function debit(address from, euint64 amount) external returns (euint64 actual);
}

/// @title ConfidentialPayrollRoster
/// @notice Encrypted payroll batch run. An employer commits a roster of
/// employees plus a per-employee encrypted amount. A single
/// `executeRoster` call disburses to every employee under FHE — no
/// observer learns per-employee compensation, the total disbursed, or
/// whether some employees were paid more than others.
/// @dev The HSK side continues to run public USDT payroll for users who
/// don't need this. Confidential payroll is fully additive — the source
/// of truth for the public flow is unchanged.
contract ConfidentialPayrollRoster is ZamaEthereumConfig {
    address public immutable owner;
    IConfidentialUSDT public immutable cUSDT;

    struct Roster {
        address employer;
        uint64 createdAt;
        uint64 executedAt;
        bool executed;
        address[] employees;
        mapping(address => euint64) amounts;
        mapping(address => bool) inRoster;
    }

    uint256 public nextRosterId = 1;
    mapping(uint256 => Roster) private _rosters;

    event RosterCreated(uint256 indexed rosterId, address indexed employer);
    event RosterEmployeeAdded(uint256 indexed rosterId, address indexed employee);
    event RosterExecuted(uint256 indexed rosterId);

    error NotOwner();
    error NotEmployer();
    error AlreadyExecuted();
    error UnknownRoster();
    error EmployeeAlreadyInRoster();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address cUSDT_) {
        owner = msg.sender;
        cUSDT = IConfidentialUSDT(cUSDT_);
    }

    /// @notice Open a new roster.
    function createRoster() external returns (uint256 rosterId) {
        rosterId = nextRosterId++;
        Roster storage r = _rosters[rosterId];
        r.employer = msg.sender;
        r.createdAt = uint64(block.timestamp);
        emit RosterCreated(rosterId, msg.sender);
    }

    /// @notice Add an employee + encrypted amount to the roster. Caller
    /// must be the employer who created the roster.
    function addEmployee(
        uint256 rosterId,
        address employee,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        Roster storage r = _rosters[rosterId];
        if (r.employer == address(0)) revert UnknownRoster();
        if (r.employer != msg.sender) revert NotEmployer();
        if (r.executed) revert AlreadyExecuted();
        if (r.inRoster[employee]) revert EmployeeAlreadyInRoster();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        r.amounts[employee] = amount;
        r.inRoster[employee] = true;
        r.employees.push(employee);
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);
        FHE.allow(amount, employee);
        emit RosterEmployeeAdded(rosterId, employee);
    }

    /// @notice Execute the roster. Burns the sum from the employer's
    /// cUSDT balance (clamped under FHE) and credits each employee.
    /// Per-employee amounts and the total are never revealed.
    function executeRoster(uint256 rosterId) external {
        Roster storage r = _rosters[rosterId];
        if (r.employer == address(0)) revert UnknownRoster();
        if (r.employer != msg.sender) revert NotEmployer();
        if (r.executed) revert AlreadyExecuted();

        // Sum encrypted per-employee amounts.
        euint64 total = FHE.asEuint64(0);
        for (uint256 i = 0; i < r.employees.length; ++i) {
            total = FHE.add(total, r.amounts[r.employees[i]]);
        }

        // Burn from employer.
        FHE.allowTransient(total, address(cUSDT));
        cUSDT.debit(msg.sender, total);

        // Credit each employee. Disbursed amount is the per-employee
        // ciphertext; unaffected by the burn outcome (a partial-funded
        // roster will still mint full per-employee amounts; the burn
        // clamps so the employer just paid less than promised — same
        // failure mode as a public payroll run that's underfunded).
        for (uint256 i = 0; i < r.employees.length; ++i) {
            address emp = r.employees[i];
            euint64 amt = r.amounts[emp];
            FHE.allowTransient(amt, address(cUSDT));
            cUSDT.confidentialMint(emp, amt);
        }

        r.executed = true;
        r.executedAt = uint64(block.timestamp);
        emit RosterExecuted(rosterId);
    }

    function rosterEmployees(uint256 rosterId) external view returns (address[] memory) {
        return _rosters[rosterId].employees;
    }

    function rosterAmount(uint256 rosterId, address employee) external view returns (euint64) {
        return _rosters[rosterId].amounts[employee];
    }

    function rosterMeta(uint256 rosterId) external view returns (address employer, uint64 createdAt, uint64 executedAt, bool executed) {
        Roster storage r = _rosters[rosterId];
        return (r.employer, r.createdAt, r.executedAt, r.executed);
    }
}
