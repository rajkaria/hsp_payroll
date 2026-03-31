# HSP Payroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an on-chain recurring payroll system on HashKey Chain for the DoraHacks PayFi hackathon — smart contracts + Next.js frontend with wallet connect, payroll creation, cycle execution, and receipt tracking.

**Architecture:** Solidity smart contracts (PayrollFactory + HSPAdapter + escrow logic) deployed to HashKey Chain testnet (chain ID 133). Next.js 15 frontend with wagmi v2 + RainbowKit for wallet connection. HSP is implemented as our own settlement message layer since no official HSP protocol exists — we build the payment request/confirm/receipt pattern ourselves, which IS the HSP integration.

**Tech Stack:** Solidity 0.8.24, Hardhat, OpenZeppelin, Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, wagmi v2, RainbowKit, viem

---

## File Structure

```
hsp_payroll/
├── contracts/                          # Hardhat project root
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                            # PRIVATE_KEY (gitignored)
│   ├── contracts/
│   │   ├── HSPAdapter.sol              # Payment request/confirm/receipt message layer
│   │   ├── PayrollFactory.sol          # Core payroll CRUD + cycle execution
│   │   └── MockERC20.sol              # Test token for testnet
│   ├── test/
│   │   ├── HSPAdapter.test.ts
│   │   ├── PayrollFactory.test.ts
│   │   └── Integration.test.ts
│   ├── scripts/
│   │   ├── deploy.ts                   # Deploy all contracts
│   │   └── seed.ts                     # Create sample payroll data for demo
│   └── ignition/                       # (not used — using scripts/)
├── frontend/                           # Next.js 15 app
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout with providers
│   │   │   ├── page.tsx                # Landing page — connect wallet
│   │   │   ├── globals.css
│   │   │   ├── employer/
│   │   │   │   ├── page.tsx            # Employer dashboard
│   │   │   │   └── create/
│   │   │   │       └── page.tsx        # Create payroll wizard
│   │   │   └── employee/
│   │   │       └── page.tsx            # Employee payment history
│   │   ├── components/
│   │   │   ├── providers.tsx           # wagmi + RainbowKit + QueryClient
│   │   │   ├── connect-button.tsx      # Wallet connect wrapper
│   │   │   ├── payroll-card.tsx        # Payroll summary card
│   │   │   ├── create-payroll-form.tsx # Multi-step create form
│   │   │   ├── payment-history.tsx     # Payment history table
│   │   │   ├── receipt-modal.tsx       # Receipt detail modal
│   │   │   └── csv-export.tsx          # CSV download button
│   │   ├── config/
│   │   │   ├── wagmi.ts               # wagmi config + HashKey Chain def
│   │   │   └── contracts.ts           # Contract addresses + ABIs
│   │   ├── hooks/
│   │   │   ├── usePayrolls.ts         # Read payroll data
│   │   │   ├── useCreatePayroll.ts    # Write: create payroll
│   │   │   ├── useFundPayroll.ts      # Write: fund payroll
│   │   │   ├── useExecuteCycle.ts     # Write: execute payment cycle
│   │   │   └── useReceipts.ts         # Read receipts/history
│   │   └── lib/
│   │       ├── utils.ts               # Formatting helpers
│   │       └── csv.ts                 # CSV generation
│   └── public/
│       └── favicon.ico
├── HSP_PAYROLL_HACKATHON_BUILD_SPEC.md
└── README.md
```

---

## Task 1: Hardhat Project Setup

**Files:**
- Create: `contracts/package.json`
- Create: `contracts/hardhat.config.ts`
- Create: `contracts/tsconfig.json`
- Create: `contracts/.env.example`
- Create: `contracts/.gitignore`

- [ ] **Step 1: Initialize Hardhat project**

```bash
cd /Users/rajkaria/Projects/hsp_payroll
mkdir -p contracts && cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox typescript ts-node @types/node dotenv @openzeppelin/contracts
npx hardhat init
# Choose: "Create a TypeScript project", say yes to all defaults
```

- [ ] **Step 2: Configure hardhat.config.ts for HashKey Chain**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hashkeyTestnet: {
      url: "https://testnet.hsk.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 133,
    },
    hashkeyMainnet: {
      url: "https://mainnet.hsk.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 177,
    },
  },
};

export default config;
```

- [ ] **Step 3: Create .env.example and .gitignore**

`.env.example`:
```
PRIVATE_KEY=your_private_key_here
```

`.gitignore`:
```
node_modules/
cache/
artifacts/
typechain-types/
.env
coverage/
coverage.json
```

- [ ] **Step 4: Verify setup compiles**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat compile
```

Expected: "Nothing to compile" or "Compiled 0 Solidity files" (no errors)

- [ ] **Step 5: Commit**

```bash
git add contracts/
git commit -m "feat: initialize Hardhat project with HashKey Chain config"
```

---

## Task 2: MockERC20 Token Contract

**Files:**
- Create: `contracts/contracts/MockERC20.sol`

We need a test ERC-20 token for testnet since there may not be USDT deployed there.

- [ ] **Step 1: Write MockERC20.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat compile
```

Expected: "Compiled 1 Solidity file successfully"

- [ ] **Step 3: Commit**

```bash
git add contracts/contracts/MockERC20.sol
git commit -m "feat: add MockERC20 token for testnet testing"
```

---

## Task 3: HSPAdapter Contract

**Files:**
- Create: `contracts/contracts/HSPAdapter.sol`
- Create: `contracts/test/HSPAdapter.test.ts`

The HSPAdapter is our implementation of the "HashKey Settlement Protocol" message layer. It handles payment request creation, confirmation, and receipt generation. It does NOT hold funds — it's purely a message/status coordination layer.

- [ ] **Step 1: Write HSPAdapter.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HSPAdapter — HashKey Settlement Protocol Adapter
 * @notice Message layer for payment request lifecycle: create → confirm → receipt
 * @dev Does NOT manage funds. Only orchestrates payment status and generates receipts.
 */
contract HSPAdapter {
    enum RequestStatus { Pending, Confirmed, Settled, Cancelled }

    struct PaymentRequest {
        bytes32 requestId;
        address payer;
        address recipient;
        address token;
        uint256 amount;
        RequestStatus status;
        uint256 createdAt;
        uint256 settledAt;
    }

    mapping(bytes32 => PaymentRequest) public requests;
    uint256 public requestCount;

    event PaymentRequestCreated(
        bytes32 indexed requestId,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 amount
    );
    event PaymentConfirmed(bytes32 indexed requestId);
    event PaymentSettled(bytes32 indexed requestId, uint256 timestamp);
    event PaymentCancelled(bytes32 indexed requestId);

    function createPaymentRequest(
        address payer,
        address recipient,
        address token,
        uint256 amount
    ) external returns (bytes32 requestId) {
        requestCount++;
        requestId = keccak256(
            abi.encodePacked(payer, recipient, token, amount, block.timestamp, requestCount)
        );

        requests[requestId] = PaymentRequest({
            requestId: requestId,
            payer: payer,
            recipient: recipient,
            token: token,
            amount: amount,
            status: RequestStatus.Pending,
            createdAt: block.timestamp,
            settledAt: 0
        });

        emit PaymentRequestCreated(requestId, payer, recipient, token, amount);
    }

    function confirmPayment(bytes32 requestId) external {
        PaymentRequest storage req = requests[requestId];
        require(req.createdAt != 0, "Request does not exist");
        require(req.status == RequestStatus.Pending, "Not pending");

        req.status = RequestStatus.Confirmed;
        emit PaymentConfirmed(requestId);
    }

    function markSettled(bytes32 requestId) external {
        PaymentRequest storage req = requests[requestId];
        require(req.createdAt != 0, "Request does not exist");
        require(
            req.status == RequestStatus.Confirmed || req.status == RequestStatus.Pending,
            "Cannot settle"
        );

        req.status = RequestStatus.Settled;
        req.settledAt = block.timestamp;
        emit PaymentSettled(requestId, block.timestamp);
    }

    function cancelPayment(bytes32 requestId) external {
        PaymentRequest storage req = requests[requestId];
        require(req.createdAt != 0, "Request does not exist");
        require(req.status == RequestStatus.Pending, "Can only cancel pending");

        req.status = RequestStatus.Cancelled;
        emit PaymentCancelled(requestId);
    }

    function getRequest(bytes32 requestId) external view returns (PaymentRequest memory) {
        require(requests[requestId].createdAt != 0, "Request does not exist");
        return requests[requestId];
    }

    function createBatchRequests(
        address payer,
        address[] calldata recipients,
        address token,
        uint256[] calldata amounts
    ) external returns (bytes32[] memory requestIds) {
        require(recipients.length == amounts.length, "Length mismatch");
        requestIds = new bytes32[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            requestCount++;
            bytes32 requestId = keccak256(
                abi.encodePacked(payer, recipients[i], token, amounts[i], block.timestamp, requestCount)
            );

            requests[requestId] = PaymentRequest({
                requestId: requestId,
                payer: payer,
                recipient: recipients[i],
                token: token,
                amount: amounts[i],
                status: RequestStatus.Pending,
                createdAt: block.timestamp,
                settledAt: 0
            });

            emit PaymentRequestCreated(requestId, payer, recipients[i], token, amounts[i]);
            requestIds[i] = requestId;
        }
    }
}
```

- [ ] **Step 2: Write HSPAdapter tests**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { HSPAdapter } from "../typechain-types";

describe("HSPAdapter", function () {
  let hsp: HSPAdapter;
  let payer: any, recipient1: any, recipient2: any;
  const TOKEN_ADDR = "0x0000000000000000000000000000000000000001"; // dummy

  beforeEach(async function () {
    [payer, recipient1, recipient2] = await ethers.getSigners();
    const HSPAdapter = await ethers.getContractFactory("HSPAdapter");
    hsp = await HSPAdapter.deploy();
  });

  describe("createPaymentRequest", function () {
    it("creates a request and emits event", async function () {
      const tx = await hsp.createPaymentRequest(
        payer.address, recipient1.address, TOKEN_ADDR, ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      const event = receipt?.logs[0];
      expect(event).to.not.be.undefined;
      expect(await hsp.requestCount()).to.equal(1);
    });

    it("sets status to Pending", async function () {
      const tx = await hsp.createPaymentRequest(
        payer.address, recipient1.address, TOKEN_ADDR, ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      // Get requestId from event
      const iface = hsp.interface;
      const log = receipt!.logs.find(l => {
        try { iface.parseLog({ topics: l.topics as string[], data: l.data }); return true; }
        catch { return false; }
      });
      const parsed = iface.parseLog({ topics: log!.topics as string[], data: log!.data });
      const requestId = parsed!.args[0];

      const req = await hsp.getRequest(requestId);
      expect(req.status).to.equal(0); // Pending
    });
  });

  describe("confirmPayment", function () {
    it("confirms a pending request", async function () {
      const tx = await hsp.createPaymentRequest(
        payer.address, recipient1.address, TOKEN_ADDR, ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      const iface = hsp.interface;
      const log = receipt!.logs.find(l => {
        try { iface.parseLog({ topics: l.topics as string[], data: l.data }); return true; }
        catch { return false; }
      });
      const parsed = iface.parseLog({ topics: log!.topics as string[], data: log!.data });
      const requestId = parsed!.args[0];

      await hsp.confirmPayment(requestId);
      const req = await hsp.getRequest(requestId);
      expect(req.status).to.equal(1); // Confirmed
    });
  });

  describe("markSettled", function () {
    it("settles a confirmed request", async function () {
      const tx = await hsp.createPaymentRequest(
        payer.address, recipient1.address, TOKEN_ADDR, ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      const iface = hsp.interface;
      const log = receipt!.logs.find(l => {
        try { iface.parseLog({ topics: l.topics as string[], data: l.data }); return true; }
        catch { return false; }
      });
      const parsed = iface.parseLog({ topics: log!.topics as string[], data: log!.data });
      const requestId = parsed!.args[0];

      await hsp.confirmPayment(requestId);
      await hsp.markSettled(requestId);

      const req = await hsp.getRequest(requestId);
      expect(req.status).to.equal(2); // Settled
      expect(req.settledAt).to.be.greaterThan(0);
    });
  });

  describe("createBatchRequests", function () {
    it("creates multiple requests at once", async function () {
      const tx = await hsp.createBatchRequests(
        payer.address,
        [recipient1.address, recipient2.address],
        TOKEN_ADDR,
        [ethers.parseEther("100"), ethers.parseEther("200")]
      );
      await tx.wait();
      expect(await hsp.requestCount()).to.equal(2);
    });

    it("reverts on length mismatch", async function () {
      await expect(
        hsp.createBatchRequests(
          payer.address,
          [recipient1.address, recipient2.address],
          TOKEN_ADDR,
          [ethers.parseEther("100")]
        )
      ).to.be.revertedWith("Length mismatch");
    });
  });

  describe("cancelPayment", function () {
    it("cancels a pending request", async function () {
      const tx = await hsp.createPaymentRequest(
        payer.address, recipient1.address, TOKEN_ADDR, ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      const iface = hsp.interface;
      const log = receipt!.logs.find(l => {
        try { iface.parseLog({ topics: l.topics as string[], data: l.data }); return true; }
        catch { return false; }
      });
      const parsed = iface.parseLog({ topics: log!.topics as string[], data: log!.data });
      const requestId = parsed!.args[0];

      await hsp.cancelPayment(requestId);
      const req = await hsp.getRequest(requestId);
      expect(req.status).to.equal(3); // Cancelled
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat test test/HSPAdapter.test.ts
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add contracts/contracts/HSPAdapter.sol contracts/test/HSPAdapter.test.ts
git commit -m "feat: add HSPAdapter settlement protocol message layer"
```

---

## Task 4: PayrollFactory Contract

**Files:**
- Create: `contracts/contracts/PayrollFactory.sol`
- Create: `contracts/test/PayrollFactory.test.ts`

This is the core contract — handles payroll creation, funding, cycle execution (via HSPAdapter), and receipt tracking.

- [ ] **Step 1: Write PayrollFactory.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./HSPAdapter.sol";

contract PayrollFactory {
    using SafeERC20 for IERC20;

    struct Payroll {
        address owner;
        address token;
        address[] recipients;
        uint256[] amounts;
        uint256 frequency;       // seconds between cycles
        uint256 startTime;
        uint256 lastExecuted;
        uint256 cycleCount;
        uint256 totalDeposited;
        uint256 totalPaid;
        bool active;
        string name;
    }

    struct Receipt {
        uint256 payrollId;
        uint256 cycleNumber;
        address recipient;
        uint256 amount;
        uint256 timestamp;
        bytes32 hspRequestId;
    }

    HSPAdapter public hspAdapter;
    uint256 public payrollCount;
    mapping(uint256 => Payroll) public payrolls;
    // payrollId => cycleNumber => receipts
    mapping(uint256 => mapping(uint256 => Receipt[])) public cycleReceipts;
    // recipient => payrollIds they are part of
    mapping(address => uint256[]) public recipientPayrolls;
    // payrollId => escrow balance
    mapping(uint256 => uint256) public escrowBalances;

    event PayrollCreated(uint256 indexed payrollId, address indexed owner, address token, string name);
    event PayrollFunded(uint256 indexed payrollId, uint256 amount, uint256 newBalance);
    event CycleExecuted(uint256 indexed payrollId, uint256 cycleNumber, uint256 totalPaid);
    event PaymentSettled(
        uint256 indexed payrollId,
        address indexed recipient,
        uint256 amount,
        bytes32 hspRequestId
    );
    event PayrollCancelled(uint256 indexed payrollId, uint256 refundedAmount);
    event RecipientAdded(uint256 indexed payrollId, address recipient, uint256 amount);
    event RecipientRemoved(uint256 indexed payrollId, address recipient);
    event FundsWithdrawn(uint256 indexed payrollId, uint256 amount);

    constructor(address _hspAdapter) {
        hspAdapter = HSPAdapter(_hspAdapter);
    }

    modifier onlyPayrollOwner(uint256 payrollId) {
        require(payrolls[payrollId].owner == msg.sender, "Not payroll owner");
        _;
    }

    function createPayroll(
        string calldata name,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 frequency
    ) external returns (uint256 payrollId) {
        require(recipients.length > 0, "No recipients");
        require(recipients.length == amounts.length, "Length mismatch");
        require(frequency >= 60, "Frequency too short"); // min 1 minute for testing

        payrollCount++;
        payrollId = payrollCount;

        Payroll storage p = payrolls[payrollId];
        p.owner = msg.sender;
        p.token = token;
        p.recipients = recipients;
        p.amounts = amounts;
        p.frequency = frequency;
        p.startTime = block.timestamp;
        p.lastExecuted = 0;
        p.cycleCount = 0;
        p.totalDeposited = 0;
        p.totalPaid = 0;
        p.active = true;
        p.name = name;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Zero address recipient");
            require(amounts[i] > 0, "Zero amount");
            recipientPayrolls[recipients[i]].push(payrollId);
        }

        emit PayrollCreated(payrollId, msg.sender, token, name);
    }

    function fundPayroll(uint256 payrollId, uint256 amount) external onlyPayrollOwner(payrollId) {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");

        IERC20(p.token).safeTransferFrom(msg.sender, address(this), amount);
        escrowBalances[payrollId] += amount;
        p.totalDeposited += amount;

        emit PayrollFunded(payrollId, amount, escrowBalances[payrollId]);
    }

    function executeCycle(uint256 payrollId) external onlyPayrollOwner(payrollId) {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");
        if (p.lastExecuted > 0) {
            require(
                block.timestamp >= p.lastExecuted + p.frequency,
                "Too early for next cycle"
            );
        }

        uint256 cycleCost = _getCycleCost(payrollId);
        require(escrowBalances[payrollId] >= cycleCost, "Insufficient escrow balance");

        p.cycleCount++;
        uint256 cycleNumber = p.cycleCount;

        // Create batch HSP payment requests
        bytes32[] memory requestIds = hspAdapter.createBatchRequests(
            msg.sender,
            p.recipients,
            p.token,
            p.amounts
        );

        // Execute transfers and record receipts
        for (uint256 i = 0; i < p.recipients.length; i++) {
            IERC20(p.token).safeTransfer(p.recipients[i], p.amounts[i]);

            // Mark settled in HSP
            hspAdapter.confirmPayment(requestIds[i]);
            hspAdapter.markSettled(requestIds[i]);

            // Store receipt
            cycleReceipts[payrollId][cycleNumber].push(Receipt({
                payrollId: payrollId,
                cycleNumber: cycleNumber,
                recipient: p.recipients[i],
                amount: p.amounts[i],
                timestamp: block.timestamp,
                hspRequestId: requestIds[i]
            }));

            emit PaymentSettled(payrollId, p.recipients[i], p.amounts[i], requestIds[i]);
        }

        escrowBalances[payrollId] -= cycleCost;
        p.totalPaid += cycleCost;
        p.lastExecuted = block.timestamp;

        emit CycleExecuted(payrollId, cycleNumber, cycleCost);
    }

    function cancelPayroll(uint256 payrollId) external onlyPayrollOwner(payrollId) {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Already cancelled");

        p.active = false;
        uint256 refund = escrowBalances[payrollId];
        if (refund > 0) {
            escrowBalances[payrollId] = 0;
            IERC20(p.token).safeTransfer(msg.sender, refund);
        }

        emit PayrollCancelled(payrollId, refund);
    }

    function withdrawExcess(uint256 payrollId, uint256 amount) external onlyPayrollOwner(payrollId) {
        require(escrowBalances[payrollId] >= amount, "Insufficient balance");
        escrowBalances[payrollId] -= amount;
        IERC20(payrolls[payrollId].token).safeTransfer(msg.sender, amount);
        emit FundsWithdrawn(payrollId, amount);
    }

    function addRecipient(
        uint256 payrollId,
        address recipient,
        uint256 amount
    ) external onlyPayrollOwner(payrollId) {
        require(recipient != address(0), "Zero address");
        require(amount > 0, "Zero amount");
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");

        p.recipients.push(recipient);
        p.amounts.push(amount);
        recipientPayrolls[recipient].push(payrollId);

        emit RecipientAdded(payrollId, recipient, amount);
    }

    function removeRecipient(
        uint256 payrollId,
        uint256 recipientIndex
    ) external onlyPayrollOwner(payrollId) {
        Payroll storage p = payrolls[payrollId];
        require(p.active, "Payroll not active");
        require(recipientIndex < p.recipients.length, "Index out of bounds");

        address removed = p.recipients[recipientIndex];

        // Swap and pop
        p.recipients[recipientIndex] = p.recipients[p.recipients.length - 1];
        p.recipients.pop();
        p.amounts[recipientIndex] = p.amounts[p.amounts.length - 1];
        p.amounts.pop();

        emit RecipientRemoved(payrollId, removed);
    }

    // === View Functions ===

    function getPayrollDetails(uint256 payrollId)
        external view returns (
            address owner, address token, string memory name,
            address[] memory recipients, uint256[] memory amounts,
            uint256 frequency, uint256 startTime, uint256 lastExecuted,
            uint256 cycleCount, uint256 totalDeposited, uint256 totalPaid,
            bool active
        )
    {
        Payroll storage p = payrolls[payrollId];
        return (
            p.owner, p.token, p.name, p.recipients, p.amounts,
            p.frequency, p.startTime, p.lastExecuted,
            p.cycleCount, p.totalDeposited, p.totalPaid, p.active
        );
    }

    function getReceipts(uint256 payrollId, uint256 cycleNumber)
        external view returns (Receipt[] memory)
    {
        return cycleReceipts[payrollId][cycleNumber];
    }

    function getRunway(uint256 payrollId) external view returns (uint256 cyclesRemaining) {
        uint256 cycleCost = _getCycleCost(payrollId);
        if (cycleCost == 0) return 0;
        return escrowBalances[payrollId] / cycleCost;
    }

    function getRecipientPayrolls(address recipient) external view returns (uint256[] memory) {
        return recipientPayrolls[recipient];
    }

    function _getCycleCost(uint256 payrollId) internal view returns (uint256 total) {
        Payroll storage p = payrolls[payrollId];
        for (uint256 i = 0; i < p.amounts.length; i++) {
            total += p.amounts[i];
        }
    }
}
```

- [ ] **Step 2: Write PayrollFactory tests**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { PayrollFactory, HSPAdapter, MockERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PayrollFactory", function () {
  let factory: PayrollFactory;
  let hsp: HSPAdapter;
  let token: MockERC20;
  let owner: any, recipient1: any, recipient2: any, recipient3: any;

  const MONTHLY = 30 * 24 * 60 * 60; // 30 days in seconds
  const AMOUNT_1 = ethers.parseUnits("1000", 6); // 1000 USDT
  const AMOUNT_2 = ethers.parseUnits("2000", 6);
  const FUND_AMOUNT = ethers.parseUnits("10000", 6);

  beforeEach(async function () {
    [owner, recipient1, recipient2, recipient3] = await ethers.getSigners();

    // Deploy HSPAdapter
    const HSP = await ethers.getContractFactory("HSPAdapter");
    hsp = await HSP.deploy();

    // Deploy MockERC20
    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock USDT", "USDT", 6);

    // Deploy PayrollFactory
    const Factory = await ethers.getContractFactory("PayrollFactory");
    factory = await Factory.deploy(await hsp.getAddress());

    // Mint tokens to owner
    await token.mint(owner.address, ethers.parseUnits("100000", 6));
    // Approve factory to spend
    await token.approve(await factory.getAddress(), ethers.MaxUint256);
  });

  describe("createPayroll", function () {
    it("creates a payroll with correct details", async function () {
      await factory.createPayroll(
        "Team Alpha",
        await token.getAddress(),
        [recipient1.address, recipient2.address],
        [AMOUNT_1, AMOUNT_2],
        MONTHLY
      );

      expect(await factory.payrollCount()).to.equal(1);
      const details = await factory.getPayrollDetails(1);
      expect(details.owner).to.equal(owner.address);
      expect(details.name).to.equal("Team Alpha");
      expect(details.recipients.length).to.equal(2);
      expect(details.active).to.be.true;
    });

    it("reverts with no recipients", async function () {
      await expect(
        factory.createPayroll("Empty", await token.getAddress(), [], [], MONTHLY)
      ).to.be.revertedWith("No recipients");
    });

    it("reverts with mismatched lengths", async function () {
      await expect(
        factory.createPayroll(
          "Bad", await token.getAddress(),
          [recipient1.address], [AMOUNT_1, AMOUNT_2], MONTHLY
        )
      ).to.be.revertedWith("Length mismatch");
    });
  });

  describe("fundPayroll", function () {
    beforeEach(async function () {
      await factory.createPayroll(
        "Test", await token.getAddress(),
        [recipient1.address], [AMOUNT_1], MONTHLY
      );
    });

    it("accepts funds and updates escrow balance", async function () {
      await factory.fundPayroll(1, FUND_AMOUNT);
      expect(await factory.escrowBalances(1)).to.equal(FUND_AMOUNT);
    });

    it("transfers tokens from owner to contract", async function () {
      const balBefore = await token.balanceOf(owner.address);
      await factory.fundPayroll(1, FUND_AMOUNT);
      const balAfter = await token.balanceOf(owner.address);
      expect(balBefore - balAfter).to.equal(FUND_AMOUNT);
    });
  });

  describe("executeCycle", function () {
    beforeEach(async function () {
      await factory.createPayroll(
        "Test", await token.getAddress(),
        [recipient1.address, recipient2.address], [AMOUNT_1, AMOUNT_2], MONTHLY
      );
      await factory.fundPayroll(1, FUND_AMOUNT);
    });

    it("pays all recipients and creates receipts", async function () {
      await factory.executeCycle(1);

      expect(await token.balanceOf(recipient1.address)).to.equal(AMOUNT_1);
      expect(await token.balanceOf(recipient2.address)).to.equal(AMOUNT_2);

      const receipts = await factory.getReceipts(1, 1);
      expect(receipts.length).to.equal(2);
    });

    it("updates escrow balance after payment", async function () {
      await factory.executeCycle(1);
      const cycleCost = AMOUNT_1 + AMOUNT_2;
      expect(await factory.escrowBalances(1)).to.equal(FUND_AMOUNT - cycleCost);
    });

    it("reverts if executed too early", async function () {
      await factory.executeCycle(1);
      await expect(factory.executeCycle(1)).to.be.revertedWith("Too early for next cycle");
    });

    it("allows execution after frequency period", async function () {
      await factory.executeCycle(1);
      await time.increase(MONTHLY);
      await factory.executeCycle(1);

      const details = await factory.getPayrollDetails(1);
      expect(details.cycleCount).to.equal(2);
    });

    it("reverts with insufficient escrow", async function () {
      // Execute until funds run out (fund=10000, cost=3000/cycle => 3 cycles, 4th fails)
      await factory.executeCycle(1);
      await time.increase(MONTHLY);
      await factory.executeCycle(1);
      await time.increase(MONTHLY);
      await factory.executeCycle(1);
      await time.increase(MONTHLY);
      await expect(factory.executeCycle(1)).to.be.revertedWith("Insufficient escrow balance");
    });
  });

  describe("cancelPayroll", function () {
    it("refunds remaining escrow on cancel", async function () {
      await factory.createPayroll(
        "Test", await token.getAddress(),
        [recipient1.address], [AMOUNT_1], MONTHLY
      );
      await factory.fundPayroll(1, FUND_AMOUNT);
      await factory.executeCycle(1);

      const balBefore = await token.balanceOf(owner.address);
      await factory.cancelPayroll(1);
      const balAfter = await token.balanceOf(owner.address);

      expect(balAfter - balBefore).to.equal(FUND_AMOUNT - AMOUNT_1);
      const details = await factory.getPayrollDetails(1);
      expect(details.active).to.be.false;
    });
  });

  describe("getRunway", function () {
    it("calculates remaining cycles correctly", async function () {
      await factory.createPayroll(
        "Test", await token.getAddress(),
        [recipient1.address, recipient2.address], [AMOUNT_1, AMOUNT_2], MONTHLY
      );
      await factory.fundPayroll(1, FUND_AMOUNT);
      // cycleCost = 3000, fund = 10000, runway = 3
      expect(await factory.getRunway(1)).to.equal(3);
    });
  });

  describe("addRecipient / removeRecipient", function () {
    beforeEach(async function () {
      await factory.createPayroll(
        "Test", await token.getAddress(),
        [recipient1.address], [AMOUNT_1], MONTHLY
      );
    });

    it("adds a new recipient", async function () {
      await factory.addRecipient(1, recipient2.address, AMOUNT_2);
      const details = await factory.getPayrollDetails(1);
      expect(details.recipients.length).to.equal(2);
    });

    it("removes a recipient", async function () {
      await factory.addRecipient(1, recipient2.address, AMOUNT_2);
      await factory.removeRecipient(1, 0);
      const details = await factory.getPayrollDetails(1);
      expect(details.recipients.length).to.equal(1);
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat test
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add contracts/contracts/PayrollFactory.sol contracts/test/PayrollFactory.test.ts
git commit -m "feat: add PayrollFactory contract with escrow and HSP integration"
```

---

## Task 5: Deploy Script + Testnet Deployment

**Files:**
- Create: `contracts/scripts/deploy.ts`

- [ ] **Step 1: Write deploy script**

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // Deploy HSPAdapter
  const HSPAdapter = await ethers.getContractFactory("HSPAdapter");
  const hsp = await HSPAdapter.deploy();
  await hsp.waitForDeployment();
  console.log("HSPAdapter deployed to:", await hsp.getAddress());

  // Deploy PayrollFactory
  const PayrollFactory = await ethers.getContractFactory("PayrollFactory");
  const factory = await PayrollFactory.deploy(await hsp.getAddress());
  await factory.waitForDeployment();
  console.log("PayrollFactory deployed to:", await factory.getAddress());

  // Deploy MockERC20 (for testnet)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
  await usdt.waitForDeployment();
  console.log("MockUSDT deployed to:", await usdt.getAddress());

  console.log("\n=== Deployment Complete ===");
  console.log("Copy these to frontend/src/config/contracts.ts:");
  console.log(`HSP_ADAPTER_ADDRESS: "${await hsp.getAddress()}"`);
  console.log(`PAYROLL_FACTORY_ADDRESS: "${await factory.getAddress()}"`);
  console.log(`MOCK_USDT_ADDRESS: "${await usdt.getAddress()}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Test deploy locally**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat run scripts/deploy.ts
```

Expected: All 3 contracts deploy to local Hardhat network with addresses printed

- [ ] **Step 3: Commit**

```bash
git add contracts/scripts/deploy.ts
git commit -m "feat: add deployment script for all contracts"
```

- [ ] **Step 4: Deploy to HashKey Chain testnet (when PRIVATE_KEY is set)**

```bash
# User must first: get testnet HSK from faucet, add PRIVATE_KEY to .env
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat run scripts/deploy.ts --network hashkeyTestnet
```

Note: This step requires the user to have testnet HSK. Save the deployed addresses for Task 8.

---

## Task 6: Next.js Frontend Setup

**Files:**
- Create: `frontend/` (via create-next-app)
- Modify: `frontend/package.json` (add deps)
- Create: `frontend/src/config/wagmi.ts`
- Create: `frontend/src/components/providers.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/rajkaria/Projects/hsp_payroll
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Install Web3 + UI dependencies**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/frontend
npm install wagmi viem@2.x @tanstack/react-query @rainbow-me/rainbowkit
npx shadcn@latest init -d
npx shadcn@latest add button card dialog input label select table tabs badge separator toast
```

- [ ] **Step 3: Create wagmi config with HashKey Chain**

Write `frontend/src/config/wagmi.ts`:

```typescript
import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://testnet-explorer.hsk.xyz" },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "HSP Payroll",
  projectId: "hsp-payroll-demo", // WalletConnect project ID (get from cloud.walletconnect.com)
  chains: [hashkeyTestnet],
  ssr: true,
});
```

- [ ] **Step 4: Create providers component**

Write `frontend/src/components/providers.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: "#1E5EFF",
          borderRadius: "medium",
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 5: Update layout.tsx**

Replace `frontend/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "HSP Payroll — On-Chain Recurring Payments",
  description: "On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-[#0A0E1A] text-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Update globals.css for dark theme**

Replace `frontend/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #1E5EFF;
  --background: #0A0E1A;
  --surface: #111827;
  --border: #1F2937;
  --text: #F9FAFB;
  --text-secondary: #9CA3AF;
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
}

body {
  background: var(--background);
  color: var(--text);
}
```

- [ ] **Step 7: Verify it runs**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/frontend
npm run dev
```

Expected: Next.js starts on localhost:3000 without errors

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js frontend with wagmi, RainbowKit, shadcn/ui"
```

---

## Task 7: Contract Config + ABIs for Frontend

**Files:**
- Create: `frontend/src/config/contracts.ts`

- [ ] **Step 1: Copy ABIs from Hardhat artifacts and create contracts config**

After contracts are compiled (Task 4), extract the ABIs:

```bash
cd /Users/rajkaria/Projects/hsp_payroll/contracts
npx hardhat compile
```

Write `frontend/src/config/contracts.ts`:

```typescript
// Contract addresses — update after deployment to HashKey Chain testnet
export const CONTRACTS = {
  HSP_ADAPTER: "0x...", // TODO: fill after deploy
  PAYROLL_FACTORY: "0x...", // TODO: fill after deploy
  MOCK_USDT: "0x...", // TODO: fill after deploy
} as const;

// ABIs — extracted from Hardhat artifacts
// After compiling contracts, copy the relevant ABI arrays from:
// contracts/artifacts/contracts/PayrollFactory.sol/PayrollFactory.json
// contracts/artifacts/contracts/HSPAdapter.sol/HSPAdapter.json
// contracts/artifacts/contracts/MockERC20.sol/MockERC20.json

export const PAYROLL_FACTORY_ABI = [
  // createPayroll
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "frequency", type: "uint256" },
    ],
    name: "createPayroll",
    outputs: [{ name: "payrollId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // fundPayroll
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "fundPayroll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // executeCycle
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "executeCycle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // cancelPayroll
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "cancelPayroll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // withdrawExcess
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "withdrawExcess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // addRecipient
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "addRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // removeRecipient
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipientIndex", type: "uint256" },
    ],
    name: "removeRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // getPayrollDetails (view)
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "getPayrollDetails",
    outputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "name", type: "string" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "frequency", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "lastExecuted", type: "uint256" },
      { name: "cycleCount", type: "uint256" },
      { name: "totalDeposited", type: "uint256" },
      { name: "totalPaid", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    name: "getPayrollDetails",
    stateMutability: "view",
    type: "function",
  },
  // getReceipts (view)
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "cycleNumber", type: "uint256" },
    ],
    name: "getReceipts",
    outputs: [
      {
        components: [
          { name: "payrollId", type: "uint256" },
          { name: "cycleNumber", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "hspRequestId", type: "bytes32" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // getRunway (view)
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "getRunway",
    outputs: [{ name: "cyclesRemaining", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // payrollCount (view)
  {
    inputs: [],
    name: "payrollCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // escrowBalances (view)
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "escrowBalances",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // getRecipientPayrolls (view)
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "getRecipientPayrolls",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "name", type: "string" },
    ],
    name: "PayrollCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "newBalance", type: "uint256" },
    ],
    name: "PayrollFunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: false, name: "cycleNumber", type: "uint256" },
      { indexed: false, name: "totalPaid", type: "uint256" },
    ],
    name: "CycleExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "hspRequestId", type: "bytes32" },
    ],
    name: "PaymentSettled",
    type: "event",
  },
] as const;

export const MOCK_ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/config/contracts.ts
git commit -m "feat: add contract ABIs and address config for frontend"
```

---

## Task 8: Landing Page + Connect Wallet

**Files:**
- Create: `frontend/src/components/connect-button.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create connect button wrapper**

Write `frontend/src/components/connect-button.tsx`:

```tsx
"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectButton() {
  return (
    <RainbowConnectButton
      showBalance={true}
      chainStatus="icon"
      accountStatus="address"
    />
  );
}
```

- [ ] **Step 2: Build landing page**

Replace `frontend/src/app/page.tsx`:

```tsx
"use client";

import { ConnectButton } from "@/components/connect-button";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useReadContract } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

export default function Home() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  // Check if wallet owns any payrolls (employer) or is recipient of any (employee)
  const { data: recipientPayrolls } = useReadContract({
    address: CONTRACTS.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRecipientPayrolls",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-2xl">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-bold mb-4">
          HSP <span className="text-[#1E5EFF]">Payroll</span>
        </h1>
        <p className="text-[#9CA3AF] text-lg mb-2">
          On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers
        </p>
        <p className="text-[#9CA3AF] text-sm mb-8">
          Powered by HashKey Settlement Protocol on HashKey Chain
        </p>

        <div className="flex justify-center mb-8">
          <ConnectButton />
        </div>

        {isConnected && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/employer")}
              className="px-6 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition"
            >
              Employer Dashboard
            </button>
            <button
              onClick={() => router.push("/employee")}
              className="px-6 py-3 bg-[#111827] text-white rounded-lg font-medium border border-[#1F2937] hover:bg-[#1F2937] transition"
            >
              Employee Dashboard
            </button>
          </div>
        )}

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-[#1E5EFF]">HSP</div>
            <div className="text-sm text-[#9CA3AF]">Settlement Protocol</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#10B981]">On-Chain</div>
            <div className="text-sm text-[#9CA3AF]">Receipts & Audit Trail</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F59E0B]">Automated</div>
            <div className="text-sm text-[#9CA3AF]">Recurring Payments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify page renders**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/frontend
npm run dev
```

Visit localhost:3000 — should see landing page with connect button

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/connect-button.tsx frontend/src/app/page.tsx
git commit -m "feat: add landing page with wallet connect and role selection"
```

---

## Task 9: Employer Dashboard + Hooks

**Files:**
- Create: `frontend/src/hooks/usePayrolls.ts`
- Create: `frontend/src/hooks/useExecuteCycle.ts`
- Create: `frontend/src/components/payroll-card.tsx`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/app/employer/page.tsx`

- [ ] **Step 1: Create utility helpers**

Write `frontend/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionStr ? `${whole}.${fractionStr}` : whole.toString();
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function frequencyToLabel(seconds: number): string {
  if (seconds <= 604800) return "Weekly";
  if (seconds <= 1209600) return "Biweekly";
  if (seconds <= 2592000) return "Monthly";
  return `Every ${Math.floor(seconds / 86400)} days`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
```

- [ ] **Step 2: Create usePayrolls hook**

Write `frontend/src/hooks/usePayrolls.ts`:

```typescript
"use client";

import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

const factoryAddress = CONTRACTS.PAYROLL_FACTORY as `0x${string}`;

export function usePayrollCount() {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "payrollCount",
  });
}

export function usePayrollDetails(payrollId: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getPayrollDetails",
    args: [payrollId],
  });
}

export function useEscrowBalance(payrollId: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "escrowBalances",
    args: [payrollId],
  });
}

export function useRunway(payrollId: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRunway",
    args: [payrollId],
  });
}

export function useRecipientPayrolls(address: `0x${string}` | undefined) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRecipientPayrolls",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useReceipts(payrollId: bigint, cycleNumber: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getReceipts",
    args: [payrollId, cycleNumber],
    query: { enabled: cycleNumber > 0n },
  });
}
```

- [ ] **Step 3: Create useExecuteCycle hook**

Write `frontend/src/hooks/useExecuteCycle.ts`:

```typescript
"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

export function useExecuteCycle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function execute(payrollId: bigint) {
    writeContract({
      address: CONTRACTS.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "executeCycle",
      args: [payrollId],
    });
  }

  return { execute, hash, isPending, isConfirming, isSuccess, error };
}
```

- [ ] **Step 4: Create payroll card component**

Write `frontend/src/components/payroll-card.tsx`:

```tsx
"use client";

import { usePayrollDetails, useEscrowBalance, useRunway } from "@/hooks/usePayrolls";
import { useExecuteCycle } from "@/hooks/useExecuteCycle";
import { formatAmount, frequencyToLabel, formatDate, shortenAddress } from "@/lib/utils";

interface PayrollCardProps {
  payrollId: bigint;
}

export function PayrollCard({ payrollId }: PayrollCardProps) {
  const { data: details, isLoading } = usePayrollDetails(payrollId);
  const { data: escrow } = useEscrowBalance(payrollId);
  const { data: runway } = useRunway(payrollId);
  const { execute, isPending, isConfirming, isSuccess } = useExecuteCycle();

  if (isLoading || !details) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-[#1F2937] rounded w-1/3 mb-4" />
        <div className="h-4 bg-[#1F2937] rounded w-2/3" />
      </div>
    );
  }

  const [owner, token, name, recipients, amounts, frequency, startTime, lastExecuted, cycleCount, totalDeposited, totalPaid, active] = details;

  const totalPerCycle = amounts.reduce((a: bigint, b: bigint) => a + b, 0n);
  const nextCycleTime = lastExecuted > 0n
    ? Number(lastExecuted + frequency)
    : Number(startTime);

  const canExecute = active && Date.now() / 1000 >= nextCycleTime;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
            {name}
          </h3>
          <span className={`text-xs px-2 py-1 rounded ${active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}`}>
            {active ? "Active" : "Cancelled"}
          </span>
        </div>
        <div className="text-right text-sm text-[#9CA3AF]">
          {frequencyToLabel(Number(frequency))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-[#9CA3AF]">Recipients</div>
          <div className="font-medium">{recipients.length}</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Per Cycle</div>
          <div className="font-medium">{formatAmount(totalPerCycle)} USDT</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Escrow Balance</div>
          <div className="font-medium">{escrow !== undefined ? formatAmount(escrow) : "..."} USDT</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Runway</div>
          <div className="font-medium">{runway?.toString() ?? "..."} cycles</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Cycles Completed</div>
          <div className="font-medium">{cycleCount.toString()}</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Total Paid</div>
          <div className="font-medium">{formatAmount(totalPaid)} USDT</div>
        </div>
      </div>

      {active && (
        <div className="flex gap-2">
          <button
            onClick={() => execute(payrollId)}
            disabled={!canExecute || isPending || isConfirming}
            className="flex-1 px-4 py-2 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Confirming..." : isConfirming ? "Executing..." : isSuccess ? "Executed!" : "Execute Cycle"}
          </button>
        </div>
      )}

      {lastExecuted > 0n && (
        <div className="mt-3 text-xs text-[#9CA3AF]">
          Last executed: {formatDate(Number(lastExecuted))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create employer dashboard page**

Write `frontend/src/app/employer/page.tsx`:

```tsx
"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/connect-button";
import { PayrollCard } from "@/components/payroll-card";
import { usePayrollCount } from "@/hooks/usePayrolls";
import { useReadContract } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

export default function EmployerDashboard() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { data: payrollCount } = usePayrollCount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-[#9CA3AF]">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  // For now, show all payrolls (filter by owner in a real app)
  const count = payrollCount ? Number(payrollCount) : 0;
  const payrollIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Employer Dashboard
          </h1>
          <p className="text-[#9CA3AF] mt-1">Manage your on-chain payrolls</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => router.push("/employer/create")}
            className="px-4 py-2 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition"
          >
            + Create Payroll
          </button>
          <ConnectButton />
        </div>
      </div>

      {count === 0 ? (
        <div className="text-center py-20">
          <div className="text-[#9CA3AF] text-lg mb-4">No payrolls yet</div>
          <button
            onClick={() => router.push("/employer/create")}
            className="px-6 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition"
          >
            Create Your First Payroll
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {payrollIds.map((id) => (
            <PayrollCard key={id.toString()} payrollId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify it renders**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/frontend
npm run dev
```

Visit localhost:3000/employer — should render the dashboard

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/ frontend/src/components/payroll-card.tsx frontend/src/app/employer/page.tsx frontend/src/lib/utils.ts
git commit -m "feat: add employer dashboard with payroll cards and hooks"
```

---

## Task 10: Create Payroll Form

**Files:**
- Create: `frontend/src/hooks/useCreatePayroll.ts`
- Create: `frontend/src/hooks/useFundPayroll.ts`
- Create: `frontend/src/components/create-payroll-form.tsx`
- Create: `frontend/src/app/employer/create/page.tsx`

- [ ] **Step 1: Create useCreatePayroll hook**

Write `frontend/src/hooks/useCreatePayroll.ts`:

```typescript
"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

export function useCreatePayroll() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function create(
    name: string,
    token: `0x${string}`,
    recipients: `0x${string}`[],
    amounts: bigint[],
    frequency: bigint
  ) {
    writeContract({
      address: CONTRACTS.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "createPayroll",
      args: [name, token, recipients, amounts, frequency],
    });
  }

  return { create, hash, isPending, isConfirming, isSuccess, error };
}
```

- [ ] **Step 2: Create useFundPayroll hook**

Write `frontend/src/hooks/useFundPayroll.ts`:

```typescript
"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI, MOCK_ERC20_ABI } from "@/config/contracts";

export function useFundPayroll() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function fund(payrollId: bigint, amount: bigint) {
    writeContract({
      address: CONTRACTS.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "fundPayroll",
      args: [payrollId, amount],
    });
  }

  return { fund, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function approve(token: `0x${string}`, amount: bigint) {
    writeContract({
      address: token,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.PAYROLL_FACTORY as `0x${string}`, amount],
    });
  }

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
```

- [ ] **Step 3: Create the multi-step form component**

Write `frontend/src/components/create-payroll-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useCreatePayroll } from "@/hooks/useCreatePayroll";
import { useApproveToken, useFundPayroll } from "@/hooks/useFundPayroll";
import { CONTRACTS } from "@/config/contracts";
import { parseUnits } from "viem";
import { useRouter } from "next/navigation";

const FREQUENCIES = [
  { label: "Weekly", value: 604800 },
  { label: "Biweekly", value: 1209600 },
  { label: "Monthly", value: 2592000 },
  { label: "Test (5 min)", value: 300 },
];

interface Recipient {
  address: string;
  amount: string;
}

export function CreatePayrollForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(2592000);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: "", amount: "" },
  ]);
  const [fundAmount, setFundAmount] = useState("");

  const { create, isPending: isCreating, isConfirming: isCreatingConfirm, isSuccess: createSuccess } = useCreatePayroll();
  const { approve, isPending: isApproving, isConfirming: isApprovingConfirm, isSuccess: approveSuccess } = useApproveToken();
  const { fund, isPending: isFunding, isConfirming: isFundingConfirm, isSuccess: fundSuccess } = useFundPayroll();

  const addRecipient = () => setRecipients([...recipients, { address: "", amount: "" }]);
  const removeRecipient = (index: number) => setRecipients(recipients.filter((_, i) => i !== index));
  const updateRecipient = (index: number, field: "address" | "amount", value: string) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const totalPerCycle = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const handleCreate = () => {
    const addrs = recipients.map((r) => r.address as `0x${string}`);
    const amts = recipients.map((r) => parseUnits(r.amount, 6));
    create(name, CONTRACTS.MOCK_USDT as `0x${string}`, addrs, amts, BigInt(frequency));
  };

  const handleApprove = () => {
    approve(CONTRACTS.MOCK_USDT as `0x${string}`, parseUnits(fundAmount, 6));
  };

  const handleFund = () => {
    // Assumes payroll was just created as the latest one
    // In production, you'd get the payrollId from the creation event
    fund(1n, parseUnits(fundAmount, 6));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded ${s <= step ? "bg-[#1E5EFF]" : "bg-[#1F2937]"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Payroll Details
          </h2>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Payroll Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Alpha Monthly"
              className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white focus:border-[#1E5EFF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Token</label>
            <div className="px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white">
              Mock USDT (Testnet)
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    frequency === f.value
                      ? "bg-[#1E5EFF] text-white"
                      : "bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:border-[#1E5EFF]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!name}
            className="w-full px-4 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50"
          >
            Next: Add Recipients
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Add Recipients
          </h2>

          {recipients.map((r, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={r.address}
                  onChange={(e) => updateRecipient(i, "address", e.target.value)}
                  placeholder="0x... wallet address"
                  className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white text-sm focus:border-[#1E5EFF] focus:outline-none"
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  value={r.amount}
                  onChange={(e) => updateRecipient(i, "amount", e.target.value)}
                  placeholder="Amount"
                  className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white text-sm focus:border-[#1E5EFF] focus:outline-none"
                />
              </div>
              {recipients.length > 1 && (
                <button
                  onClick={() => removeRecipient(i)}
                  className="px-3 py-3 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg"
                >
                  X
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addRecipient}
            className="text-[#1E5EFF] text-sm font-medium hover:underline"
          >
            + Add another recipient
          </button>

          <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-lg">
            <div className="text-sm text-[#9CA3AF]">Total per cycle</div>
            <div className="text-xl font-bold">{totalPerCycle.toLocaleString()} USDT</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-3 bg-[#111827] border border-[#1F2937] text-white rounded-lg font-medium hover:bg-[#1F2937] transition"
            >
              Back
            </button>
            <button
              onClick={() => { handleCreate(); setStep(3); }}
              disabled={recipients.some((r) => !r.address || !r.amount)}
              className="flex-1 px-4 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50"
            >
              {isCreating ? "Confirm in wallet..." : "Create Payroll"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Fund Escrow
          </h2>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Deposit Amount (USDT)</label>
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="e.g., 10000"
              className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white focus:border-[#1E5EFF] focus:outline-none"
            />
            {totalPerCycle > 0 && fundAmount && (
              <div className="mt-2 text-sm text-[#9CA3AF]">
                Runway: ~{Math.floor(parseFloat(fundAmount) / totalPerCycle)} cycles
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleApprove}
              disabled={!fundAmount || isApproving || isApprovingConfirm}
              className="w-full px-4 py-3 bg-[#111827] border border-[#1E5EFF] text-[#1E5EFF] rounded-lg font-medium hover:bg-[#1E5EFF]/10 transition disabled:opacity-50"
            >
              {isApproving ? "Confirm in wallet..." : isApprovingConfirm ? "Approving..." : approveSuccess ? "Approved!" : "Step 1: Approve USDT"}
            </button>
            <button
              onClick={handleFund}
              disabled={!approveSuccess || isFunding || isFundingConfirm}
              className="w-full px-4 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50"
            >
              {isFunding ? "Confirm in wallet..." : isFundingConfirm ? "Depositing..." : fundSuccess ? "Funded!" : "Step 2: Fund Payroll"}
            </button>
          </div>

          {fundSuccess && (
            <button
              onClick={() => router.push("/employer")}
              className="w-full px-4 py-3 bg-[#10B981] text-white rounded-lg font-medium hover:bg-[#10B981]/90 transition"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the page**

Write `frontend/src/app/employer/create/page.tsx`:

```tsx
"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { CreatePayrollForm } from "@/components/create-payroll-form";

export default function CreatePayrollPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-[#9CA3AF]">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)] mb-8">
        Create New Payroll
      </h1>
      <CreatePayrollForm />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/frontend
npm run dev
```

Visit localhost:3000/employer/create — should see the multi-step form

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useCreatePayroll.ts frontend/src/hooks/useFundPayroll.ts frontend/src/components/create-payroll-form.tsx frontend/src/app/employer/create/
git commit -m "feat: add create payroll multi-step form with approve + fund flow"
```

---

## Task 11: Employee Dashboard

**Files:**
- Create: `frontend/src/components/payment-history.tsx`
- Create: `frontend/src/app/employee/page.tsx`
- Create: `frontend/src/hooks/useReceipts.ts`
- Create: `frontend/src/lib/csv.ts`
- Create: `frontend/src/components/csv-export.tsx`

- [ ] **Step 1: Create CSV utility**

Write `frontend/src/lib/csv.ts`:

```typescript
interface ReceiptRow {
  date: string;
  amount: string;
  token: string;
  payrollName: string;
  cycle: number;
  txHash: string;
}

export function generateCSV(rows: ReceiptRow[]): string {
  const header = "Date,Amount,Token,Payroll,Cycle,Transaction Hash\n";
  const body = rows
    .map((r) => `${r.date},${r.amount},${r.token},${r.payrollName},${r.cycle},${r.txHash}`)
    .join("\n");
  return header + body;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create CSV export button**

Write `frontend/src/components/csv-export.tsx`:

```tsx
"use client";

import { downloadCSV, generateCSV } from "@/lib/csv";

interface CSVExportProps {
  receipts: Array<{
    date: string;
    amount: string;
    token: string;
    payrollName: string;
    cycle: number;
    txHash: string;
  }>;
}

export function CSVExport({ receipts }: CSVExportProps) {
  const handleExport = () => {
    const csv = generateCSV(receipts);
    downloadCSV(csv, `hsp-payroll-receipts-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={receipts.length === 0}
      className="px-4 py-2 bg-[#111827] border border-[#1F2937] text-white rounded-lg text-sm font-medium hover:bg-[#1F2937] transition disabled:opacity-50"
    >
      Export CSV
    </button>
  );
}
```

- [ ] **Step 3: Create payment history component**

Write `frontend/src/components/payment-history.tsx`:

```tsx
"use client";

import { formatAmount, formatDate, shortenAddress } from "@/lib/utils";

interface Payment {
  payrollId: bigint;
  cycleNumber: bigint;
  recipient: string;
  amount: bigint;
  timestamp: bigint;
  hspRequestId: string;
}

interface PaymentHistoryProps {
  payments: Payment[];
  explorerUrl?: string;
}

export function PaymentHistory({ payments, explorerUrl = "https://testnet-explorer.hsk.xyz" }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-[#9CA3AF]">
        No payments yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
            <th className="text-left py-3 px-4">Date</th>
            <th className="text-left py-3 px-4">Amount</th>
            <th className="text-left py-3 px-4">Cycle</th>
            <th className="text-left py-3 px-4">HSP Receipt</th>
            <th className="text-left py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, i) => (
            <tr key={i} className="border-b border-[#1F2937] hover:bg-[#111827]/50">
              <td className="py-3 px-4">{formatDate(Number(payment.timestamp))}</td>
              <td className="py-3 px-4 font-medium">{formatAmount(payment.amount)} USDT</td>
              <td className="py-3 px-4">#{payment.cycleNumber.toString()}</td>
              <td className="py-3 px-4">
                <span className="text-[#1E5EFF] text-xs font-mono">
                  {payment.hspRequestId.slice(0, 10)}...
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs px-2 py-1 bg-[#10B981]/20 text-[#10B981] rounded">
                  Settled
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create employee dashboard page**

Write `frontend/src/app/employee/page.tsx`:

```tsx
"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { PaymentHistory } from "@/components/payment-history";
import { CSVExport } from "@/components/csv-export";
import { useRecipientPayrolls, usePayrollDetails, useReceipts } from "@/hooks/usePayrolls";
import { formatAmount, formatDate } from "@/lib/utils";

export default function EmployeeDashboard() {
  const { address, isConnected } = useAccount();
  const { data: payrollIds } = useRecipientPayrolls(address as `0x${string}` | undefined);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-[#9CA3AF]">Connect your wallet to view your payments</p>
        <ConnectButton />
      </div>
    );
  }

  const hasPayrolls = payrollIds && payrollIds.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
            My Payments
          </h1>
          <p className="text-[#9CA3AF] mt-1">View your payment history and receipts</p>
        </div>
        <ConnectButton />
      </div>

      {!hasPayrolls ? (
        <div className="text-center py-20">
          <div className="text-[#9CA3AF] text-lg mb-2">No payments found</div>
          <div className="text-[#9CA3AF] text-sm">
            Your wallet address is not a recipient of any active payroll
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Payment History</h2>
            <CSVExport receipts={[]} />
          </div>

          <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
            <PaymentHistory payments={[]} />
          </div>

          <div className="text-xs text-[#9CA3AF] text-center">
            All payments settled via HashKey Settlement Protocol on HashKey Chain
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
cd /Users/rajkaria/Projects/hsp_payroll/frontend
npm run dev
```

Visit localhost:3000/employee

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/payment-history.tsx frontend/src/components/csv-export.tsx frontend/src/app/employee/ frontend/src/lib/csv.ts
git commit -m "feat: add employee dashboard with payment history and CSV export"
```

---

## Task 12: Polish + README

**Files:**
- Create: `README.md`
- Modify: `frontend/src/app/layout.tsx` (add nav)

- [ ] **Step 1: Write README**

Write `/Users/rajkaria/Projects/hsp_payroll/README.md`:

```markdown
# HSP Payroll

On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol on HashKey Chain.

## Architecture

```
Frontend (Next.js 15) → Smart Contracts (Solidity) → HashKey Chain (OP Stack L2)
                                    ↕
                          HSP Adapter (Settlement Protocol)
```

### Smart Contracts
- **PayrollFactory.sol** — Create/manage payrolls, fund escrow, execute payment cycles
- **HSPAdapter.sol** — Payment request/confirmation/receipt message layer (HSP implementation)
- **MockERC20.sol** — Test token for testnet

### Frontend
- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- wagmi v2 + RainbowKit for wallet connection
- Employer dashboard: create payroll, add recipients, fund escrow, execute cycles
- Employee dashboard: view payment history, download CSV receipts

## Setup

### Prerequisites
- Node.js 18+
- MetaMask or compatible wallet

### Smart Contracts
```bash
cd contracts
cp .env.example .env
# Add your PRIVATE_KEY to .env
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network hashkeyTestnet
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### HashKey Chain Testnet
- Chain ID: 133
- RPC: https://testnet.hsk.xyz
- Explorer: https://testnet-explorer.hsk.xyz
- Faucet: https://www.hashkeychain.net/faucet

## HSP Integration

HSP (HashKey Settlement Protocol) is the message/status coordination layer for payments:

1. **Create Request** — PayrollFactory creates batch HSP payment requests via HSPAdapter
2. **Confirm** — Payment requests are confirmed before fund release
3. **Settle** — Funds transfer and HSP marks requests as settled
4. **Receipt** — Immutable on-chain receipts with HSP request IDs

Every payment generates an on-chain receipt with:
- HSP request ID
- Recipient address
- Amount + token
- Timestamp
- Cycle number

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with architecture, setup, and HSP integration docs"
```

---

## Summary

| Task | What It Builds | Estimated Time |
|------|---------------|----------------|
| 1 | Hardhat project setup | 10 min |
| 2 | MockERC20 token | 5 min |
| 3 | HSPAdapter (settlement layer) | 20 min |
| 4 | PayrollFactory (core contract) | 30 min |
| 5 | Deploy script | 10 min |
| 6 | Next.js frontend setup | 15 min |
| 7 | Contract config + ABIs | 10 min |
| 8 | Landing page + wallet connect | 15 min |
| 9 | Employer dashboard + hooks | 25 min |
| 10 | Create payroll form | 25 min |
| 11 | Employee dashboard | 20 min |
| 12 | Polish + README | 10 min |

**Total: ~12 tasks, ~3 hours of focused execution**

After this plan is complete:
- Deploy contracts to HashKey Chain testnet (requires faucet HSK)
- Update contract addresses in `frontend/src/config/contracts.ts`
- Deploy frontend to Vercel
- Record demo video
- Submit on DoraHacks
