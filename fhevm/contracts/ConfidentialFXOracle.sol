// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialFXOracle
/// @notice Encrypted FX rate feed. The relayer posts a per-pair encrypted
/// rate (in basis-of-USD-cents per unit of foreign currency, *1e6 for
/// precision). Confidential salary contracts can use it to translate a
/// foreign-currency salary into a USD-equivalent encrypted handle for
/// underwriting — without revealing either the FX pair *or* the salary.
/// @dev Pairs are identified by `bytes6` ticker (e.g. "EURUSD", "GBPUSD").
/// The plaintext side of an FX pair (which currencies are supported) is
/// public; the rate value itself is encrypted so the relayer can't be
/// trivially observed steering a particular borrower.
contract ConfidentialFXOracle is ZamaEthereumConfig {
    address public immutable owner;
    address public relayer;

    struct Rate {
        euint64 rateScaled; // encrypted rate, scaled by 1e6
        uint64 updatedAt;
        bool exists;
    }

    mapping(bytes6 ticker => Rate) private _rates;

    event RelayerUpdated(address indexed relayer);
    event RateUpdated(bytes6 indexed ticker, uint64 updatedAt);
    event ViewerAuthorized(bytes6 indexed ticker, address indexed viewer);

    error NotOwner();
    error NotRelayer();
    error UnknownPair();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayer = newRelayer;
        emit RelayerUpdated(newRelayer);
    }

    function setRate(bytes6 ticker, externalEuint64 encryptedRate, bytes calldata inputProof) external onlyRelayer {
        euint64 rate = FHE.fromExternal(encryptedRate, inputProof);
        _rates[ticker] = Rate({rateScaled: rate, updatedAt: uint64(block.timestamp), exists: true});
        FHE.allowThis(rate);
        emit RateUpdated(ticker, uint64(block.timestamp));
    }

    /// @notice Grant a contract or address ACL on the encrypted rate.
    /// Anyone can authorize any viewer — the rate is intentionally
    /// available to authorized consumers.
    function authorizeViewer(bytes6 ticker, address viewer) external {
        Rate storage r = _rates[ticker];
        if (!r.exists) revert UnknownPair();
        FHE.allow(r.rateScaled, viewer);
        emit ViewerAuthorized(ticker, viewer);
    }

    function rateOf(bytes6 ticker) external view returns (euint64) {
        Rate storage r = _rates[ticker];
        if (!r.exists) revert UnknownPair();
        return r.rateScaled;
    }

    function lastUpdated(bytes6 ticker) external view returns (uint64) {
        return _rates[ticker].updatedAt;
    }
}
