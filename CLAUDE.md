# HashPay — Project Context

## Session Context (Last updated: 2026-04-16 00:40)

### Current State
- **Protocol build complete** — 170 tests passing across 9 suites
- **Frontend builds clean** — all new routes generate (Next 16 + React 19)
- **Six primitives shipped**: Cadence, Yield, Reputation, Advances, Compliance, Salary-Index
- **Bonus features included**: HYBRID cadence, Chainlink-compatible IncomeOracle, reputation-priced APR, TimelockHook, RateLimitHook
- **NOT yet deployed to testnets** — run `scripts/deploy-protocol.ts` next
- **NOT yet committed to git**

### Sprint log
- Sprint 0: extension hooks in PayrollFactory (governance + `extension`/`yieldExtension`/`advanceExtension`/`complianceRegistry` slots) ✅
- Sprint 1: AdaptiveCadence.sol + 15 tests (BATCH/STREAM/PULL/HYBRID) ✅
- Sprint 2: MockYieldVault.sol + YieldEscrow.sol + 9 tests (ERC-4626 wrapper, 4.5% APY) ✅
- Sprint 3: ReputationRegistry.sol + 11 tests + PayrollAttestor wired ✅
- Sprint 4: Full test suite cross-check (170 green) ✅
- Sprint 5: PayrollAdvance.sol + 9 tests (lender pool, LTV tiers, repay hook) ✅
- Sprint 6: ComplianceHookRegistry + KYC/Jurisdiction/Sanctions/RateLimit/Timelock hooks + 9 tests ✅
- Sprint 7: SalaryIndex.sol + MockPriceFeed + 2 tests ✅
- Sprint 8: Frontend — `/protocol`, `/reputation/[address]`, `/lender`, 6 docs pages, landing overhaul, README rewritten ✅
- Sprint 9 (TODO): deploy to Sepolia + HashKey, fill protocol-contracts.ts, commit, push

### New contract files
- `contracts/contracts/protocol/IPayrollExtension.sol` — hook interfaces
- `contracts/contracts/protocol/AdaptiveCadence.sol`
- `contracts/contracts/protocol/MockYieldVault.sol`
- `contracts/contracts/protocol/YieldEscrow.sol`
- `contracts/contracts/protocol/ReputationRegistry.sol`
- `contracts/contracts/protocol/PayrollAdvance.sol`
- `contracts/contracts/protocol/AdvancePositionNFT.sol`
- `contracts/contracts/protocol/ComplianceHooks.sol` (registry + 5 reference hooks + DemoKYCSBT)
- `contracts/contracts/protocol/SalaryIndex.sol`
- `contracts/scripts/deploy-protocol.ts`

### Modified contract files
- `contracts/contracts/PayrollFactory.sol` — extension hook routing in executeCycle, new governance, 4 extension slots
- `contracts/contracts/PayrollAttestor.sol` — pushes to ReputationRegistry on attest
- `contracts/hardhat.config.ts` — `viaIR: true` (stack-too-deep fix)

### New test files (55 new tests)
- `contracts/test/AdaptiveCadence.test.ts` (15)
- `contracts/test/YieldEscrow.test.ts` (9)
- `contracts/test/ReputationRegistry.test.ts` (11)
- `contracts/test/PayrollAdvance.test.ts` (9)
- `contracts/test/ComplianceHooks.test.ts` (9)
- `contracts/test/SalaryIndex.test.ts` (2)

### Frontend — new files
- `frontend/src/config/protocol-contracts.ts` — per-chain protocol address map (needs filling after deploy)
- `frontend/src/config/protocol-abis.ts` — ABIs for all new primitives
- `frontend/src/hooks/useProtocol.ts`
- `frontend/src/components/doc-shell.tsx`
- `frontend/src/components/cadence-selector.tsx`
- `frontend/src/app/protocol/page.tsx`
- `frontend/src/app/reputation/[address]/page.tsx`
- `frontend/src/app/lender/page.tsx`
- `frontend/src/app/docs/{cadence,yield,reputation,advances,hooks,salary-index}/page.tsx`

### Frontend — modified files
- `frontend/src/app/page.tsx` — landing hero rewritten ("The Income Protocol"), added `/protocol` nav link, Protocol Primitives grid section
- `frontend/src/app/docs/page.tsx` — new Protocol section with links to per-primitive docs

### Docs
- `README.md` — fully rewritten with protocol narrative, architecture diagram, bonus features, deploy instructions

### Next Steps (Sprint 9)
1. Deploy protocol to Sepolia: `npx hardhat run scripts/deploy-protocol.ts --network sepolia`
2. Deploy protocol to HashKey Testnet: same script, `--network hashkeyTestnet`
3. Paste addresses into `frontend/src/config/protocol-contracts.ts`
4. Verify contracts on block explorers
5. Git commit + push — Vercel auto-deploys
6. Record 3-min demo video (script in spec §6)
7. Update Devpost submission

### Known cleanup items (low-priority)
- `AdvancePositionNFT.sol` exists but not yet wired into `PayrollAdvance.fundLenderPool` (would mint NFT on deposit, burn on withdraw). Documentation calls this out as a bonus; ship without for now.
- `RateLimitHook` uses `view` check — can gate but not accumulate; would need a separate post-settle callback for true per-day accumulation across cycles.
- Hooks currently evaluated in view context only; state-mutating hooks would need a different dispatch pattern.

### Key Architectural Decisions
- **viaIR: true** in hardhat.config — required to compile `executeCycle` with all hook calls (stack too deep otherwise). No behavioral change.
- **Extension hook pattern** — `PayrollFactory` optionally calls `extension`, `yieldExtension`, `advanceExtension`, and `complianceRegistry`. Each is pluggable (settable by governance). Unset → exact backward-compatible behavior.
- **Per-recipient settlement loop** runs compliance → advance repay → cadence routing → transfer. Failures in compliance skip the recipient; other recipients still paid in same cycle.
- **ReputationRegistry** is one-way (attestor writes, anyone reads) and Chainlink-compatible via `latestRoundData()` exposing `tx.origin`'s income.
- **Storage-safe** — all new state on `PayrollFactory` appended, no struct reordering. Existing deployed state is safe across the upgrade.

### Tooling
```bash
# Tests
cd contracts
npx hardhat test              # 170 passing
npx hardhat test test/<x>.ts  # single suite

# Deploy
SEPOLIA_RPC_URL=https://... PRIVATE_KEY=0x... \
  npx hardhat run scripts/deploy-protocol.ts --network sepolia

PRIVATE_KEY=0x... \
  npx hardhat run scripts/deploy-protocol.ts --network hashkeyTestnet

# Frontend
cd frontend
npm run build     # verifies all routes compile
npm run dev       # local preview
```
