# HashPay — The Income Protocol

> Six composable primitives that transform payroll into a permissionless foundation for DeFi.

[![Tests](https://img.shields.io/badge/tests-170%20passing-brightgreen)]()
[![Chains](https://img.shields.io/badge/chains-Sepolia%20%7C%20HashKey%20Testnet-blue)]()

**Live:** https://hashpay.tech

---

## What this is

Most payroll projects ship a product. HashPay ships a **protocol** — a stack of standalone on-chain contracts that compose into payroll today, and whatever's next tomorrow.

| Primitive | Tagline | Contract |
|-----------|---------|----------|
| **Cadence** | How money flows | `AdaptiveCadence.sol` |
| **Yield** | What idle money does | `YieldEscrow.sol` + `MockYieldVault.sol` |
| **Reputation** | What receipts compose into | `ReputationRegistry.sol` |
| **Advances** | Receipt-backed credit | `PayrollAdvance.sol` |
| **Compliance** | Pluggable gating | `ComplianceHookRegistry.sol` + hooks |
| **Salary Index** | Fiat-denominated pay | `SalaryIndex.sol` |

Plus: **HSPAdapter** (HashKey Settlement Protocol), **PayrollAttestor** (EAS receipts).

Every read on every primitive is public. Any DeFi/PayFi protocol can compose on top without asking.

---

## Architecture

```
                       ┌─────────────────────┐
 ┌─────────────────────┤   PayrollFactory    ├─────────────────────┐
 │                     └─────────────────────┘                     │
 │ setExtension() / setYieldExtension() / setAdvanceExtension() ...│
 ▼                                                                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Cadence   │   │    Yield    │   │  Advance    │   │ Compliance  │
│  BATCH      │   │  ERC-4626   │   │  LTV tiers  │   │  KYC / Jur. │
│  STREAM     │   │  vault      │   │  APR tiers  │   │  Sanctions  │
│  PULL       │   │  auto-      │   │  lender     │   │  RateLimit  │
│  HYBRID     │   │  compound   │   │  pool       │   │  Timelock   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                           │
                  ┌─────────────┐   ┌─────────────┐
                  │  Attestor   │──▶│ Reputation  │◀── Chainlink-compatible
                  │  (EAS)      │   │  Registry   │    oracle interface
                  └─────────────┘   └─────────────┘
```

---

## Bonus features (beyond spec)

1. **HYBRID cadence** — split payouts (e.g. 50% stream + 50% batch) per recipient.
2. **Yield-funded cycles** — when accrued yield ≥ cycle cost, payroll pays itself.
3. **IncomeOracle adapter** — `ReputationRegistry` exposes Chainlink AggregatorV3 shape (`latestRoundData`, `latestAnswer`) so lending protocols can read income as a price feed natively.
6. **Reputation-priced APR** — interest rate scales by income tier (1% / 1.5% / 2% per cycle).
7. **TimelockHook + RateLimitHook** — two extra institutional-grade compliance primitives.

---

## Tests

```
$ npx hardhat test
  170 passing
```

| Suite | Tests |
|-------|-------|
| PayrollFactory | 68 |
| HSPAdapter | 14 |
| PayrollAttestor | 15 |
| AdaptiveCadence | 15 |
| YieldEscrow + MockYieldVault | 9 |
| ReputationRegistry | 11 |
| PayrollAdvance | 9 |
| Compliance Hooks | 9 |
| SalaryIndex | 2 |

---

## Deploy

```bash
# contracts
cd contracts && npm i
npx hardhat compile
npx hardhat test

# full protocol to Sepolia
SEPOLIA_RPC_URL=... PRIVATE_KEY=... \
  npx hardhat run scripts/deploy-protocol.ts --network sepolia

# frontend
cd frontend && npm i && npm run build
```

Paste the deploy output JSON into `frontend/src/config/protocol-contracts.ts` under the matching `chainId`.

---

## Key pages

- `/` — landing (Income Protocol narrative)
- `/protocol` — primitive showcase
- `/docs/{cadence, yield, reputation, advances, hooks, salary-index}` — deep dives
- `/reputation/[address]` — public income identity (shareable)
- `/lender` — lend liquidity, earn from advances
- `/employer` — create/fund payrolls, attach hooks, enable yield
- `/employee` — dashboard, cadence selector, advance request
- `/faucet` — test tokens

---

## Contract addresses (Sepolia — base layer)

- HSPAdapter: `0xd9d2DCe611547CB5E7D1abF50Bd8C0eF65F8E2de`
- PayrollFactory: `0x87e05D6F1C704f5010Cd6039e1a8D2C341458860`
- MockUSDT: `0x7D7c21E25576F7F7C224A9Ccf55B2E90648f8652`
- PayrollAttestor: `0xb54650cd175E13872cd366eeD9b8e7E94592db21`
- EAS: `0xc2679fBd37d54388cE493f1db75e8dAD8e0b84D5`
- EAS Schema UID: `0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4`

Protocol primitives: deploy with `scripts/deploy-protocol.ts` and paste output into `frontend/src/config/protocol-contracts.ts`.

---

## Extending

**Custom compliance hook**

```solidity
contract MyHook is IComplianceHook {
    function check(address e, address r, uint256 amt, uint256 pid)
        external view returns (bool, string memory) { return (true, ""); }
    function description() external pure returns (string memory) { return "my hook"; }
    function hookId() external pure returns (bytes32) { return keccak256("my-hook-v1"); }
}
```

Deploy, then `ComplianceHookRegistry.attachHook(payrollId, hookAddr)`.

**Custom yield vault** — any ERC-4626 contract; pass to `YieldEscrow.enableYield(payrollId, vault, autoCompound)`.

---

## License

MIT.
