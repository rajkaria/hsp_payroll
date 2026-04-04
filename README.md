# HashPay

On-chain recurring payroll platform for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol on HashKey Chain.

**Live:** [hashpay.tech](https://hashpay.tech) | **Docs:** [hashpay.tech/docs](https://hashpay.tech/docs) | **Faucet:** [hashpay.tech/faucet](https://hashpay.tech/faucet) | **Verify:** [hashpay.tech/verify](https://hashpay.tech/verify)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + wagmi v2 + RainbowKit)              │
│  ├── Employer: create, fund, execute, attest, analyze        │
│  ├── Employee: real payment history, streaming, CSV export   │
│  ├── API Routes: /api/ai/analyze, /api/hsp/create-order     │
│  └── Pages: faucet, verify, docs, analytics, profile         │
├──────────────────────────────────────────────────────────────┤
│  Smart Contracts (Solidity 0.8.24)                           │
│  ├── PayrollFactory  — payroll CRUD, escrow, cycle execution │
│  ├── HSPAdapter      — settlement lifecycle + access control │
│  ├── PayrollAttestor — EAS on-chain attestations             │
│  └── MockERC20       — testnet token (6 decimals)            │
├──────────────────────────────────────────────────────────────┤
│  HashKey Chain (OP Stack L2)                                 │
│  ├── EAS predeploy   — 0x4200...0021 (attestations)          │
│  ├── SchemaRegistry  — 0x4200...0020 (schemas)               │
│  └── ~2s blocks, ~$0.01 gas, EVM compatible                  │
└──────────────────────────────────────────────────────────────┘
```

### Smart Contracts
- **PayrollFactory.sol** — Create/manage payrolls, fund escrow, execute payment cycles, manage recipients
- **HSPAdapter.sol** — Payment request lifecycle with `onlyAuthorized` access control (create → confirm → settle)
- **PayrollAttestor.sol** — EAS attestation creation for permanent on-chain proof-of-payment
- **MockERC20.sol** — Test USDT token with public mint (6 decimals)

### Frontend
- Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- wagmi v2 + RainbowKit for wallet connection
- Recharts for analytics, jsPDF for compliance reports, Anthropic SDK for AI
- Animated canvas mesh background with cursor interaction

## Features

### Core
- **Escrow-Based Payroll** — Funds held in smart contract escrow with transparent runway tracking
- **HSP Settlement Receipts** — Every payment generates an immutable on-chain receipt via HSP
- **HSP REST API Integration** — Real HSP hosted checkout with HMAC-SHA256 auth (demo mode available)
- **EAS Attestations** — Permanent on-chain proof-of-payment via Ethereum Attestation Service
- **Payment Verification** — Public `/verify` page for independent attestation verification
- **Multi-Recipient** — Pay unlimited team members in a single cycle execution
- **Custom Token Support** — USDT default, add any custom ERC-20 token on HashKey Chain
- **Multi-Chain** — HashKey Chain testnet (133) and mainnet (177) support
- **Payroll Templates** — Pre-built templates (Engineering, Contractor, Design, Quick Test)
- **Access Control** — HSPAdapter restricted to authorized callers only

### Analytics & Compliance
- **AI Cash Flow Intelligence** — Health score, runway prediction, anomaly detection, optimization tips (Claude API or demo mode)
- **Analytics Dashboard** — Payment volume, escrow runway burn rate, cost-per-employee charts
- **PDF Compliance Reports** — Downloadable reports with company header, payment tables, HSP receipt IDs
- **Business Profile** — Company details stored for report generation
- **CSV Export** — Full payment history export for accounting

### Employee Experience
- **Real Payment History** — On-chain receipts fetched and displayed per payroll/cycle
- **Fiat Conversion** — USD/HKD value badges on all amounts
- **CSV Export** — Full payment history export for accounting and tax filing

### Developer Experience
- **Token Faucet** — One-click Mock USDT minting with auto-refreshing balance
- **Explorer Links** — All transactions linked to HashKey Chain block explorer
- **Interactive Docs** — User-facing documentation with Quick Start, FAQ, and guides
- **115 Unit Tests** — Comprehensive coverage across all 4 contracts

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with animated mesh, features, interactive stepper |
| `/employer` | Employer dashboard — manage payrolls, execute cycles, create attestations |
| `/employer/create` | Multi-step payroll creation wizard with templates |
| `/employer/analytics` | Payment volume, burn rate, cost charts, AI intelligence panel |
| `/employer/profile` | Business profile for compliance reports |
| `/employee` | Employee dashboard — real on-chain payment history, fiat conversion |
| `/faucet` | Token faucet — mint testnet USDT with auto-balance refresh |
| `/verify` | Public payment verification via EAS attestation lookup |
| `/docs` | User-facing documentation with Quick Start, guides, FAQ |

## Setup

### Prerequisites
- Node.js 18+
- MetaMask or compatible Web3 wallet

### Smart Contracts
```bash
cd contracts
cp .env.example .env
# Add your PRIVATE_KEY to .env
npm install
npx hardhat compile
npx hardhat test          # 115 tests
npx hardhat run scripts/deploy.ts --network hashkeyTestnet
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
npm run build             # Production build
```

### Deploy to Vercel
```bash
cd frontend
npx vercel --prod         # Root directory: frontend/
```

### Environment Variables (Optional)
```env
# frontend/.env.local
ANTHROPIC_API_KEY=sk-ant-...      # Enables live AI analysis (demo mode without)
HSP_API_KEY=...                    # Enables real HSP checkout (demo mode without)
HSP_API_SECRET=...
HSP_MERCHANT_ID=...
```

## Contract Addresses (HashKey Testnet)

| Contract | Address |
|---|---|
| PayrollFactory | `0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb` |
| HSPAdapter | `0xa31558b2c364B269Ac823798AefcA7E285Af3487` |
| Mock USDT | `0xcd367c583fd028C12Cc038d744cE7B2a67d848E2` |
| PayrollAttestor | `0x5F6b5EB4f444d6aCc4F7829660a7C920399253Cf` |
| EAS (predeploy) | `0x4200000000000000000000000000000000000021` |
| EAS Schema UID | `0x4d0972424d71fca626f8a29bfa961af74be2be30` |

## HashKey Chain

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 133 | 177 |
| RPC | https://testnet.hsk.xyz | https://mainnet.hsk.xyz |
| Explorer | https://testnet-explorer.hsk.xyz | https://explorer.hsk.xyz |
| Faucet | https://www.hashkeychain.net/faucet | — |

## HSP Integration

HashPay integrates with HSP at two levels:

**On-Chain (HSPAdapter):**
1. PayrollFactory creates batch payment requests via HSPAdapter
2. Requests confirmed and settled during cycle execution
3. Immutable receipts stored with HSP request IDs
4. Access control: only authorized contracts can confirm/settle

**Off-Chain (HSP REST API):**
1. "Pay via HSP" button creates HSP payment order
2. HMAC-SHA256 signed requests to HSP API
3. Redirect to HSP hosted checkout (or demo modal)
4. Webhook handler for payment confirmation

## EAS Attestations

Every payment can be permanently attested on-chain via EAS:
- PayrollAttestor reads receipts from PayrollFactory
- Creates non-revocable attestations per recipient per cycle
- Schema: payrollId, cycleNumber, employer, recipient, amount, token, hspRequestId, tokenSymbol
- Anyone can verify at `/verify` — no wallet required

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin, EAS |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion, Canvas animations |
| Web3 | wagmi v2, viem, RainbowKit |
| Charts | Recharts |
| AI | Anthropic Claude API (with demo fallback) |
| PDF | jsPDF + jspdf-autotable |
| Deployment | Vercel, HashKey Chain |

## License

MIT
