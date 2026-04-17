# HashPay — Project Context

## Session Context (Last updated: 2026-04-16 01:07)

### Current State
- **Deployed + pushed** — commit `5dab807` on `main`, Vercel auto-deploying
- **170 tests passing** across 9 Hardhat suites (55 new)
- **Frontend build green** — Next.js 16 + React 19, all routes generate
- **Both chains live:**
  - Sepolia (11155111): PayrollFactory `0xD15E9249103E9399eF4FBba85f8e695AA36c3b54`, ReputationRegistry `0x91821068e7B7F433261E677D7d16e07d644F12BC`, full protocol stack
  - HashKey Testnet (133): PayrollFactory `0xA601F99D4161062E4d424189376E49C5249792A8`, full protocol stack
- **Addresses wired** in `frontend/src/config/contracts.ts` + `protocol-contracts.ts`
- **Live:** https://hashpay.tech

### Recent Changes
**Contracts (all new under `contracts/contracts/protocol/`):**
- `IPayrollExtension.sol` — hook interfaces (beforeCycle / onSettleRecipient / afterCycle / onRepay / onFund + IComplianceRegistry)
- `AdaptiveCadence.sol` — BATCH/STREAM/PULL/HYBRID payout modes (bonus: HYBRID split payouts)
- `MockYieldVault.sol` + `YieldEscrow.sol` — ERC-4626 vault, 4.5% APY, auto-compound option
- `ReputationRegistry.sol` — per-recipient income stats, Chainlink-compatible oracle (`latestRoundData`, `latestAnswer`)
- `PayrollAdvance.sol` — receipt-backed credit, reputation-tiered LTV (30/50/70%) + APR (1%/1.5%/2%), lender pool with share accounting
- `AdvancePositionNFT.sol` — tokenized lender positions (scaffolded; not wired into fundLenderPool yet)
- `ComplianceHooks.sol` — registry + KYCSBTHook / JurisdictionHook / SanctionsHook / RateLimitHook / TimelockHook / DemoKYCSBT (5 reference hooks + demo SBT)
- `SalaryIndex.sol` + MockPriceFeed — fiat-denominated salary via Chainlink-compatible feeds

**Modified:**
- `contracts/contracts/PayrollFactory.sol` — appended governance + 4 extension slots (`extension`, `yieldExtension`, `advanceExtension`, `complianceRegistry`), refactored `executeCycle` to route per-recipient through hooks (compliance → advance repay → cadence → transfer). Storage-safe; existing behavior preserved when unset.
- `contracts/contracts/PayrollAttestor.sol` — pushes to ReputationRegistry on attest; added `setSchemaUID` for re-deploy compatibility when schema already globally registered.
- `contracts/hardhat.config.ts` — `viaIR: true` for both compilers (stack-too-deep fix for hook-heavy executeCycle).

**Tests (new, 55 tests):**
- `AdaptiveCadence.test.ts` (15), `YieldEscrow.test.ts` (9), `ReputationRegistry.test.ts` (11)
- `PayrollAdvance.test.ts` (9), `ComplianceHooks.test.ts` (9), `SalaryIndex.test.ts` (2)

**Deploy:**
- `contracts/scripts/deploy-protocol.ts` — end-to-end deploy; resilient to already-registered EAS schema (computes deterministic UID and calls `setSchemaUID` fallback)

**Frontend (new):**
- `config/protocol-contracts.ts` — per-chain protocol address map (filled for 133 + 11155111)
- `config/protocol-abis.ts` — ABIs for REPUTATION_REGISTRY, ADAPTIVE_CADENCE, YIELD_ESCROW, PAYROLL_ADVANCE, COMPLIANCE_REGISTRY
- `hooks/useProtocol.ts` — chain-aware protocol address resolver
- `components/doc-shell.tsx` — typography-less docs article shell (avoids @tailwindcss/typography dep)
- `components/cadence-selector.tsx` — BATCH/STREAM/PULL/HYBRID mode picker with live accrual ticker
- `app/protocol/page.tsx` — primitive showcase with composability code sample
- `app/reputation/[address]/page.tsx` — public income identity (SVG chart, milestones, shareable URL)
- `app/lender/page.tsx` — lender pool deposit/withdraw
- `app/docs/{cadence,yield,reputation,advances,hooks,salary-index}/page.tsx` — per-primitive docs

**Frontend (modified):**
- `app/page.tsx` — hero rewritten ("The Income Protocol"), added `/protocol` nav, new Protocol Primitives grid section
- `app/docs/page.tsx` — new "The Income Protocol" section with links to per-primitive docs
- `config/contracts.ts` — both chains point to new factory/attestor/USDT addresses

**Docs:**
- `README.md` rewritten — protocol narrative, architecture diagram, bonus list, deploy instructions, extensibility guide

### Next Steps
1. **Verify production** — visit https://hashpay.tech, connect wallet, confirm Sepolia + HashKey both resolve protocol addresses. Check `/protocol`, `/reputation/[someAddress]`, `/lender`, `/docs/cadence`.
2. **Seed demo data** — run a few payrolls end-to-end per chain so reputation pages have real data for judges. Script idea: `scripts/seed-demo.ts`.
3. **Contract verification** — verify all deployed contracts on Sepolia Etherscan + HashKey explorer (`npx hardhat verify --network sepolia <addr> <args>`).
4. **Wire cadence selector into employee dashboard** — `components/cadence-selector.tsx` exists but isn't referenced yet by `app/employee/page.tsx`.
5. **Wire advance slider into employee dashboard** — similar; need a small UI block using `PAYROLL_ADVANCE_ABI.maxAdvanceFor + requestAdvance`.
6. **Wire compliance hook attach UI** — employer dashboard needs a "Compliance" tab using `COMPLIANCE_REGISTRY_ABI.attachHook/getHooks`.
7. **Wire yield toggle** — on payroll create/detail: `YIELD_ESCROW_ABI.enableYield`.
8. **Record 3-min demo** — script in original spec §6 ("Hook → S.1 → S.2 → S.3 → A.4 → A.5 → Close").
9. **Update Devpost / submission portal** with new "Income Protocol" positioning + architecture diagram.
10. **Low priority cleanup** — wire `AdvancePositionNFT` to PayrollAdvance (mint on deposit, burn on withdraw), convert `RateLimitHook` into a post-settle mutating hook if accumulation is actually needed.

### Key Decisions
- **Extension hook pattern** (not V2 factory or upgradeable proxy): PayrollFactory stores 4 optional extension addresses, settable by governance. When unset, behavior = original. When set, `executeCycle` routes through them in order (compliance → advance repay → cadence → transfer → yield before-cycle). Storage-append-safe; doesn't corrupt existing deployed state.
- **viaIR: true**: required to compile `executeCycle` once all hook interactions landed (stack too deep). No behavior change, larger bytecode.
- **Schema UID deterministic fallback**: EAS Schema Registry reverts on duplicate schema registration. Script now catches, computes `keccak256(abi.encode(SCHEMA, resolver, revocable))` and sets via new `PayrollAttestor.setSchemaUID(uid)` — lets us redeploy attestor cleanly on any chain.
- **ReputationRegistry uses `tx.origin` for oracle reads**: so downstream lending contracts can consume `latestAnswer()` without caller context games. Acceptable for read-only; would be unsafe for state-mutating.
- **Per-recipient failure isolation**: compliance hook failure skips that recipient only; other recipients in same cycle still paid. `RecipientSkipped` event emits with reason.
- **HYBRID cadence implementation**: single `payoutTarget`/`payoutAmount` pair from `onSettleRecipient`, so hybrid takes the full amount into the cadence contract and queues a batch-portion flush via `_batchQueue[payrollId]`, flushed on `claim()` or `flushBatchQueue()`. Keeps the `IPayrollExtension` interface clean.
- **Chain config split into two files** (`contracts.ts` + `protocol-contracts.ts`) so the optional protocol layer doesn't force every chain to have all addresses.

### Deployed addresses
**Sepolia (11155111):** HSPAdapter `0x083b4713...Ac523`, PayrollFactory `0xD15E9249...3b54`, MockUSDT `0xCa521...ec23`, PayrollAttestor `0x93437997...F25B`, ReputationRegistry `0x918210...12BC`, AdaptiveCadence `0x2e17e7...Ac1D`, MockYieldVault `0xF44234...C145`, YieldEscrow `0x1A0b9B...2EdA`, PayrollAdvance `0xFE16F2...2eCa`, ComplianceHookRegistry `0x666E5102...35A4`, SalaryIndex `0xf82045...e334`

**HashKey Testnet (133):** HSPAdapter `0xCE3D31...8cF7`, PayrollFactory `0xA601F9...92A8`, MockUSDT `0x85466F...4d5c`, PayrollAttestor `0x7d19a8...D255`, ReputationRegistry `0x083b47...c523`, AdaptiveCadence `0xCa5217...ec23`, MockYieldVault `0xABD74C...3712`, YieldEscrow `0x918210...12BC`, PayrollAdvance `0x443E38...B449`, ComplianceHookRegistry `0x59551F...A702`, SalaryIndex `0x666E51...35A4`

Full addresses in `frontend/src/config/protocol-contracts.ts` + `contracts.ts`.

### Tooling
```bash
# Tests
cd contracts && npx hardhat test   # 170 passing

# Deploy (PRIVATE_KEY + SEPOLIA_RPC_URL in contracts/.env)
npx hardhat run scripts/deploy-protocol.ts --network sepolia
npx hardhat run scripts/deploy-protocol.ts --network hashkeyTestnet

# Frontend
cd frontend && npm run build
```

### Previous Session Notes

**2026-04-14 15:10 — Multi-chain launch + HSP sandbox**
- Deployed PayrollFactory, HSPAdapter, MockUSDT, PayrollAttestor to Sepolia + HashKey Testnet
- Built `useContracts()` hook and chain-aware config
- HSP sandbox mode polished for demo without HSK team API keys
- Vercel auto-deploy from main; commit `d33d121`
- Base Sepolia skipped (faucet was down)
- Next.js 16 `force-dynamic` fix in layout.tsx for WalletConnect SSR issue

Those base addresses are now superseded by the v2 protocol deploy addresses above.
