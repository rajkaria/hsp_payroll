// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPayrollExtension.sol";
import "./MockYieldVault.sol";

interface IPayrollForYield {
    function payrolls(uint256 id) external view returns (
        address owner, address token,
        uint256 frequency, uint256 startTime, uint256 lastExecuted,
        uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
        bool active, string memory name
    );
}

/// @title YieldEscrow — deposits idle escrow into an ERC-4626 vault until needed.
/// @notice "Your runway extends itself." Funds flow: employer → PayrollFactory → YieldEscrow → Vault.
///         On executeCycle, YieldEscrow redeems exactly enough shares and returns tokens to PayrollFactory.
contract YieldEscrow is IPayrollExtension, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct YieldConfig {
        MockYieldVault vault;
        uint256 shares;
        uint256 principalDeposited;
        uint256 yieldClaimed;
        bool autoCompound;
        bool enabled;
    }

    address public factory;
    address public governance;
    MockYieldVault public defaultVault;

    mapping(uint256 => YieldConfig) public yieldConfig;

    event YieldEnabled(uint256 indexed payrollId, address vault, bool autoCompound);
    event YieldDisabled(uint256 indexed payrollId);
    event YieldClaimed(uint256 indexed payrollId, address indexed employer, uint256 amount);
    event Deposited(uint256 indexed payrollId, uint256 assets, uint256 shares);
    event Redeemed(uint256 indexed payrollId, uint256 assets, uint256 shares);

    modifier onlyFactory() { require(msg.sender == factory, "Only factory"); _; }
    modifier onlyGovernance() { require(msg.sender == governance, "Not governance"); _; }

    constructor(address _factory, address _defaultVault) {
        factory = _factory;
        governance = msg.sender;
        defaultVault = MockYieldVault(_defaultVault);
    }

    // ---- Employer config ----

    function enableYield(uint256 payrollId, address vaultAddr, bool autoCompound) external {
        _ensureEmployer(payrollId);
        YieldConfig storage c = yieldConfig[payrollId];
        require(!c.enabled, "Already enabled");
        c.vault = vaultAddr == address(0) ? defaultVault : MockYieldVault(vaultAddr);
        c.autoCompound = autoCompound;
        c.enabled = true;
        emit YieldEnabled(payrollId, address(c.vault), autoCompound);
    }

    function disableYield(uint256 payrollId) external nonReentrant {
        _ensureEmployer(payrollId);
        YieldConfig storage c = yieldConfig[payrollId];
        require(c.enabled, "Not enabled");
        // redeem everything back to factory
        if (c.shares > 0) {
            uint256 assets = c.vault.redeem(c.shares, factory, address(this));
            emit Redeemed(payrollId, assets, c.shares);
            c.shares = 0;
        }
        c.enabled = false;
        emit YieldDisabled(payrollId);
    }

    // ---- Extension hooks ----

    function onFund(uint256 payrollId, address token, uint256 amount) external override onlyFactory {
        YieldConfig storage c = yieldConfig[payrollId];
        if (!c.enabled) {
            // return funds straight back to factory so they sit in its balance
            IERC20(token).safeTransfer(factory, amount);
            return;
        }
        // deposit into vault
        IERC20(token).approve(address(c.vault), amount);
        uint256 shares = c.vault.deposit(amount, address(this));
        c.shares += shares;
        c.principalDeposited += amount;
        emit Deposited(payrollId, amount, shares);
    }

    function beforeCycle(uint256 payrollId, address /*token*/, uint256 amountNeeded) external override onlyFactory {
        YieldConfig storage c = yieldConfig[payrollId];
        if (!c.enabled || c.shares == 0) return;
        // withdraw exactly amountNeeded to factory
        uint256 sharesBurned = c.vault.previewWithdraw(amountNeeded);
        if (sharesBurned > c.shares) sharesBurned = c.shares;
        uint256 actualShares = c.vault.withdraw(amountNeeded, factory, address(this));
        c.shares -= actualShares;
        emit Redeemed(payrollId, amountNeeded, actualShares);
    }

    function onSettleRecipient(
        uint256,
        address recipient,
        uint256 grossAmount,
        address,
        bytes32
    ) external override returns (address, uint256) {
        // Yield extension doesn't reroute payouts — defers to recipient.
        return (recipient, grossAmount);
    }

    function afterCycle(uint256 payrollId) external override {
        YieldConfig storage c = yieldConfig[payrollId];
        if (!c.enabled || !c.autoCompound) return;
        // Any excess funds left in factory stay there; auto-compound applies to NEW fund calls.
        // No-op for demo — yield accrues in vault automatically.
    }

    function onRepay(uint256, address, uint256 grossAmount, address) external override returns (uint256) {
        return grossAmount;
    }

    // ---- Views ----

    /// Total underlying backing this payroll in the vault (principal + yield).
    function availableBalance(uint256 payrollId) public view returns (uint256) {
        YieldConfig storage c = yieldConfig[payrollId];
        if (!c.enabled || c.shares == 0) return 0;
        return c.vault.convertToAssets(c.shares);
    }

    /// Yield earned since enable = vault holdings − principal deposited − yield already claimed.
    function accruedYield(uint256 payrollId) public view returns (uint256) {
        YieldConfig storage c = yieldConfig[payrollId];
        if (!c.enabled) return 0;
        uint256 avail = availableBalance(payrollId);
        uint256 netPrincipal = c.principalDeposited - c.yieldClaimed;
        if (avail <= netPrincipal) return 0;
        return avail - netPrincipal;
    }

    function runwayWithYield(uint256 payrollId, uint256 cycleCost) external view returns (uint256 baseCycles, uint256 extendedCycles) {
        if (cycleCost == 0) return (0, 0);
        YieldConfig storage c = yieldConfig[payrollId];
        if (!c.enabled) return (0, 0);
        uint256 total = availableBalance(payrollId);
        uint256 principal = c.principalDeposited - c.yieldClaimed;
        baseCycles = principal / cycleCost;
        extendedCycles = total / cycleCost;
    }

    /// Employer claims accrued yield (non-compounding mode).
    function claimYield(uint256 payrollId) external nonReentrant returns (uint256 amount) {
        _ensureEmployer(payrollId);
        YieldConfig storage c = yieldConfig[payrollId];
        require(c.enabled, "Not enabled");
        amount = accruedYield(payrollId);
        require(amount > 0, "No yield");
        uint256 sharesBurned = c.vault.previewWithdraw(amount);
        if (sharesBurned > c.shares) sharesBurned = c.shares;
        uint256 burned = c.vault.withdraw(amount, msg.sender, address(this));
        c.shares -= burned;
        c.yieldClaimed += amount;
        emit YieldClaimed(payrollId, msg.sender, amount);
    }

    // ---- Internal ----

    function _ensureEmployer(uint256 payrollId) internal view {
        (address owner,,,,,,,,,) = IPayrollForYield(factory).payrolls(payrollId);
        require(owner == msg.sender, "Not employer");
    }
}
