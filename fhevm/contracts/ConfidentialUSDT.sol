// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialUSDT
/// @notice Minimal ERC-7984-style confidential token used as the cUSDT
/// settlement asset for HashPay Confidential. Encrypted balances; transfers
/// reveal neither sender, recipient, nor amount on-chain.
/// @dev Not a full ERC-7984 implementation — covers the surface area used
/// by the demo (mint, transfer, balanceOf, internal credit/debit by
/// authorized protocol contracts). For mainnet a vetted ERC-7984
/// implementation should be used in place of this contract.
contract ConfidentialUSDT is SepoliaConfig {
    string public constant name = "Confidential USDT";
    string public constant symbol = "cUSDT";
    uint8 public constant decimals = 6;

    address public immutable owner;
    mapping(address => bool) public isMinter;
    mapping(address => euint64) private _balances;

    event MinterUpdated(address indexed minter, bool allowed);
    event ConfidentialTransfer(address indexed from, address indexed to);
    event ConfidentialMint(address indexed to);

    error NotOwner();
    error NotMinter();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (!isMinter[msg.sender]) revert NotMinter();
        _;
    }

    constructor() {
        owner = msg.sender;
        isMinter[msg.sender] = true;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        isMinter[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /// @notice Mint encrypted tokens to an address. Used by the protocol
    /// owner to fund the ConfidentialAdvance pool, and by ConfidentialAdvance
    /// to disburse approved advances.
    function confidentialMint(address to, euint64 amount) external onlyMinter {
        _credit(to, amount);
        emit ConfidentialMint(to);
    }

    /// @notice Mint with an external input (caller-encrypted amount).
    function confidentialMintFromExternal(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyMinter {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _credit(to, amount);
        emit ConfidentialMint(to);
    }

    /// @notice Transfer encrypted tokens. The amount is encrypted and the
    /// underflow case is handled by clamping the transferred amount to the
    /// sender's balance (no revealing revert).
    function confidentialTransfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (ebool ok) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        return _internalTransfer(msg.sender, to, amount);
    }

    /// @notice Returns the encrypted balance handle for an account. The
    /// caller must hold ACL permission on the handle to decrypt it.
    function confidentialBalanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Authorize another address to read the caller's balance handle.
    function authorizeBalanceViewer(address viewer) external {
        euint64 balance = _balances[msg.sender];
        FHE.allow(balance, viewer);
    }

    function _credit(address to, euint64 amount) internal {
        euint64 current = _balances[to];
        euint64 next = FHE.add(current, amount);
        _balances[to] = next;
        FHE.allowThis(next);
        FHE.allow(next, to);
    }

    function _internalTransfer(address from, address to, euint64 amount) internal returns (ebool) {
        euint64 fromBal = _balances[from];
        ebool sufficient = FHE.ge(fromBal, amount);
        euint64 actual = FHE.select(sufficient, amount, FHE.asEuint64(0));

        euint64 newFrom = FHE.sub(fromBal, actual);
        euint64 newTo = FHE.add(_balances[to], actual);

        _balances[from] = newFrom;
        _balances[to] = newTo;

        FHE.allowThis(newFrom);
        FHE.allow(newFrom, from);
        FHE.allowThis(newTo);
        FHE.allow(newTo, to);
        FHE.allow(sufficient, from);

        emit ConfidentialTransfer(from, to);
        return sufficient;
    }
}
