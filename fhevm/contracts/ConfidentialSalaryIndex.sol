// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialSalaryIndex
/// @notice Encrypted mirror of HashPay's SalaryIndex. Salary amounts are
/// stored as euint64 ciphertexts. Only the employer can write a salary;
/// only the employer, the employee, and explicitly authorized contracts
/// (e.g. ConfidentialAdvance) can decrypt it.
/// @dev Supports multiple employers per employee — `aggregatedSalaryOf`
/// returns the encrypted sum across every employer that has set a salary
/// for the employee, so contractors and gig workers can underwrite against
/// their full income without revealing the breakdown.
contract ConfidentialSalaryIndex is ZamaEthereumConfig {
    address public immutable owner;

    /// @dev One record per (employee, employer). The aggregate is computed
    /// on demand from the per-employer entries.
    struct Record {
        bool exists;
        euint64 fiatSalary; // encrypted, in stable-currency cents
    }

    mapping(address employee => mapping(address employer => Record)) private _records;
    mapping(address employee => mapping(address employer => bool)) public isEmployerOf;
    mapping(address employee => address[]) private _employersOf;

    /// @dev Cached encrypted aggregate for an employee. Refreshed whenever
    /// any of the underlying per-employer salaries is written.
    mapping(address employee => euint64) private _aggregate;
    mapping(address employee => bool) private _aggregateExists;

    event EmployerRegistered(address indexed employee, address indexed employer);
    event SalaryUpdated(address indexed employee, address indexed employer);
    event ViewerAuthorized(address indexed employee, address indexed viewer);

    error NotOwner();
    error NotEmployer();
    error UnknownEmployee();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Register an employer/employee relationship. Mirrors the
    /// employer link tracked on HSK by PayrollFactory. Multiple employers
    /// per employee are supported.
    function registerEmployer(address employee, address employer) external onlyOwner {
        if (!isEmployerOf[employee][employer]) {
            isEmployerOf[employee][employer] = true;
            _employersOf[employee].push(employer);
        }
        if (!_records[employee][employer].exists) {
            _records[employee][employer] = Record({exists: true, fiatSalary: euint64.wrap(0)});
        }
        emit EmployerRegistered(employee, employer);
    }

    /// @notice Set the encrypted fiat salary for an employee. The caller
    /// must be a registered employer for that employee.
    function setSalary(address employee, externalEuint64 encryptedSalary, bytes calldata inputProof) external {
        if (!isEmployerOf[employee][msg.sender]) revert NotEmployer();

        euint64 salary = FHE.fromExternal(encryptedSalary, inputProof);
        _records[employee][msg.sender].fiatSalary = salary;

        FHE.allowThis(salary);
        FHE.allow(salary, msg.sender); // employer can decrypt
        FHE.allow(salary, employee);   // employee can decrypt

        _refreshAggregate(employee);

        emit SalaryUpdated(employee, msg.sender);
    }

    /// @notice Grant a contract or address permission to use the encrypted
    /// salary value as an input. Used to authorize ConfidentialAdvance and
    /// IncomeProver. The aggregate is re-authorized too.
    function authorizeViewer(address employee, address viewer) external {
        if (!isEmployerOf[employee][msg.sender]) revert NotEmployer();
        Record storage rec = _records[employee][msg.sender];
        if (!rec.exists) revert UnknownEmployee();
        FHE.allow(rec.fiatSalary, viewer);
        if (_aggregateExists[employee]) {
            FHE.allow(_aggregate[employee], viewer);
        }
        emit ViewerAuthorized(employee, viewer);
    }

    /// @notice Returns the encrypted salary handle for a single
    /// (employee, employer) pair. The caller must already hold ACL
    /// permission to use this handle.
    function salaryOfFrom(address employee, address employer) external view returns (euint64) {
        Record storage rec = _records[employee][employer];
        if (!rec.exists) revert UnknownEmployee();
        return rec.fiatSalary;
    }

    /// @notice Backwards-compatible single-employer accessor used by the
    /// confidential advance product. Returns the aggregated encrypted
    /// salary across all of the employee's employers.
    function salaryOf(address employee) external view returns (euint64) {
        if (!_aggregateExists[employee]) revert UnknownEmployee();
        return _aggregate[employee];
    }

    /// @notice The list of employers that have ever registered for the
    /// employee. Plaintext on purpose — corresponds to public HSK records.
    function employersOf(address employee) external view returns (address[] memory) {
        return _employersOf[employee];
    }

    function _refreshAggregate(address employee) internal {
        address[] storage emps = _employersOf[employee];
        euint64 sum = FHE.asEuint64(0);
        for (uint256 i = 0; i < emps.length; ++i) {
            Record storage rec = _records[employee][emps[i]];
            if (rec.exists) {
                sum = FHE.add(sum, rec.fiatSalary);
            }
        }
        _aggregate[employee] = sum;
        _aggregateExists[employee] = true;
        FHE.allowThis(sum);
        FHE.allow(sum, employee);
        for (uint256 i = 0; i < emps.length; ++i) {
            FHE.allow(sum, emps[i]);
        }
    }
}
