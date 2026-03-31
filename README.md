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
