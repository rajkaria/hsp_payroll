// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialUSDT
/// @notice Minimal ERC-7984-style confidential token used as the cUSDT
/// settlement asset for HashPay Confidential. Encrypted balances; transfers
/// reveal neither sender, recipient, nor amount on-chain.
/// @dev Authorized contracts may also `debit` a user — used by
/// ConfidentialAdvance for repayment burns and collateral posting. The
/// debit flow honors the same FHE clamping as transfers (no revealing
/// revert on insufficient balance).
contract ConfidentialUSDT is ZamaEthereumConfig {
    string public constant name = "Confidential USDT";
    string public constant symbol = "cUSDT";
    uint8 public constant decimals = 6;

    address public immutable owner;
    mapping(address => bool) public isMinter;
    mapping(address => bool) public isDebitor;
    mapping(address => euint64) private _balances;

    event MinterUpdated(address indexed minter, bool allowed);
    event DebitorUpdated(address indexed debitor, bool allowed);
    event ConfidentialTransfer(address indexed from, address indexed to);
    event ConfidentialMint(address indexed to);
    event ConfidentialBurn(address indexed from);

    error NotOwner();
    error NotMinter();
    error NotDebitor();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (!isMinter[msg.sender]) revert NotMinter();
        _;
    }

    modifier onlyDebitor() {
        if (!isDebitor[msg.sender]) revert NotDebitor();
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

    function setDebitor(address debitor, bool allowed) external onlyOwner {
        isDebitor[debitor] = allowed;
        emit DebitorUpdated(debitor, allowed);
    }

    /// @notice Mint encrypted tokens to an address.
    function confidentialMint(address to, euint64 amount) external onlyMinter {
        _credit(to, amount);
        emit ConfidentialMint(to);
    }

    function confidentialMintFromExternal(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyMinter {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _credit(to, amount);
        emit ConfidentialMint(to);
    }

    /// @notice Burn an encrypted amount from a user. Used by repayment and
    /// collateral flows. Returns the actual amount burned (clamped to the
    /// user's balance under FHE).
    function debit(address from, euint64 amount) external onlyDebitor returns (euint64 actual) {
        euint64 bal = _balances[from];
        ebool sufficient = FHE.ge(bal, amount);
        actual = FHE.select(sufficient, amount, bal);
        euint64 next = FHE.sub(bal, actual);
        _balances[from] = next;
        FHE.allowThis(next);
        FHE.allow(next, from);
        FHE.allowThis(actual);
        FHE.allow(actual, from);
        FHE.allow(actual, msg.sender);
        emit ConfidentialBurn(from);
        return actual;
    }

    /// @notice Transfer encrypted tokens.
    function confidentialTransfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (ebool ok) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        return _internalTransfer(msg.sender, to, amount);
    }

    function confidentialBalanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

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
