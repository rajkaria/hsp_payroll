// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialAdvancePositionNFT
/// @notice ERC-721-flavored position token where the metadata (principal,
/// rate, status) is encrypted. Transferring the token transfers the
/// encrypted claim; ACL is handed off so the new holder can decrypt.
/// @dev Minimal ERC-721 surface — the existing AdvancePositionNFT on HSK
/// remains the public-facing variant. This is the privacy-preserving
/// twin used when the underlying advance is confidential.
contract ConfidentialAdvancePositionNFT is ZamaEthereumConfig {
    string public constant name = "Confidential HashPay Position";
    string public constant symbol = "cHSP-POS";

    address public immutable owner;
    mapping(address => bool) public isMinter;

    struct PositionMeta {
        euint64 principal;
        euint64 rateBps;
        euint32 status; // 0 = open, 1 = closed, 2 = defaulted
        uint64 openedAt;
    }

    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => PositionMeta) private _meta;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;

    uint256 public nextTokenId = 1;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed ownerAddr, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed ownerAddr, address indexed operator, bool approved);
    event MinterUpdated(address indexed minter, bool allowed);
    event PositionMinted(uint256 indexed tokenId, address indexed to);
    event PositionStatusUpdated(uint256 indexed tokenId);

    error NotOwner();
    error NotMinter();
    error NotAuthorized();
    error TokenNotFound();

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

    /// @notice Mint a position to `to` with the given encrypted metadata.
    /// Caller is typically `ConfidentialAdvance`.
    function mint(address to, euint64 principal, euint64 rateBps, euint32 status) external onlyMinter returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        ownerOf[tokenId] = to;
        balanceOf[to] += 1;
        _meta[tokenId] = PositionMeta({principal: principal, rateBps: rateBps, status: status, openedAt: uint64(block.timestamp)});

        FHE.allowThis(principal);
        FHE.allowThis(rateBps);
        FHE.allowThis(status);
        FHE.allow(principal, to);
        FHE.allow(rateBps, to);
        FHE.allow(status, to);

        emit Transfer(address(0), to, tokenId);
        emit PositionMinted(tokenId, to);
    }

    function updateStatus(uint256 tokenId, euint32 newStatus) external onlyMinter {
        if (ownerOf[tokenId] == address(0)) revert TokenNotFound();
        _meta[tokenId].status = newStatus;
        FHE.allowThis(newStatus);
        FHE.allow(newStatus, ownerOf[tokenId]);
        emit PositionStatusUpdated(tokenId);
    }

    function approve(address spender, uint256 tokenId) external {
        address holder = ownerOf[tokenId];
        if (holder != msg.sender && !isApprovedForAll[holder][msg.sender]) revert NotAuthorized();
        getApproved[tokenId] = spender;
        emit Approval(holder, spender, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (ownerOf[tokenId] != from) revert NotAuthorized();
        if (msg.sender != from && getApproved[tokenId] != msg.sender && !isApprovedForAll[from][msg.sender]) {
            revert NotAuthorized();
        }
        ownerOf[tokenId] = to;
        balanceOf[from] -= 1;
        balanceOf[to] += 1;
        getApproved[tokenId] = address(0);

        // Hand off ACL — the new holder must be able to decrypt.
        PositionMeta storage m = _meta[tokenId];
        FHE.allow(m.principal, to);
        FHE.allow(m.rateBps, to);
        FHE.allow(m.status, to);

        emit Transfer(from, to, tokenId);
    }

    function principalOf(uint256 tokenId) external view returns (euint64) {
        return _meta[tokenId].principal;
    }

    function rateOf(uint256 tokenId) external view returns (euint64) {
        return _meta[tokenId].rateBps;
    }

    function statusOf(uint256 tokenId) external view returns (euint32) {
        return _meta[tokenId].status;
    }

    function openedAtOf(uint256 tokenId) external view returns (uint64) {
        return _meta[tokenId].openedAt;
    }
}
