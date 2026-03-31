# HSP Payroll — HashKey Chain Hackathon Build Spec

## CONTEXT: Why This Wins

**Hackathon:** HashKey Chain On-Chain Horizon Hackathon (DoraHacks)
**Track:** PayFi — 10K USDT Prize Pool (1st: 5K, 2nd: 3K, 3rd: 2K)
**Deadline:** April 15, 2026 23:59 GMT+8
**Demo Pitch:** April 22-23, 2026 (AWS Office → Web3 Festival)
**Submission:** DoraHacks — https://dorahacks.io/hackathon/2045

### Competitive Analysis (PayFi Track — 4 competitors)

| Project | What They're Building | Weakness |
|---------|----------------------|----------|
| **AgenPay** (hacker22cf862) | AI agent spending via Turnkey TEE + HSP mandate + AuditLog. Agent-controlled payment infra. | Over-engineered for AI agents, not human-usable. Abstract infrastructure play, weak demo potential. |
| **Kite Trace** (Sunny) | ERC-8004 identity + ERC-8183 job escrow + x402 payments. Agent receipt tracking. | Standards-heavy, ported from x402 SF hackathon. Not HSP-native — layering external standards on top. |
| **Remora** (Mings-prop) | Natural language → on-chain tx + fiat bridge. "Make blockchain invisible." | Extremely broad scope, hard to demo convincingly. No clear HSP integration. |
| **payFlow** (hacker304f448) | Solving gas costs for AI agent API calls via L2 bundling. | Ethereum L1 problem, not really PayFi. HashKey Chain already has low gas. Misaligned with track. |

### Why HSP Payroll Wins

1. **Nobody is building recurring payment rails.** All 4 competitors are AI-agent-payment plays. Zero are doing the obvious use case: payroll, subscriptions, scheduled payments.
2. **HSP is explicitly required** — "For the PayFi track, please use HSP." Most competitors are ignoring this or treating it as an afterthought.
3. **Judges are institutional** — HashKey Capital, Kraken, AWS, SNZ, security audit firms. They understand payroll. They don't need to be sold on why teams need to pay people.
4. **Post-hack incubation bait** — HashKey Group literally runs payroll. This is dog-food material.
5. **Demo-friendly** — "Create payroll → employees get paid → see receipts" is a 3-minute demo anyone understands.

---

## PRODUCT SPECIFICATION

### One-liner
**HSP Payroll: On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol.**

### Core User Flow

```
1. EMPLOYER (DAO treasury / team lead) connects wallet
2. Creates a "Payroll" — defines:
   - Recipients (wallet addresses + optional ENS/labels)
   - Token (HSK, USDT, ETH — ERC-20s on HashKey Chain)
   - Amount per recipient per cycle
   - Frequency (weekly / biweekly / monthly)
   - Start date
3. Funds the payroll escrow contract
4. Each pay cycle:
   a. Smart contract generates HSP payment requests
   b. Recipients can view pending payments in dashboard
   c. Employer approves batch (or auto-approve if pre-authorized)
   d. HSP settles all payments atomically
   e. On-chain receipts generated for each payment
5. DASHBOARD shows:
   - Payment history with tx hashes
   - Status per cycle (paid / pending / failed)
   - Downloadable CSV receipt export (compliance-ready)
   - Remaining escrow balance + projected runway
```

### Architecture

```
┌─────────────────────────────────────────────┐
│              FRONTEND (Next.js 15)           │
│  - Employer Dashboard (create/manage payroll)│
│  - Employee Dashboard (view payments/receipts│
│  - Wallet connect (RainbowKit/wagmi)         │
│  - Receipt export (CSV/PDF)                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           SMART CONTRACTS (Solidity)         │
│                                             │
│  PayrollFactory.sol                         │
│  ├─ createPayroll(recipients, amounts,      │
│  │   token, frequency)                      │
│  ├─ fundPayroll(payrollId, amount)          │
│  ├─ executeCycle(payrollId) → HSP integration│
│  ├─ cancelPayroll(payrollId)                │
│  └─ getPayrollStatus(payrollId)             │
│                                             │
│  HSPAdapter.sol                             │
│  ├─ createPaymentRequest(recipient, amount) │
│  ├─ confirmPayment(requestId)               │
│  ├─ getReceipt(requestId)                   │
│  └─ batchSettle(requestIds[])               │
│                                             │
│  PayrollEscrow.sol                          │
│  ├─ deposit(token, amount)                  │
│  ├─ withdraw(token, amount) [owner only]    │
│  └─ releaseBatch(recipients[], amounts[])   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│          HASHKEY CHAIN (OP Stack L2)        │
│  Chain ID: 177 (mainnet) / 133 (testnet)   │
│  Native token: HSK                          │
│  EVM compatible — standard Solidity         │
│  Gas: ~0.1 gwei (extremely cheap)           │
└─────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 15, TypeScript, Tailwind CSS | Raj's core stack. Fast to build. |
| Wallet | wagmi v2 + RainbowKit | Standard, reliable. HashKey Chain is EVM. |
| Smart Contracts | Solidity 0.8.x + Hardhat | EVM-compatible. HashKey Chain docs recommend Hardhat. |
| HSP Integration | HSP SDK from hashfans.io | **MANDATORY for PayFi track.** Extra points for using it. |
| Chain | HashKey Chain Testnet (chain ID 133) | Required. RPC: `https://testnet.hsk.xyz` |
| Backend (optional) | Next.js API routes | For off-chain scheduling / cron triggers |
| Deployment | Vercel (frontend) + Hardhat deploy (contracts) | Fast, Raj already uses Vercel/Netlify |

---

## SMART CONTRACT DESIGN

### PayrollFactory.sol (Core Contract)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct Payroll {
    address owner;
    address token;           // ERC-20 token address (USDT, HSK, etc.)
    address[] recipients;
    uint256[] amounts;       // per-recipient per-cycle
    uint256 frequency;       // seconds between cycles (e.g., 2592000 for monthly)
    uint256 lastExecuted;    // timestamp of last execution
    uint256 totalDeposited;
    uint256 totalPaid;
    bool active;
}

struct PaymentReceipt {
    uint256 payrollId;
    uint256 cycleNumber;
    address recipient;
    uint256 amount;
    uint256 timestamp;
    bytes32 hspRequestId;    // HSP payment request reference
}
```

### Key Functions

```
createPayroll(token, recipients[], amounts[], frequency) → payrollId
fundPayroll(payrollId, amount)
executeCycle(payrollId) → settles all recipients via HSP, emits receipts
withdrawExcess(payrollId) → owner reclaims unused funds
addRecipient(payrollId, recipient, amount)
removeRecipient(payrollId, recipient)
getPayrollDetails(payrollId) → full payroll struct
getReceipts(payrollId, cycleNumber) → receipt array
getRunway(payrollId) → cycles remaining based on balance
```

### Events (Critical for Frontend)

```solidity
event PayrollCreated(uint256 indexed payrollId, address indexed owner, address token);
event PayrollFunded(uint256 indexed payrollId, uint256 amount);
event CycleExecuted(uint256 indexed payrollId, uint256 cycleNumber, uint256 totalPaid);
event PaymentSettled(uint256 indexed payrollId, address indexed recipient, uint256 amount, bytes32 hspRequestId);
event PayrollCancelled(uint256 indexed payrollId);
```

---

## HSP INTEGRATION STRATEGY

**CRITICAL:** HSP documentation is at https://hashfans.io/ (top navigation bar → HSP section). The hackathon explicitly requires HSP for PayFi track.

### What HSP Does (from hackathon description)
HSP = HashKey Settlement Protocol. It is a **message layer** for payment interactions:
- Creates payment requests
- Handles confirmations
- Generates receipts
- Manages status synchronization
- **Does NOT manage funds** — only message orchestration

### How We Use HSP

```
For each payment cycle:
1. Smart contract calls HSPAdapter.createBatchRequest(recipients, amounts)
2. HSP generates payment request messages for each recipient
3. Recipients see pending payment notifications
4. Employer (or auto-trigger) confirms the batch
5. HSP verifies and synchronizes settlement status
6. Smart contract releases funds from escrow
7. HSP generates immutable on-chain receipts
```

### HSP Resources to Read FIRST
- **HSP User Manual:** https://hashfans.io/ → top nav → HSP section
- **HashKey Chain Dev Docs:** https://docs.hsk.xyz/
- **Developer QuickStart:** https://docs.hashkeychain.net/docs/Developer-QuickStart
- **HashKey Chain Testnet RPC:** https://testnet.hsk.xyz (Chain ID: 133)
- **Block Explorer:** https://hashkey.blockscout.com
- **Faucet:** https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/Faucet
- **HashKey GitHub (official repos + agentkit):** https://github.com/HashkeyHSK
- **HashKey MCP Server:** https://github.com/HashkeyHSK/hsk-mcp
- **Hackathon DoraHacks page:** https://dorahacks.io/hackathon/2045
- **Hackathon Telegram group:** https://t.me/HashKeyChainHSK/95285
- **Developer community:** https://hashfans.io/

---

## FRONTEND SPECIFICATION

### Pages

#### 1. Landing / Connect Wallet
- Connect via RainbowKit (MetaMask, WalletConnect)
- Auto-detect HashKey Chain testnet, prompt to add network if missing
- Role detection: show Employer or Employee dashboard based on wallet

#### 2. Employer Dashboard
```
┌─────────────────────────────────────────────┐
│  HSP Payroll — Employer Dashboard           │
├─────────────────────────────────────────────┤
│                                             │
│  [+ Create New Payroll]                     │
│                                             │
│  Active Payrolls:                           │
│  ┌─────────────────────────────────────┐    │
│  │ Team Alpha Payroll                  │    │
│  │ Token: USDT  │ Recipients: 5       │    │
│  │ Frequency: Monthly                  │    │
│  │ Next cycle: Apr 15, 2026            │    │
│  │ Escrow balance: 25,000 USDT         │    │
│  │ Runway: 5 months                    │    │
│  │ [Execute Now] [Manage] [Fund]       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Payment History (with HSP receipts):       │
│  Cycle #3 — Mar 15 — 5,000 USDT — ✅ Settled│
│  Cycle #2 — Feb 15 — 5,000 USDT — ✅ Settled│
│  Cycle #1 — Jan 15 — 5,000 USDT — ✅ Settled│
│                                             │
│  [Export CSV] [Export PDF]                   │
└─────────────────────────────────────────────┘
```

#### 3. Employee Dashboard
```
┌─────────────────────────────────────────────┐
│  HSP Payroll — My Payments                  │
├─────────────────────────────────────────────┤
│                                             │
│  Upcoming: 1,000 USDT on Apr 15             │
│                                             │
│  Payment History:                           │
│  ┌────────┬──────────┬────────┬──────────┐  │
│  │ Date   │ Amount   │ Token  │ Receipt  │  │
│  │ Mar 15 │ 1,000    │ USDT   │ [View TX]│  │
│  │ Feb 15 │ 1,000    │ USDT   │ [View TX]│  │
│  │ Jan 15 │ 1,000    │ USDT   │ [View TX]│  │
│  └────────┴──────────┴────────┴──────────┘  │
│                                             │
│  [Download All Receipts as CSV]             │
└─────────────────────────────────────────────┘
```

#### 4. Create Payroll Flow
- Step 1: Name + Token selection (dropdown: HSK, USDT, ETH)
- Step 2: Add recipients (paste addresses or upload CSV)
- Step 3: Set amounts per recipient
- Step 4: Set frequency (weekly / biweekly / monthly / custom)
- Step 5: Fund escrow (approve + deposit tx)
- Step 6: Confirm & deploy

### Design System
- **Colors:** Use HashKey brand colors — primary blue (#1E5EFF), dark bg (#0A0E1A), accent green for success states
- **Typography:** Inter (body) + Space Grotesk (headings) — clean, fintech aesthetic
- **Components:** shadcn/ui for speed — tables, cards, dialogs, forms
- **Mobile responsive:** Must work on mobile for demo

---

## BUILD SEQUENCE (Priority Order)

### Phase 1: Smart Contracts (Day 1-2)
1. Read HSP documentation at hashfans.io thoroughly
2. Set up Hardhat project targeting HashKey Chain testnet
3. Write PayrollFactory.sol with core create/fund/execute logic
4. Write HSPAdapter.sol wrapping HSP payment request/receipt flow
5. Write PayrollEscrow.sol for token custody
6. Deploy to HashKey Chain testnet
7. Test all flows via Hardhat scripts

### Phase 2: Frontend Shell (Day 2-3)
1. Next.js 15 + TypeScript + Tailwind + shadcn/ui
2. wagmi v2 + RainbowKit setup with HashKey Chain testnet
3. Connect wallet flow
4. Employer dashboard — create payroll form
5. Contract interaction via wagmi hooks (useWriteContract, useReadContract)

### Phase 3: Core Flows (Day 3-5)
1. Create payroll → fund → execute cycle — full flow working
2. Employee dashboard — view payments, receipts
3. HSP receipt display with tx hash links to explorer
4. Payment history table with filters
5. CSV export of receipts

### Phase 4: Polish & Demo (Day 5-7)
1. Loading states, error handling, toast notifications
2. Mobile responsiveness pass
3. Seed demo data — create 2-3 sample payrolls with history
4. Record 3-5 minute demo video (REQUIRED for submission)
5. Write README with architecture diagram, setup instructions
6. Deploy frontend to Vercel
7. Submit on DoraHacks

---

## SUBMISSION REQUIREMENTS (from hackathon rules)

- [ ] GitHub/GitLab/Bitbucket link (public repo, open source)
- [ ] Demo video (required, 3-5 minutes, publicly viewable)
- [ ] Project built on HashKey Chain
- [ ] Aligns with PayFi track
- [ ] Uses HSP (officially recommended — earns extra points)
- [ ] Original work built during hackathon period
- [ ] Submit before April 15, 23:59 GMT+8

---

## DEMO VIDEO SCRIPT (3-5 minutes)

```
0:00-0:30 — Problem statement
  "DAOs and crypto teams pay contributors manually every month.
   No receipts, no audit trail, no automation.
   HSP Payroll fixes this."

0:30-1:30 — Create a payroll
  Show: connect wallet → create payroll → add 3 recipients →
  set monthly frequency → fund with 3,000 USDT → deploy

1:30-2:30 — Execute a payment cycle
  Show: employer clicks Execute → HSP payment requests created →
  batch settlement → on-chain receipts generated →
  all 3 recipients receive 1,000 USDT each

2:30-3:30 — Employee view
  Switch to recipient wallet → show payment history →
  click receipt → see tx on HashKey Chain explorer →
  download CSV for tax/compliance

3:30-4:00 — Dashboard features
  Show: runway calculator, payment history, escrow balance,
  add/remove recipients

4:00-4:30 — Why HSP Payroll
  "Built natively on HSP. Compliance-ready receipts.
   Every payment has an on-chain audit trail.
   No more manual transfers. No more lost invoices."
```

---

## WINNING EDGE: Extra Points Strategies

1. **HSP-native architecture** — Don't just use HSP as a wrapper. Make payment request/confirmation/receipt the core flow. Judges will check this.

2. **Compliance angle** — HashKey is THE compliance-focused chain. Show downloadable receipts, audit trails, exportable CSVs. This is catnip for HashKey Capital and Kraken judges.

3. **Cross-track composability** — Add optional ZKID gating: "Only ZKID-verified recipients can be added to payroll." This shows awareness of HashKey's broader ecosystem. Don't build the ZK part — just add a `requireZKID` boolean flag on the contract and a UI toggle.

4. **Real-world framing** — In the demo video, frame it as: "HashKey Group could use this to pay their own team on-chain." The judges ARE HashKey Group.

5. **Clean code + README** — Many hackathon submissions have terrible READMEs. A clean architecture diagram, setup instructions, and contract documentation will differentiate.

---

## KEY REFERENCE LINKS

| Resource | URL |
|----------|-----|
| HSP Documentation | https://hashfans.io/ (top nav → HSP) |
| HashKey Chain Docs | https://docs.hsk.xyz/ |
| Developer QuickStart | https://docs.hashkeychain.net/docs/Developer-QuickStart |
| Network Info | https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/network-info |
| Testnet RPC | https://testnet.hsk.xyz (Chain ID: 133) |
| Mainnet RPC | https://mainnet.hsk.xyz (Chain ID: 177) |
| Block Explorer | https://hashkey.blockscout.com |
| Faucet | https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/Faucet |
| Bridge (Sepolia ↔ Testnet) | https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/Bridges |
| Oracle | https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/Oracle |
| Safe (Multisig) | https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/Safe |
| KYC Tools | https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Tools/KYC |
| HashKey GitHub Org | https://github.com/HashkeyHSK |
| HashKey MCP Server | https://github.com/HashkeyHSK/hsk-mcp |
| HashKey AgentKit | https://github.com/HashkeyHSK/agentkit |
| Hackathon Page | https://dorahacks.io/hackathon/2045 |
| Hackathon Telegram | https://t.me/HashKeyChainHSK/95285 |
| Hardhat HashKey Config | See Developer QuickStart for network config |

---

## HARDHAT CONFIG (Ready to Copy)

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
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

---

## WAGMI CONFIG (Ready to Copy)

```typescript
import { defineChain } from 'viem';

export const hashkeyTestnet = defineChain({
  id: 133,
  name: 'HashKey Chain Testnet',
  nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.hsk.xyz'] },
  },
  blockExplorers: {
    default: { name: 'BlockScout', url: 'https://hashkey.blockscout.com' },
  },
  testnet: true,
});

export const hashkeyMainnet = defineChain({
  id: 177,
  name: 'HashKey Chain',
  nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.hsk.xyz'] },
  },
  blockExplorers: {
    default: { name: 'BlockScout', url: 'https://hashkey.blockscout.com' },
  },
});
```

---

## CRITICAL FIRST STEP

Before writing any code:

1. **Go to https://hashfans.io/** and find the HSP documentation in the top navigation bar
2. Read the HSP user manual completely — understand the message flow (request → confirm → receipt)
3. Check if HSP has an SDK/npm package or if it's purely on-chain contracts
4. Join the Telegram dev group: https://t.me/HashKeyChainHSK/95285 and ask for HSP contract addresses on testnet
5. Get testnet HSK from the faucet
6. Then start building contracts

**The #1 risk is misunderstanding HSP's actual API.** The hackathon description says it's a message/settlement protocol, not a funds manager. Read the docs before assuming anything about the integration pattern.
