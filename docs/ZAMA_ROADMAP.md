# Zama Integration Roadmap — Future Work

> Companion to [`ZAMA_INTEGRATION.md`](ZAMA_INTEGRATION.md). That doc
> describes what is **built today**. This doc enumerates what can be
> added next, **without modifying any HashKey Chain contract or the
> existing public USDT payroll execution flow**.

## Non-interference rule

Every item below lives on the FHEVM side (Sepolia) or in the relayer.
The HSK contracts in [`../contracts/contracts`](../contracts/contracts)
are frozen. Communication remains one-way: HSK events → relayer →
FHEVM. The frontend continues to gate confidential features behind the
opt-in `/confidential` route.

If a proposal would require an HSK-side change, it is explicitly out of
scope and not listed here.

---

## Tier 1 — closes the loop on the existing advance product

These complete the lifecycle of `ConfidentialAdvance` so it stops being a
one-shot disbursement and becomes a real credit product.

### 1.1 Confidential repayment + amortization

**What.** A `repay(externalEuint64, proof)` function on
`ConfidentialAdvance`. Borrower burns cUSDT under FHE; outstanding
principal (encrypted) is decremented; the borrower's encrypted on-time
streak in `ConfidentialReputationRegistry` ticks up.

**Why it matters.** Today the contract mints disbursement but has no
notion of a position closing. Without repayment, score updates are
one-sided and the advance is effectively a grant.

**Sketch.**
- Add `mapping(address => euint64) outstanding` to
  `ConfidentialAdvance`.
- `requestAdvance` adds `disbursed` to `outstanding`.
- `repay` does `outstanding = FHE.sub(outstanding, FHE.min(outstanding, repayAmount))`.
- ACL: only the borrower can decrypt their own outstanding balance.

**Effort.** ~1 day. New contract method + cUSDT burn flow + frontend
"Repay" panel.

### 1.2 Encrypted credit limit and utilization

**What.** Per-borrower encrypted cap (`euint64 limit`) and current
utilization. The underwriting predicate becomes
`approved = scoreOk AND salaryOk AND (utilization + amount <= limit)`.

**Why.** Currently a borrower with high salary and score can request
unbounded amounts in successive transactions. A real lender enforces a
ceiling.

**Effort.** ~0.5 day on top of 1.1.

### 1.3 Encrypted interest accrual

**What.** Time-based accrual using `block.timestamp - openedAt` as a
plaintext multiplier on an encrypted principal. Output is an encrypted
"amount due now" handle the borrower can decrypt.

**Why.** Lets the product price risk; lays the groundwork for tiered
rates (Tier 3 below).

**Effort.** ~1 day.

---

## Tier 2 — new confidential primitives that reuse existing infra

These add new product surfaces but reuse the cUSDT + relayer plumbing
already shipped.

### 2.1 Confidential payroll batch — `ConfidentialPayrollRoster`

**What.** A new contract where an employer commits an encrypted roster
(N employees, encrypted amount each), funds it with cUSDT, and triggers
a single batch disbursement. Each employee receives an encrypted credit;
no observer can see per-employee compensation or even N.

**Why it matters.** This is a **second flagship demo** of FHE on
HashPay: confidential payroll itself, not just advances. Pairs cleanly
with the existing public payroll on HSK ("public rails by default,
private rails on opt-in").

**Files added.** `fhevm/contracts/ConfidentialPayrollRoster.sol`,
`scripts/seed-roster-demo.ts`, `frontend/app/confidential/roster/page.tsx`.

**Effort.** ~2 days.

### 2.2 Encrypted proof-of-income

**What.** A read-only contract `IncomeProver` exposing
`proveAtLeast(address employee, uint64 threshold) returns (ebool)` that
the employee can grant ACL to a third party (a landlord, another
lender). Caller learns only "salary >= threshold", never the salary.

**Why.** Highest-leverage privacy primitive for users — most income
verification today leaks the exact figure. This is something no other
HashPay-style protocol offers.

**Effort.** ~0.5 day. Tiny contract, big narrative.

### 2.3 Confidential employer runway

**What.** Mirror of the public "runway" UI but encrypted: employer
pre-funds cUSDT, and `runwayCycles = encBalance / encPerCycleTotal` is
computed under FHE. An `ebool lowRunway = FHE.lt(runwayCycles, 2)`
exposes a private alert without revealing balance.

**Why.** The current public dashboard shows employers' burn rate to the
world. A privacy-preserving alternative removes a real adoption blocker
for enterprises.

**Effort.** ~1.5 days.

### 2.4 Confidential `AdvancePositionNFT`

**What.** ERC-721 (or ERC-7984-flavored) where the position metadata
(principal, rate, status) is encrypted. Transferring the NFT transfers
the encrypted claim, gated by ACL hand-off.

**Why.** Makes confidential advances composable — they can be used as
collateral or sold on a secondary market without revealing terms.

**Effort.** ~2 days.

---

## Tier 3 — risk and underwriting depth

These sharpen the underwriting model without giving up privacy.

### 3.1 Encrypted on-time-streak → tiered rate

**What.** `ConfidentialReputationRegistry` already holds an encrypted
score; extend it with `euint32 streak` updated by the relayer on each
on-time HSK cycle attestation. `ConfidentialAdvance` selects an
encrypted rate from a public lookup table:

```solidity
// All branches encrypted; observer learns nothing.
encRate = FHE.select(streak >= 12, lowRate,
          FHE.select(streak >= 6,  midRate, highRate));
```

**Effort.** ~1 day.

### 3.2 Multi-employer aggregation

**What.** Borrowers with multiple employers register each
`(employer, encryptedSalary)` tuple; underwriting sums the encrypted
salaries. `ConfidentialSalaryIndex` already supports per-employee
storage — extend it with a per-borrower aggregated view.

**Why.** Realistic for gig workers and contractors; today the
underwriting only sees one employer.

**Effort.** ~1 day.

### 3.3 Encrypted compliance gating

**What.** A `ConfidentialCompliance` contract storing one `ebool` per
address (KYC-passed or not). `ConfidentialAdvance` ANDs it into the
approval predicate. The blacklist itself is never publicly revealed —
only the borrower learns whether they passed.

**Why.** Lets the protocol enforce sanctions/KYC without publishing the
list, which is itself a privacy leak in the public version
(`ComplianceHooks.sol`).

**Effort.** ~1 day.

### 3.4 Encrypted collateral top-up

**What.** A borrower posts additional cUSDT as encrypted collateral; the
underwriting cap rises proportionally. Collateral is released on
repayment.

**Effort.** ~1.5 days.

---

## Tier 4 — relayer and oracle extensions

These are off-chain or bridge-side changes; no Solidity needed on the
HSK side.

### 4.1 Open the scoring formula behind a public spec

**What.** Today the relayer's scoring is in `relayer.ts` but the
attestation chain (cycle event → score update) isn't independently
auditable. Publish `docs/SCORING_SPEC.md` and add a
`PayrollAttestorMirror.scoringHash()` that returns a content hash of
the spec, set at deploy time.

**Why.** Lets borrowers verify the relayer applied the published
formula, even though the inputs/outputs are encrypted.

**Effort.** ~0.5 day.

### 4.2 Threshold-decryption gating for protocol params

**What.** Move `minScore` and `salaryMultiplier` from owner-set
plaintext to threshold-decrypted (revealed at a configurable cadence).
Lets the protocol tune underwriting without giving the operator a
unilateral lever.

**Effort.** ~1 day, depends on Zama threshold-decrypt API maturity.

### 4.3 FX-denominated salaries

**What.** Relayer pulls a public FX feed (already on HSK or external)
and produces an encrypted USD-equivalent salary. Lets non-USD employers
use the confidential dApp without leaking the FX pair they price in.

**Effort.** ~1 day.

### 4.4 Cycle replay protection on the mirror

**What.** `PayrollAttestorMirror` should track the highest HSK block
processed and reject re-mirrors. Today a misbehaving relayer could
double-count cycles, inflating the encrypted streak.

**Why.** Hardens the bridge before the upcoming production cut.

**Effort.** ~0.5 day.

---

## Tier 5 — frontend and UX

Pure frontend, gated to `/confidential/*` routes. Zero risk to the
public HSK dashboards.

### 5.1 Decryption status indicators
Show clearly when a value on screen is the user's own decryption vs. a
public ciphertext handle they cannot decrypt.

### 5.2 Self-service ACL panel
Let a user grant or revoke decrypt permission for their salary / score
to a specific address (e.g. a lender), with a visible audit log.

### 5.3 "Privacy budget" indicator
Each decryption call has a cost and a leakage surface. Surface a
running counter so users understand how often they (or apps acting on
their behalf) decrypt.

### 5.4 Demo mode
A toggle that fills the confidential dApp with seeded encrypted demo
data so reviewers can exercise the underwriting flow without onboarding.

---

## Out of scope (would require touching HSK)

For the record, these are **not** in this roadmap because they would
modify the frozen HSK contracts:

- Settling HSK payroll cycles directly in cUSDT.
- Adding an HSK-side hook that calls into FHEVM during `executeCycle`.
- Storing any encrypted handle inside an HSK contract.

If any of those become desirable, they require a new HSK contract
generation and a separate audit cycle — handled in
[`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md), not here.

---

## Suggested ordering

1. **1.1 + 1.2 + 1.3** — close the advance lifecycle (3 days).
2. **2.2** — proof-of-income, biggest narrative-per-effort win (0.5 day).
3. **2.1** — confidential payroll batch as a second flagship (2 days).
4. **4.4** — cycle replay protection, hardening before any production push (0.5 day).
5. **3.1 + 3.3** — depth on underwriting (2 days).
6. Everything else as bandwidth allows.

Total Tier 1 + high-leverage Tier 2/4 ≈ **6 dev-days** for a substantial
upgrade with no HSK exposure.
