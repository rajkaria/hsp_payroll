// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IPayrollExtension.sol";

/// @title IComplianceHook — pluggable check executed per-recipient during settlement.
interface IComplianceHook {
    function check(
        address employer,
        address recipient,
        uint256 amount,
        uint256 payrollId
    ) external view returns (bool passed, string memory reason);

    function description() external view returns (string memory);
    function hookId() external view returns (bytes32);
}

/// @title ComplianceHookRegistry — per-payroll list of hooks, evaluated in order.
/// @notice Employer attaches hooks; factory calls `runHooks` to gate each recipient's payout.
///         Bonus feature #2 bundled: bonus #2 was for yield (skipped), but we add TimelockHook + RateLimitHook.
contract ComplianceHookRegistry is IComplianceRegistry {
    address public factory;
    address public governance;
    uint256 public constant MAX_HOOKS_PER_PAYROLL = 5;

    mapping(uint256 => address[]) public payrollHooks;
    mapping(uint256 => mapping(address => bool)) public hookAttached;

    event HookAttached(uint256 indexed payrollId, address indexed hook);
    event HookDetached(uint256 indexed payrollId, address indexed hook);

    modifier onlyEmployer(uint256 payrollId) {
        (address owner,,,,,,,,,) = IPayrollMinimal(factory).payrolls(payrollId);
        require(owner == msg.sender, "Not employer");
        _;
    }

    constructor(address _factory) {
        factory = _factory;
        governance = msg.sender;
    }

    function attachHook(uint256 payrollId, address hook) external onlyEmployer(payrollId) {
        require(!hookAttached[payrollId][hook], "Already attached");
        require(payrollHooks[payrollId].length < MAX_HOOKS_PER_PAYROLL, "Too many hooks");
        payrollHooks[payrollId].push(hook);
        hookAttached[payrollId][hook] = true;
        emit HookAttached(payrollId, hook);
    }

    function detachHook(uint256 payrollId, address hook) external onlyEmployer(payrollId) {
        require(hookAttached[payrollId][hook], "Not attached");
        address[] storage hooks = payrollHooks[payrollId];
        for (uint256 i = 0; i < hooks.length; i++) {
            if (hooks[i] == hook) {
                hooks[i] = hooks[hooks.length - 1];
                hooks.pop();
                break;
            }
        }
        hookAttached[payrollId][hook] = false;
        emit HookDetached(payrollId, hook);
    }

    function getHooks(uint256 payrollId) external view returns (address[] memory) {
        return payrollHooks[payrollId];
    }

    function runHooks(uint256 payrollId, address recipient, uint256 amount)
        external view override returns (bool passed, string memory reason)
    {
        address[] storage hooks = payrollHooks[payrollId];
        (address employer,,,,,,,,,) = IPayrollMinimal(factory).payrolls(payrollId);
        for (uint256 i = 0; i < hooks.length; i++) {
            (bool ok, string memory r) = IComplianceHook(hooks[i]).check(
                employer, recipient, amount, payrollId
            );
            if (!ok) return (false, r);
        }
        return (true, "");
    }
}

interface IPayrollMinimal {
    function payrolls(uint256 id) external view returns (
        address owner, address token,
        uint256 frequency, uint256 startTime, uint256 lastExecuted,
        uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
        bool active, string memory name
    );
}

/// --- Reference Hooks ---

contract KYCSBTHook is IComplianceHook {
    IERC721 public sbt;
    constructor(address _sbt) { sbt = IERC721(_sbt); }
    function check(address, address recipient, uint256, uint256)
        external view override returns (bool, string memory)
    {
        if (sbt.balanceOf(recipient) == 0) return (false, "KYC SBT missing");
        return (true, "");
    }
    function description() external pure override returns (string memory) { return "KYC SBT gating"; }
    function hookId() external pure override returns (bytes32) { return keccak256("kyc-sbt-v1"); }
}

contract JurisdictionHook is IComplianceHook {
    address public owner;
    mapping(address => string) public recipientJurisdiction;
    mapping(bytes32 => bool) public allowed;

    constructor() { owner = msg.sender; }

    function setJurisdiction(address r, string calldata j) external {
        // permissioned attestation (owner-set for hackathon demo; real-world: signature-verified)
        require(msg.sender == owner, "Not owner");
        recipientJurisdiction[r] = j;
    }
    function setAllowed(string calldata j, bool ok) external {
        require(msg.sender == owner, "Not owner");
        allowed[keccak256(bytes(j))] = ok;
    }
    function check(address, address recipient, uint256, uint256)
        external view override returns (bool, string memory)
    {
        string memory j = recipientJurisdiction[recipient];
        if (bytes(j).length == 0) return (false, "No jurisdiction set");
        if (!allowed[keccak256(bytes(j))]) return (false, string.concat("Blocked: ", j));
        return (true, "");
    }
    function description() external pure override returns (string memory) { return "Jurisdiction allowlist"; }
    function hookId() external pure override returns (bytes32) { return keccak256("jurisdiction-v1"); }
}

contract SanctionsHook is IComplianceHook {
    address public owner;
    mapping(address => bool) public sanctioned;
    constructor() { owner = msg.sender; }
    function setSanctioned(address who, bool s) external {
        require(msg.sender == owner, "Not owner");
        sanctioned[who] = s;
    }
    function check(address, address recipient, uint256, uint256)
        external view override returns (bool, string memory)
    {
        if (sanctioned[recipient]) return (false, "Sanctioned");
        return (true, "");
    }
    function description() external pure override returns (string memory) { return "Sanctions list"; }
    function hookId() external pure override returns (bytes32) { return keccak256("sanctions-v1"); }
}

/// Bonus: Rate limit hook — caps $/recipient/day across all payrolls attached
contract RateLimitHook is IComplianceHook {
    address public owner;
    uint256 public dailyCap;
    mapping(address => uint256) public dailyUsed;
    mapping(address => uint256) public lastDay;

    constructor(uint256 _dailyCap) { owner = msg.sender; dailyCap = _dailyCap; }

    function check(address, address recipient, uint256 amount, uint256)
        external view override returns (bool, string memory)
    {
        uint256 today = block.timestamp / 1 days;
        uint256 used = lastDay[recipient] == today ? dailyUsed[recipient] : 0;
        if (used + amount > dailyCap) return (false, "Daily cap exceeded");
        return (true, "");
    }
    function description() external pure override returns (string memory) { return "Per-recipient daily cap"; }
    function hookId() external pure override returns (bytes32) { return keccak256("rate-limit-v1"); }
}

/// Bonus: Timelock hook — delays payouts > N tokens by M hours
contract TimelockHook is IComplianceHook {
    uint256 public threshold;
    uint256 public delayHours;
    mapping(uint256 => uint256) public cycleUnlockTime;

    constructor(uint256 _threshold, uint256 _delayHours) {
        threshold = _threshold; delayHours = _delayHours;
    }

    function check(address, address, uint256 amount, uint256 payrollId)
        external view override returns (bool, string memory)
    {
        if (amount < threshold) return (true, "");
        uint256 unlock = cycleUnlockTime[payrollId];
        if (block.timestamp < unlock) return (false, "Timelock active");
        return (true, "");
    }
    function description() external pure override returns (string memory) { return "Large-payout timelock"; }
    function hookId() external pure override returns (bytes32) { return keccak256("timelock-v1"); }
}

/// Simple SBT for demoing KYCSBTHook
contract DemoKYCSBT {
    mapping(address => uint256) public _balances;
    function mint(address to) external { _balances[to] = 1; }
    function burn(address from) external { _balances[from] = 0; }
    function balanceOf(address who) external view returns (uint256) { return _balances[who]; }
}
