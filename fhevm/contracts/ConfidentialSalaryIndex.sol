// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialSalaryIndex
/// @notice Encrypted mirror of HashPay's SalaryIndex. Salary amounts are
/// stored as euint64 ciphertexts. Only the employer can write a salary;
/// only the employer, the employee, and explicitly authorized contracts
/// (e.g. ConfidentialAdvance) can decrypt it.
/// @dev The HashKey Chain SalaryIndex remains the source of truth for
/// payroll execution. This contract is an additive confidentiality layer
/// that lives on Sepolia FHEVM and never sees plaintext salaries.
contract ConfidentialSalaryIndex is SepoliaConfig {
    address public immutable owner;

    struct Record {
        address employer;
        bool exists;
        euint64 fiatSalary; // encrypted, in stable-currency cents
    }

    mapping(address employee => Record) private _records;
    mapping(address employee => mapping(address employer => bool)) public isEmployerOf;

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
    /// employer link tracked on HSK by PayrollFactory.
    function registerEmployer(address employee, address employer) external onlyOwner {
        isEmployerOf[employee][employer] = true;
        if (!_records[employee].exists) {
            _records[employee] = Record({employer: employer, exists: true, fiatSalary: euint64.wrap(0)});
        }
        emit EmployerRegistered(employee, employer);
    }

    /// @notice Set the encrypted fiat salary for an employee. The caller
    /// must be a registered employer for that employee.
    /// @param employee Address of the employee whose salary is being updated.
    /// @param encryptedSalary External handle to the encrypted salary value.
    /// @param inputProof Zero-knowledge proof of input from the relayer.
    function setSalary(address employee, externalEuint64 encryptedSalary, bytes calldata inputProof) external {
        if (!isEmployerOf[employee][msg.sender]) revert NotEmployer();

        euint64 salary = FHE.fromExternal(encryptedSalary, inputProof);
        _records[employee].fiatSalary = salary;

        FHE.allowThis(salary);
        FHE.allow(salary, msg.sender); // employer can decrypt
        FHE.allow(salary, employee);   // employee can decrypt

        emit SalaryUpdated(employee, msg.sender);
    }

    /// @notice Grant a contract or address permission to use the encrypted
    /// salary value as an input. Used to authorize ConfidentialAdvance.
    function authorizeViewer(address employee, address viewer) external {
        if (!isEmployerOf[employee][msg.sender]) revert NotEmployer();
        if (!_records[employee].exists) revert UnknownEmployee();
        FHE.allow(_records[employee].fiatSalary, viewer);
        emit ViewerAuthorized(employee, viewer);
    }

    /// @notice Returns the encrypted salary handle for an employee.
    /// The caller must already hold ACL permission to use this handle.
    function salaryOf(address employee) external view returns (euint64) {
        if (!_records[employee].exists) revert UnknownEmployee();
        return _records[employee].fiatSalary;
    }

    function employerOf(address employee) external view returns (address) {
        return _records[employee].employer;
    }
}
