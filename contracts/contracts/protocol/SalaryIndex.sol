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

contract SalaryIndex {
    address public governance;

    // fiat code (e.g. "INR", "USD") => price feed (fiat per 1 token)
    // We store feeds as token/fiat: 1 settlement token = X fiat.
    // Price query: fiatAmount / (rate scaled by feed decimals) = tokenAmount
    mapping(bytes32 => IPriceFeed) public feeds;

    // payrollId => recipient => (fiat code, fiat amount)
    struct FiatSalary {
        bytes32 fiatCode;
        uint256 fiatAmount;
        bool set;
    }
    mapping(uint256 => mapping(address => FiatSalary)) public fiatSalary;

    event FeedSet(bytes32 indexed fiatCode, address feed);
    event FiatSalarySet(uint256 indexed payrollId, address indexed recipient, bytes32 fiatCode, uint256 fiatAmount);

    modifier onlyGovernance() { require(msg.sender == governance, "Not governance"); _; }

    constructor() { governance = msg.sender; }

    function setFeed(bytes32 fiatCode, address feed) external onlyGovernance {
        feeds[fiatCode] = IPriceFeed(feed);
        emit FeedSet(fiatCode, feed);
    }

    /// Employer sets a fiat-denominated salary for a recipient on a payroll.
    /// Token payouts are dynamically computed via `tokenAmountFor`.
    function setFiatSalary(uint256 payrollId, address recipient, bytes32 fiatCode, uint256 fiatAmount) external {
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
