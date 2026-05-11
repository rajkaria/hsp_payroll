// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IConfidentialUSDT {
    function confidentialBalanceOf(address account) external view returns (euint64);
}

/// @title ConfidentialEmployerRunway
/// @notice Encrypted runway alerting for employers. The employer declares
/// an encrypted "per-cycle total" (the sum of monthly payouts). External
/// callers can ask "does this employer have at least N cycles of runway
/// left?" — answered as an encrypted boolean. The balance and per-cycle
/// total are never revealed.
/// @dev Pairs with the public HSK runway display for users who want
/// privacy. No HSK contract is touched.
contract ConfidentialEmployerRunway is ZamaEthereumConfig {
    IConfidentialUSDT public immutable cUSDT;

    struct EmployerState {
        euint64 perCycleTotal;
        bool exists;
        uint64 updatedAt;
    }

    mapping(address employer => EmployerState) private _state;

    event PerCycleTotalUpdated(address indexed employer, uint64 updatedAt);
    event ViewerAuthorized(address indexed employer, address indexed viewer);

    error UnknownEmployer();

    constructor(address cUSDT_) {
        cUSDT = IConfidentialUSDT(cUSDT_);
    }

    /// @notice Set the encrypted per-cycle total payout for the caller.
    function setPerCycleTotal(externalEuint64 encryptedTotal, bytes calldata inputProof) external {
        euint64 total = FHE.fromExternal(encryptedTotal, inputProof);
        _state[msg.sender] = EmployerState({perCycleTotal: total, exists: true, updatedAt: uint64(block.timestamp)});
        FHE.allowThis(total);
        FHE.allow(total, msg.sender);
        emit PerCycleTotalUpdated(msg.sender, uint64(block.timestamp));
    }

    /// @notice Authorize a viewer to decrypt the per-cycle total.
    function authorizeViewer(address viewer) external {
        EmployerState storage s = _state[msg.sender];
        if (!s.exists) revert UnknownEmployer();
        FHE.allow(s.perCycleTotal, viewer);
        emit ViewerAuthorized(msg.sender, viewer);
    }

    /// @notice Encrypted alert: returns ebool that is true iff the
    /// employer has *fewer than* `cycles` cycles of runway, i.e.
    /// `balance < perCycleTotal * cycles`.
    /// @dev Compares ciphertexts under FHE; the employer (and any
    /// authorized viewer) decrypts the boolean. The values being
    /// compared are never disclosed.
    function hasLowRunway(address employer, uint64 cycles) external returns (ebool low) {
        EmployerState storage s = _state[employer];
        if (!s.exists) revert UnknownEmployer();
        euint64 bal = cUSDT.confidentialBalanceOf(employer);
        euint64 needed = FHE.mul(s.perCycleTotal, cycles);
        low = FHE.lt(bal, needed);
        FHE.allowThis(low);
        FHE.allow(low, employer);
        FHE.allow(low, msg.sender);
    }

    /// @notice Encrypted check: returns ebool that is true iff the
    /// employer has *at least* `cycles` cycles of runway.
    function hasAtLeast(address employer, uint64 cycles) external returns (ebool ok) {
        EmployerState storage s = _state[employer];
        if (!s.exists) revert UnknownEmployer();
        euint64 bal = cUSDT.confidentialBalanceOf(employer);
        euint64 needed = FHE.mul(s.perCycleTotal, cycles);
        ok = FHE.ge(bal, needed);
        FHE.allowThis(ok);
        FHE.allow(ok, employer);
        FHE.allow(ok, msg.sender);
    }

    function perCycleOf(address employer) external view returns (euint64) {
        return _state[employer].perCycleTotal;
    }
}
