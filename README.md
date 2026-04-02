# HashPay

On-chain recurring payroll platform for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol on HashKey Chain.

**Live:** [hashpay.tech](https://hashpay.tech) | **Docs:** [hashpay.tech/docs](https://hashpay.tech/docs) | **Faucet:** [hashpay.tech/faucet](https://hashpay.tech/faucet)

## Architecture

```
Frontend (Next.js 16) ──→ Smart Contracts (Solidity 0.8.24) ──→ HashKey Chain (OP Stack L2)
                                        ↕
                              HSP Adapter (Settlement Protocol)
```

### Smart Contracts
- **PayrollFactory.sol** — Create/manage payrolls, fund escrow, execute payment cycles, manage recipients
- **HSPAdapter.sol** — Payment request lifecycle (create → confirm → settle), batch processing, receipt generation
- **MockERC20.sol** — Test USDT token with public mint (6 decimals)

### Frontend
- Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- wagmi v2 + RainbowKit for wallet connection
- Recharts for analytics, jsPDF for compliance reports
- Animated canvas mesh background with cursor interaction

## Features

### Core
- **Escrow-Based Payroll** — Funds held in smart contract escrow with transparent runway tracking
- **HSP Settlement Receipts** — Every payment generates an immutable on-chain receipt via HSP
- **Multi-Recipient** — Pay unlimited team members in a single cycle execution
- **Multi-Token Support** — USDT, USDC, HSK, WETH, and custom ERC-20 tokens
- **Multi-Chain** — HashKey Chain testnet (133) and mainnet (177) support
- **Payroll Templates** — Pre-built templates (Engineering, Contractor, Design, Quick Test)

### Analytics & Compliance
- **Analytics Dashboard** — Payment volume, escrow runway burn rate, cost-per-employee charts
- **PDF Compliance Reports** — Downloadable reports with company header, payment tables, HSP receipt IDs
- **Business Profile** — Company details stored for report generation
- **CSV Export** — Full payment history export for accounting

### Preview Features
- **Gasless Claims** — ERC-2771 meta-transaction support for gas-free employee claims
- **Payment Streaming** — Per-second salary streaming with live-ticking balance counter
- **Fiat Off-Ramp** — USD/HKD conversion display with withdraw-to-bank preview

### Developer Experience
- **Token Faucet** — One-click Mock USDT minting at `/faucet`
- **Explorer Links** — Transaction hashes linked to HashKey Chain block explorer
- **Interactive Docs** — Full documentation at `/docs` with copy-able code blocks
- **105 Unit Tests** — Comprehensive test coverage across all contracts

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with animated mesh, features, interactive stepper |
| `/employer` | Employer dashboard — manage payrolls, execute cycles |
| `/employer/create` | Multi-step payroll creation wizard with templates |
| `/employer/analytics` | Payment volume, burn rate, and cost charts |
| `/employer/profile` | Business profile for compliance reports |
| `/employee` | Employee dashboard — payment history, streaming balance |
| `/faucet` | Token faucet — mint testnet USDT |
| `/docs` | Full documentation with sidebar navigation |

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
npx hardhat test          # 105 tests
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
npx vercel --prod         # Set root directory to frontend/
```

## Contract Addresses (HashKey Testnet)

| Contract | Address |
|---|---|
| PayrollFactory | `0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb` |
| HSPAdapter | `0xa31558b2c364B269Ac823798AefcA7E285Af3487` |
| Mock USDT | `0xcd367c583fd028C12Cc038d744cE7B2a67d848E2` |

## HashKey Chain

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | 133 | 177 |
| RPC | https://testnet.hsk.xyz | https://mainnet.hsk.xyz |
| Explorer | https://testnet-explorer.hsk.xyz | https://explorer.hsk.xyz |
| Faucet | https://www.hashkeychain.net/faucet | — |

## HSP Integration

HSP (HashKey Settlement Protocol) is the settlement coordination layer:

1. **Create Request** — PayrollFactory creates batch HSP payment requests via HSPAdapter
2. **Confirm** — Payment requests confirmed before fund release
3. **Settle** — Funds transferred, HSP marks requests as settled
4. **Receipt** — Immutable on-chain receipt with HSP request ID

Every payment generates an on-chain receipt containing:
- HSP request ID (bytes32)
- Recipient address
- Amount + token
- Timestamp
- Cycle number

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Framer Motion, Canvas animations |
| Web3 | wagmi v2, viem, RainbowKit |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Deployment | Vercel, HashKey Chain |

## License

MIT
