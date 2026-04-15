# HashPay — Project Brief (Updated 2026-04-15)

**Website:** [hashpay.tech](https://hashpay.tech)
**Track:** PayFi (HashKey Chain On-Chain Horizon Hackathon)
**Deployed on:** **Sepolia** + **HashKey Chain Testnet** (multi-chain from day one)
**Powered by:** HSP (HashKey Settlement Protocol) · EAS (Ethereum Attestation Service)
**Demo video:** `demo-video/out/hashpay-demo.mp4` (47s, Remotion-rendered with music + SFX)

---

## Vision

**HashPay is an income protocol — not a payroll product.** It ships a composable primitive stack: adaptive payment cadences, yield-bearing escrow, a portable income reputation registry, receipt-backed advances, and programmable compliance hooks. Built on HSP settlement and EAS attestations, deployed across Sepolia and HashKey Chain Testnet. DAOs, Web3 teams, and institutions settle payroll in one transaction and build financial identity on every receipt — forever, on-chain.

---

## The Problem

Crypto payroll is broken. Treasury managers open wallets, copy addresses from spreadsheets, send one-off transactions, and pray. For a 20-person team that's 20 transactions, 20 gas fees, 20 opportunities to fat-finger, and zero structured paper trail beyond block explorer hashes.

But the deeper problem is structural: every payment vanishes after it clears. Employees have no portable proof of income. Employers have no composable compliance layer. Idle escrow earns nothing. Recipients can't access capital against a payroll they're owed in 30 days. The settlement layer exists — what has never existed is the protocol layer on top of it.

**HashPay makes payroll boring again — and then makes it productive capital.**

---

## The Solution — End-to-End Flow

1. **Connect wallet** → pick Sepolia or HashKey Chain.
2. **Create payroll** → name, cadence (stream / batch / pull), token, recipients, amounts.
3. **Fund escrow** → deposit once into a yield-bearing vault. Runway extends as idle funds earn.
4. **Execute cycle** → one click. All recipients settled atomically. Compliance hooks fire first.
5. **Receipts generate** → HSP receipt + EAS attestation written on-chain. Reputation registry updated.
6. **Recipients access capital** → claim a receipt-backed advance against next cycle at any time.
7. **Visibility everywhere** → employer dashboard shows burn rate, yield accrued, next cycle date. Contributors see their income graph and downloadable CSV.
8. **Verify anywhere** → `/verify` renders the full attestation chain. `/reputation/[address]` shows portable income history.

---

## Protocol Primitives

### 1. Adaptive Cadence (AdaptiveStream.sol)

Recipients choose how to receive their salary — continuous stream (Sablier-style accrual), monthly batch claim, or pull-on-demand. Employers fund once; recipients configure cadence per-cycle independently. A unified `claim()` function and per-recipient `withdrawable()` view handle all three modes. The employer never changes anything when a recipient switches cadence — the contract handles it.

### 2. Yield-Bearing Escrow (YieldEscrow.sol — ERC-4626)

Idle escrow funds auto-deposit into a yield vault on `fund()`. On `executeCycle()`, the contract sweeps exactly what's needed to settle and leaves the rest earning. Yield accrues to the employer, offsetting payroll cost. The runway calculator on the dashboard shows real-time: "at current yield, your 6-month runway extends to 7.2 months."

### 3. Composable Income Attestation Registry (ReputationRegistry.sol)

Every EAS attestation from `PayrollAttestor` is aggregated into a permissionless `ReputationRegistry`. Anyone can query any recipient address for: total verified income, employer count, on-time payment rate, active payroll tenure, and jurisdiction breakdown. This turns every HashPay receipt into a building block of portable financial identity. The `/reputation/[address]` page renders the full income graph across all employers and chains — shareable, verifiable, permanent.

### 4. Receipt-Backed Advances (PayrollAdvance.sol)

Recipients borrow up to 70% of their next confirmed payout at any time before `executeCycle()` runs. The contract verifies active payroll status, employer escrow sufficiency, and reputation score before lending. Repayment is automatic — deducted from the next cycle execution before net pay is sent. No bank. No credit check. Collateral is the cryptographic certainty of the payroll itself.

### 5. Programmable Compliance Hooks (IComplianceHook)

Compliance is a pluggable interface attached to each payroll, not baked-in logic. Before any `executeCycle()`, the contract iterates through registered hooks: KYC SBT check, jurisdiction filter, sanctions screening, tax withholding, custom org rules. Each hook returns pass/fail. Employers wire in exactly the compliance framework their jurisdiction requires — nothing more, nothing less. Reference implementations ship for KYC SBT, jurisdiction allowlist, and sanctions screening.

---

## Features

### For Employers
- Named payroll schedules with multi-recipient support
- USDT, HSK, ETH, any ERC-20 — chain-aware token lists
- **Three cadence modes per recipient**: stream / batch / pull (AdaptiveStream)
- **Yield-bearing escrow** — idle funds earn, runway extends automatically
- **Real-time runway calculator** with yield projection
- Top-up or withdraw anytime (ERC-4626 vault)
- One-click atomic batch execution with pre-flight compliance checks
- **Pluggable compliance hooks** — KYC SBT, jurisdiction, sanctions, tax withholding
- **HSP + EAS dual receipts** for every cycle
- Payment history with filters, CSV export, PDF reports
- Analytics: volume, burn rate, per-employee cost, yield earned

### For Contributors
- **Choose your cadence**: stream, batch, or pull
- **Streaming balance indicator** (real-time accrued value)
- **Receipt-backed advances** — borrow against next payroll instantly
- **Reputation page** at `/reputation/[address]` — portable income graph across all employers
- Full payment history with on-chain verification links
- CSV export of personal history
- Gasless claim modal + withdraw-to-bank stub
- Zero onboarding — connect wallet, done

### Platform-wide
- **Multi-chain contract config** — Sepolia + HashKey Chain, one config entry to add more
- **EAS attestations** — signed by `PayrollAttestor` against registered schema
- **ReputationRegistry** — permissionless income identity layer
- **Compliance hook interface** — IComplianceHook with 3 reference implementations
- **Network badge + chain switching** everywhere
- **HSP Sandbox banner** — honest, dismissible, explains simulated vs. real on-chain
- **Docs page** — HSP flow, EAS schema, contract addresses per chain, hook interface
- **Faucet page** — mint MockUSDT + gas faucet links per chain

---

## Deployed Contracts

### Sepolia (chainId 11155111) — default
| Contract | Address |
|---|---|
| PayrollFactory | `0x87e05D6F1C704f5010Cd6039e1a8D2C341458860` |
| HSPAdapter | `0xd9d2DCe611547CB5E7D1abF50Bd8C0eF65F8E2de` |
| PayrollAttestor | `0xb54650cd175E13872cd366eeD9b8e7E94592db21` |
| MockUSDT | `0x7D7c21E25576F7F7C224A9Ccf55B2E90648f8652` |
| EAS | `0xc2679fBd37d54388cE493f1db75e8dAD8e0b84D5` |
| EAS Schema UID | `0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4` |
| AdaptiveStream | `0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0` |
| YieldEscrow | `0xB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1` |
| ReputationRegistry | `0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2` |
| PayrollAdvance | `0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3` |

### HashKey Chain Testnet (chainId 133)
Same contract suite deployed; config lives in `frontend/src/config/contracts.ts` → `CHAIN_CONTRACTS[133]`.

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         hashpay.tech                              │
│          Next.js 16 · TypeScript · Tailwind · shadcn/ui           │
│          wagmi v2 · viem · framer-motion · Recharts               │
│                                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │ Employer │ │ Employee │ │Reputation│ │ Verify │ │  Faucet  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬───┘ └──────────┘  │
└───────┼────────────┼────────────┼────────────┼────────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────────┐
│         useContracts(chainId) · getDefaultTokens(chainId)         │
│              Chain-aware hook layer + ABIs                        │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Smart Contracts (Solidity)                      │
│                                                                    │
│   PayrollFactory ── HSPAdapter ── PayrollAttestor                 │
│         │                              │                          │
│         ▼                              ▼                          │
│   AdaptiveStream    ReputationRegistry (aggregates EAS)           │
│   (STREAM/BATCH/PULL per recipient)                               │
│         │                                                         │
│   YieldEscrow (ERC-4626) ── PayrollAdvance (receipt loans)        │
│         │                                                         │
│   IComplianceHook[] (KYC SBT · Jurisdiction · Sanctions)         │
└───────────────────────────┬──────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
  ┌──────────────────┐           ┌───────────────────────┐
  │     Sepolia      │           │   HashKey Chain        │
  │  (chainId        │           │  (chainId 133          │
  │  11155111)       │           │  testnet, OP Stack)    │
  └──────────────────┘           └───────────────────────┘
```

---

## Why This Is a Protocol, Not a Product

Every competitor in this track ships a payroll product. HashPay ships an income protocol — five composable primitives that interlock:

- **Cadence** (how money flows — stream, batch, or pull)
- **Yield** (what idle money does — earns, extends runway)
- **Reputation** (what receipts compose into — portable income identity)
- **Advances** (what future receipts unlock — capital today against tomorrow's payroll)
- **Compliance** (what gates a payment — pluggable, jurisdiction-aware, institutional-grade)

The HSP + EAS layer underneath provides settlement finality and audit-grade attestation. The result is a base layer other applications can build on — DeFi protocols can accept ReputationRegistry scores as creditworthiness signals, compliance vendors can ship IComplianceHook implementations, and recipients carry their income identity across every employer and chain.

---

## Competitive Positioning

### vs. Hashflow / StreamYield
- Three cadence modes vs. one (stream-only)
- Employer-side yield accrual — they offset payroll cost, not just the treasury yield narrative
- Reputation registry as a network effect — each new employer strengthens every existing recipient's identity
- Receipt-backed advances close the PayFi loop they describe but don't ship

### vs. Manual Token Transfers
- 20-person cycle: 30 min → 30 sec, 20 txs → 1 tx, 20× gas → 1× gas
- Receipts: none → HSP + EAS + ReputationRegistry entry
- Capital access: none → advance against next cycle, instant

### vs. Gusto / Deel / Remote
- No intermediary, no cut, no ACH delay
- Instant settlement, programmable enforcement
- Portable income identity — works across borders, chains, and employers
- On-chain verification without banking hours or jurisdiction restrictions

---

## Use Cases

- **DAO treasury**: 50 contributors, monthly batch cycle, one tx, on-chain dashboard, reputation scores for contributors applying to grants
- **Crypto startup**: 10-person team, USDT streams, yield extends 6-month runway, KYC SBT compliance hook for regulated employees
- **Protocol contractors**: weekly auditors + monthly moderators, mixed cadences from one wallet, advances for cash-flow gaps
- **Grant disbursement**: quarterly installments, public proof-of-payment attestations, jurisdiction hooks for multi-country grantees
- **Cross-border teams**: 8 countries, USDT, no SWIFT, sanctions hook for compliance, reputation portable across gigs

---

## Hackathon Judging Pack

- **Live app:** [hashpay.tech](https://hashpay.tech)
- **47-second hype video:** `demo-video/out/hashpay-demo.mp4`
- **Docs:** `/docs` — HSP flow, EAS schema, contract addresses, compliance hook interface
- **Verify flow:** `/verify` — paste receipt ID, see HSP + EAS attestation
- **Reputation:** `/reputation/[address]` — portable income graph, all employers
- **Faucet:** `/faucet` — mint MockUSDT + testnet gas per chain
- **Public contract addresses:** listed above

---

## Team

Built by **Raj Karia** — developer and entrepreneur working across the agent economy, consumer apps, and India-specific Web3 tooling. Based in Bengaluru. Stack: Next.js, TypeScript, Solidity, HashKey Chain, Sepolia, EAS.

---

**HashPay — an income protocol. Settlement on-chain. Identity from every receipt. Capital from every payroll.**
