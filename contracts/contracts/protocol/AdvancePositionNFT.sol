// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AdvancePositionNFT — tokenized lender pool shares (bonus #1).
/// @notice Each NFT represents a claim on the advance pool with share count.
///         Secondary market can trade these positions without closing/reopening.
contract AdvancePositionNFT is ERC721, Ownable {
    struct Position {
        address token;
        uint256 shares;
        uint256 mintedAt;
    }

    uint256 public nextId = 1;
    address public advanceExtension;
    mapping(uint256 => Position) public positions;

    modifier onlyAdvance() {
        require(msg.sender == advanceExtension, "Only advance ext");
        _;
    }

    constructor() ERC721("HashPay Advance Position", "hpAP") Ownable(msg.sender) {}

    function setAdvanceExtension(address a) external onlyOwner {
        advanceExtension = a;
    }

    function mint(address to, address token, uint256 shares) external onlyAdvance returns (uint256 id) {
        id = nextId++;
        positions[id] = Position(token, shares, block.timestamp);
        _safeMint(to, id);
    }

    function burn(uint256 id) external onlyAdvance {
        delete positions[id];
        _burn(id);
    }

    function positionOf(uint256 id) external view returns (Position memory) {
        return positions[id];
    }
}
