// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialSalaryIndex {
    function salaryOf(address employee) external view returns (euint64);
}

/// @title IncomeProver
/// @notice Selective proof-of-income. The employee can produce an
/// encrypted boolean attesting "salary >= threshold" against a third
/// party (a landlord, a lender on another protocol, an insurance
/// underwriter) without revealing the salary itself.
/// @dev The salary handle comes from `ConfidentialSalaryIndex`. Caller
/// must already hold ACL permission to read the salary (or be the
/// employee — in which case `authorizeViewer` on the salary index can
/// be used to grant this contract permission).
contract IncomeProver is ZamaEthereumConfig {
    IConfidentialSalaryIndex public immutable salaryIndex;

    struct Proof {
        ebool atLeast;
        uint64 threshold; // plaintext threshold the proof was generated against
        uint64 generatedAt;
        bool exists;
    }

    mapping(address employee => mapping(address verifier => Proof)) private _proofs;

    event ProofGenerated(address indexed employee, address indexed verifier, uint64 threshold);

    constructor(address salaryIndex_) {
        salaryIndex = IConfidentialSalaryIndex(salaryIndex_);
    }

    /// @notice Generate a proof that `salary >= threshold` for the caller
    /// against a specific verifier. The verifier receives ACL on the
    /// resulting `ebool` and can decrypt only the boolean — never the
    /// salary itself.
    function proveAtLeast(uint64 threshold, address verifier) external {
        euint64 salary = salaryIndex.salaryOf(msg.sender);
        ebool ok = FHE.ge(salary, FHE.asEuint64(threshold));

        FHE.allowThis(ok);
        FHE.allow(ok, msg.sender);
        FHE.allow(ok, verifier);

        _proofs[msg.sender][verifier] = Proof({
            atLeast: ok,
            threshold: threshold,
            generatedAt: uint64(block.timestamp),
            exists: true
        });

        emit ProofGenerated(msg.sender, verifier, threshold);
    }

    function proofOf(address employee, address verifier) external view returns (ebool, uint64, uint64) {
        Proof storage p = _proofs[employee][verifier];
        return (p.atLeast, p.threshold, p.generatedAt);
    }

    function exists(address employee, address verifier) external view returns (bool) {
        return _proofs[employee][verifier].exists;
    }
}
