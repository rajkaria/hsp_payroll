// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MockYieldVault — minimal ERC-4626-style vault for hackathon demo.
/// @notice Accrues a fixed APY via time. Lazily computes yield in `totalAssets`.
///         Production deployment: swap for any compliant ERC-4626 vault on HashKey Chain.
contract MockYieldVault is ERC20 {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    uint256 public constant APY_BPS = 450; // 4.5%
    uint256 public lastAccrualTime;
    uint256 public baseAssets; // underlying held conceptually (prior to yield)

    constructor(IERC20 _asset, string memory _name, string memory _sym)
        ERC20(_name, _sym)
    {
        asset = _asset;
        lastAccrualTime = block.timestamp;
    }

    /// Total underlying assets backing share supply (with simulated yield).
    function totalAssets() public view returns (uint256) {
        if (baseAssets == 0) return 0;
        uint256 dt = block.timestamp - lastAccrualTime;
        // yield = baseAssets * APY_BPS * dt / (10000 * 365 days)
        uint256 yield = (baseAssets * APY_BPS * dt) / (10000 * 365 days);
        return baseAssets + yield;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 total = totalAssets();
        if (supply == 0 || total == 0) return assets;
        return (assets * supply) / total;
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return shares;
        return (shares * totalAssets()) / supply;
    }

    function previewDeposit(uint256 assets) external view returns (uint256) {
        return convertToShares(assets);
    }

    function previewWithdraw(uint256 assets) external view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 total = totalAssets();
        if (supply == 0 || total == 0) return assets;
        return (assets * supply + total - 1) / total; // ceil
    }

    function previewRedeem(uint256 shares) external view returns (uint256) {
        return convertToAssets(shares);
    }

    /// Deposit underlying tokens, mint shares to caller.
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        _accrue();
        shares = convertToShares(assets);
        asset.safeTransferFrom(msg.sender, address(this), assets);
        baseAssets += assets;
        _mint(receiver, shares);
    }

    /// Redeem shares for underlying; returns assets withdrawn.
    function redeem(uint256 shares, address receiver, address owner_) external returns (uint256 assets) {
        _accrue();
        if (msg.sender != owner_) {
            _spendAllowance(owner_, msg.sender, shares);
        }
        assets = convertToAssets(shares);
        _burn(owner_, shares);
        if (assets > baseAssets) {
            baseAssets = 0;
        } else {
            baseAssets -= assets;
        }
        // fund yield by minting underlying from nowhere for demo purposes
        _ensureLiquid(assets, receiver);
    }

    /// Withdraw exact amount of assets (burns enough shares).
    function withdraw(uint256 assets, address receiver, address owner_) external returns (uint256 shares) {
        _accrue();
        uint256 supply = totalSupply();
        uint256 total = totalAssets();
        shares = supply == 0 || total == 0
            ? assets
            : (assets * supply + total - 1) / total;
        if (msg.sender != owner_) {
            _spendAllowance(owner_, msg.sender, shares);
        }
        _burn(owner_, shares);
        if (assets > baseAssets) {
            baseAssets = 0;
        } else {
            baseAssets -= assets;
        }
        _ensureLiquid(assets, receiver);
    }

    function _accrue() internal {
        uint256 total = totalAssets();
        baseAssets = total;
        lastAccrualTime = block.timestamp;
    }

    function _ensureLiquid(uint256 amount, address receiver) internal {
        uint256 bal = asset.balanceOf(address(this));
        if (bal < amount) {
            // Demo only: mint the shortfall. Real vaults would hold yield inline.
            // We call the MockERC20 mint() if available.
            try IMintable(address(asset)).mint(address(this), amount - bal) {} catch {}
        }
        asset.safeTransfer(receiver, amount);
    }
}

interface IMintable {
    function mint(address to, uint256 amount) external;
}
