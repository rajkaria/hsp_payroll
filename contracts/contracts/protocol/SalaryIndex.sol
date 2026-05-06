// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SalaryIndex — fiat-denominated salary via Chainlink-compatible price feeds.
/// @notice Employer sets salary in INR/USD/EUR; at execute time, oracle converts to settlement token.
interface IPriceFeed {
    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

interface IPayrollOwnerLookup {
    function payrolls(uint256 id) external view returns (
        address owner, address token,
        uint256 frequency, uint256 startTime, uint256 lastExecuted,
        uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
        bool active, string memory name
    );
}

contract SalaryIndex {
    address public governance;
    address public factory;

    mapping(bytes32 => IPriceFeed) public feeds;

    struct FiatSalary {
        bytes32 fiatCode;
        uint256 fiatAmount;
        bool set;
    }
    mapping(uint256 => mapping(address => FiatSalary)) public fiatSalary;

    event FeedSet(bytes32 indexed fiatCode, address feed);
    event FiatSalarySet(uint256 indexed payrollId, address indexed recipient, bytes32 fiatCode, uint256 fiatAmount);
    event FactorySet(address factory);

    modifier onlyGovernance() { require(msg.sender == governance, "Not governance"); _; }

    constructor() { governance = msg.sender; }

    function setFactory(address f) external onlyGovernance {
        factory = f;
        emit FactorySet(f);
    }

    function setFeed(bytes32 fiatCode, address feed) external onlyGovernance {
        feeds[fiatCode] = IPriceFeed(feed);
        emit FeedSet(fiatCode, feed);
    }

    /// @dev Restricted to the payroll owner; previously unauthenticated, which let anyone
    ///      overwrite anyone's fiat-denominated salary.
    function setFiatSalary(uint256 payrollId, address recipient, bytes32 fiatCode, uint256 fiatAmount) external {
        require(factory != address(0), "Factory not set");
        (address payrollOwner,,,,,,,,,) = IPayrollOwnerLookup(factory).payrolls(payrollId);
        require(msg.sender == payrollOwner, "Not payroll owner");
        fiatSalary[payrollId][recipient] = FiatSalary(fiatCode, fiatAmount, true);
        emit FiatSalarySet(payrollId, recipient, fiatCode, fiatAmount);
    }

    /// Convert a fiat amount to token amount using the configured feed.
    /// Assumes price feed returns "fiat per 1 token" (e.g., INR per 1 USDT).
    function tokenAmountFor(bytes32 fiatCode, uint256 fiatAmount, uint8 tokenDecimals)
        public view returns (uint256)
    {
        IPriceFeed f = feeds[fiatCode];
        require(address(f) != address(0), "No feed");
        (, int256 answer,,,) = f.latestRoundData();
        require(answer > 0, "Bad price");
        uint8 feedDec = f.decimals();
        // tokenAmount = fiatAmount * 10^tokenDecimals * 10^feedDec / (answer * 10^fiatDecimals)
        // simplified: fiat inputs expected in same scale as feed (feedDec)
        return (fiatAmount * (10 ** tokenDecimals)) / uint256(answer);
    }
}

/// Demo price feed (for hackathon — returns a hardcoded rate).
contract MockPriceFeed is IPriceFeed {
    int256 public price;
    uint8 public immutable _decimals;
    constructor(int256 _price, uint8 _dec) { price = _price; _decimals = _dec; }
    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (1, price, block.timestamp, block.timestamp, 1);
    }
    function decimals() external view override returns (uint8) { return _decimals; }
    function setPrice(int256 p) external { price = p; }
}
