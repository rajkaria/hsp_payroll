# Zama Integration — HashPay Confidential

## Goal

Add fully homomorphic encryption to HashPay so salaries, credit scores,
and salary-advance amounts can stay private end-to-end, **without
modifying any HashKey Chain contract or the existing USDT payroll
execution flow**.

## Constraints

- HSK contracts in [../contracts](../contracts) are frozen. Nothing in
  this integration touches them.
- USDT continues to settle payroll cycles on HashKey Chain.
- Existing employer/employee dashboards keep working unchanged.
- The new functionality lives behind explicit `/confidential/*` routes
  in the frontend; users opt in.

## Architecture at a glance

```
                ┌──────────────────────────────┐
                │ HashKey Chain (HSK)          │
                │  - PayrollFactory            │
                │  - PayrollAttestor           │   public USDT
                │  - SalaryIndex               │   payroll runs
                │  - ReputationRegistry        │   here. Untouched.
                └────────────┬─────────────────┘
                             │ (read-only events)
                             ▼
                ┌──────────────────────────────┐
                │ Relayer (off-chain, ours)    │
                │  scoring spec = SCORING_SPEC │
                │  scoringHash committed on    │
                │  PayrollAttestorMirror       │
                └────────────┬─────────────────┘
                             │ encrypted updates
                             ▼
                ┌──────────────────────────────────────────────────┐
                │ Sepolia FHEVM                                    │
                │                                                  │
                │  ┌─────────────────────┐ ┌────────────────────┐  │
                │  │ ConfidentialUSDT    │ │ ConfidentialSalary │  │
                │  │ (cUSDT / ERC-7984-) │ │ Index (multi-emp.) │  │
                │  └────────┬────────────┘ └────────┬───────────┘  │
                │           │                       │              │
                │  ┌────────▼───────────────────────▼───────────┐  │
                │  │ ConfidentialAdvance                        │  │
                │  │  - underwriting (score+salary+limit+KYC)   │  │
                │  │  - repay / accrual / streak-tier rates     │  │
                │  │  - encrypted credit limit + collateral     │  │
                │  └────────┬─────────────────────────┬─────────┘  │
                │           │                         │            │
                │  ┌────────▼─────┐  ┌────────────────▼─────────┐  │
                │  │ ConfidentialAdvancePositionNFT            │  │
                │  │ (encrypted, transferable claims)          │  │
                │  └───────────────────────────────────────────┘  │
                │                                                  │
                │  ┌──────────────────┐ ┌──────────────────────┐   │
                │  │ ConfidentialPayrollRoster (batch payroll) │   │
                │  └──────────────────┘ └──────────────────────┘   │
                │                                                  │
                │  ┌──────────────┐ ┌────────────┐ ┌────────────┐  │
                │  │ IncomeProver │ │ Compliance │ │ Runway     │  │
                │  └──────────────┘ └────────────┘ └────────────┘  │
                │                                                  │
                │  ┌──────────────────────────────┐                │
                │  │ ConfidentialFXOracle          │               │
                │  └──────────────────────────────┘                │
                │                                                  │
                │  ┌──────────────────────────────┐                │
                │  │ ConfidentialReputationRegistry (score+streak) │
                │  └──────────────────────────────┘                │
                │                                                  │
                │  ┌──────────────────────────────┐                │
                │  │ PayrollAttestorMirror         │               │
                │  │  + replay protection          │               │
                │  │  + scoringHash commitment     │               │
                │  └──────────────────────────────┘                │
                └──────────────────────────────────────────────────┘
```

## FHE primitives we lean on

| Primitive                    | HashPay use                                  |
| ---------------------------- | -------------------------------------------- |
| `euint64` / `euint32` + ACL  | Salary, balance, score, streak, principal    |
| `FHE.ge / le / and / select` | Underwriting, KYC gate, rate-tier selection  |
| `externalEuint*` + proof     | Client-encrypted inputs from borrowers       |
| `ebool` ACL hand-off         | Selective proof-of-income, position transfer |
| ERC-7984-style `cUSDT`       | Confidential settlement asset                |

## Contracts shipped

Eleven contracts on the FHEVM side, all in
[`../fhevm/contracts`](../fhevm/contracts):

### Core

1. **ConfidentialUSDT** — minimal ERC-7984-style cUSDT. Encrypted
   balances. Authorized minters and *debit-ers* (used by repayment and
   roster flows).
2. **ConfidentialSalaryIndex** — encrypted per-(employee, employer)
   salary record. `salaryOf(employee)` returns the encrypted aggregate
   across **all** employers, so contractors can underwrite against
   their full income without revealing the breakdown.
3. **ConfidentialReputationRegistry** — encrypted credit score
   *and* on-time streak counter. Streak is updated by the relayer per
   HSK cycle.
4. **PayrollAttestorMirror** — one-way HSK→FHEVM bridge. Stores a
   plaintext attestation log keyed by `hskTxHash`, enforces a
   `lastBlockOf[employee]` high-water-mark to prevent replay/reorg
   amplification, and forwards encrypted score + streak updates. The
   on-chain `scoringHash` commits to the published scoring spec.

### Lending / credit

5. **ConfidentialAdvance** — full credit lifecycle.
   - **Underwriting** under FHE:
     `approved = scoreOk AND salaryOk AND limitOk [AND kycOk]`
     where `salaryOk = (amount ≤ (salary + collateral) / multiplier)`.
   - **Encrypted credit limit + outstanding utilization** so a
     borrower can't keep drawing past their cap.
   - **Repayment** (`repay`) — burns cUSDT under FHE, decrements
     outstanding, ticks an encrypted repayment-score.
   - **Interest accrual** — linear, applied on every state transition.
     Rate is selected under FHE from the borrower's encrypted streak:
     `rateGold` if `streak ≥ 12`, `rateSilver` if `≥ 6`, else `rateBronze`.
   - **Collateral** — `postCollateral` and `releaseCollateral` move
     cUSDT in/out under FHE; the borrowing cap rises with collateral.
   - **Compliance gate** — optional `ConfidentialCompliance` AND'd
     into the approval predicate.
6. **ConfidentialAdvancePositionNFT** — encrypted ERC-721. Position
   metadata (principal, rate, status) is stored as ciphertext. Transfer
   hands off the ACL so the new holder can decrypt.

### New confidential primitives

7. **ConfidentialPayrollRoster** — encrypted batch payroll. An employer
   commits a roster of (employee, encrypted amount) pairs and disburses
   in a single tx. Per-employee compensation and the total are never
   revealed. Pairs with the public HSK payroll for users who don't
   need privacy.
8. **IncomeProver** — selective proof-of-income. The employee
   produces an encrypted boolean attesting `salary ≥ threshold` to a
   specified verifier. The verifier decrypts only the boolean.
9. **ConfidentialEmployerRunway** — encrypted runway alerts. The
   employer declares an encrypted per-cycle total; the contract answers
   `hasLowRunway(employer, N)` and `hasAtLeast(employer, N)` as
   ciphertext booleans. Balance and burn rate stay private.
10. **ConfidentialCompliance** — encrypted KYC pass-flag per address.
    `ConfidentialAdvance` ANDs the flag into approval. The blacklist
    itself is never publicly enumerable.
11. **ConfidentialFXOracle** — encrypted FX rate feed (per `bytes6`
    ticker, scaled by 1e6). Lets foreign-currency salaries underwrite
    against an encrypted USD-equivalent without revealing the FX pair
    or the rate.

## Why this is novel

Payroll-backed credit is the canonical privacy-needs-meet-onchain
finance use case Season 2 calls out, and it has no existing
implementation we're aware of. The lift FHE provides:

- **Underwriting blinds the lender.** The lender contract
  (`ConfidentialAdvance`) computes
  `(score ≥ minScore) AND (amount ≤ (salary + collateral) / multiplier) AND (utilization + amount ≤ limit)` over
  ciphertexts. Optionally AND'd with a private KYC flag. It learns
  nothing about the inputs.
- **Disbursement blinds the observer.** The amount sent is `amount` if
  approved, `0` if denied — but the on-chain transfer is identical in
  shape either way. Approval is indistinguishable from denial.
- **Same rails, opt-in privacy.** The HSK execution contracts continue
  to run public USDT payroll for users who don't need privacy. Users
  who do simply opt into the Sepolia confidential dApp; their HSK
  payroll is unaffected.
- **Confidential payroll itself.** `ConfidentialPayrollRoster` lets a
  whole company pay in one transaction without leaking compensation
  bands. This is a privacy primitive that doesn't exist on any other
  payroll protocol we've seen.
- **Reputation without disclosure.** `IncomeProver` lets a borrower
  prove "salary ≥ X" to a third party with an encrypted boolean. The
  third party (a landlord, lender on another protocol, insurer) never
  learns the salary.

## Trust model

- **HSK side** is unchanged: same trust assumptions as before.
- **Relayer** is permissioned, run by the HashPay protocol team.
  - Cannot fabricate cycles — every event is traceable to an HSK
    transaction hash.
  - Cannot steal funds — no spending privileges.
  - Cannot replay cycles — the mirror enforces a strict block
    high-water-mark per employee.
  - Cannot silently switch the scoring formula — `scoringHash` is
    published on-chain in `PayrollAttestorMirror` and rotated only by
    explicit owner action. See [`SCORING_SPEC.md`](SCORING_SPEC.md).
- **FHEVM side** inherits Zama's threshold-decryption trust model.

## What stays plaintext

- HSK chain activity (intentional — that's the public payroll log).
- The relayer's `mirrorCycle` payload (it's already public on HSK).
- `ConfidentialAdvance` parameters: `minScore`, `salaryMultiplier`,
  rate-tier values, `defaultCreditLimit`. Public so borrowers can
  verify the underwriting rules without trusting the operator.
- The list of employers per employee in `ConfidentialSalaryIndex`
  (corresponds to public HSK records).
- The `bytes6` ticker keys in `ConfidentialFXOracle`.

## What is encrypted

- Salary amounts (per-employer and aggregate, `euint64`).
- Credit scores and on-time streaks (`euint32`).
- Requested advance amounts, outstanding principal, accrued interest,
  credit limit, collateral, repayment score (`euint64` / `euint32`).
- KYC pass flags (`ebool`).
- Approval / decision booleans (`ebool`).
- Position NFT principal / rate / status (`euint64` / `euint32`).
- All cUSDT balances (`euint64`).
- Employer per-cycle total payout (`euint64`).
- Income-proof booleans (`ebool`, granted to a single verifier).
- FX rates (`euint64`, scaled by 1e6).

## Files

```
fhevm/
├── contracts/
│   ├── ConfidentialUSDT.sol
│   ├── ConfidentialSalaryIndex.sol
│   ├── ConfidentialReputationRegistry.sol
│   ├── ConfidentialAdvance.sol
│   ├── ConfidentialAdvancePositionNFT.sol
│   ├── ConfidentialPayrollRoster.sol
│   ├── ConfidentialEmployerRunway.sol
│   ├── ConfidentialCompliance.sol
│   ├── ConfidentialFXOracle.sol
│   ├── IncomeProver.sol
│   └── PayrollAttestorMirror.sol
├── scripts/
│   ├── deploy.ts
│   ├── seed-demo.ts
│   ├── request-advance.ts
│   ├── relayer.ts
│   └── wire-frontend.ts
├── test/
│   ├── ConfidentialAdvance.test.ts
│   ├── Repayment.test.ts
│   ├── Roster.test.ts
│   ├── IncomeProver.test.ts
│   ├── Runway.test.ts
│   ├── PositionNFT.test.ts
│   ├── Compliance.test.ts
│   └── Mirror.test.ts
├── hardhat.config.ts
├── package.json
└── README.md

frontend/src/
├── app/confidential/
│   ├── page.tsx                  (employer/employee advance dApp)
│   ├── roster/page.tsx           (encrypted batch payroll)
│   ├── income-prove/page.tsx     (selective proof-of-income)
│   ├── runway/page.tsx           (encrypted runway alerts)
│   └── positions/page.tsx        (encrypted position NFTs)
├── components/confidential/*
└── lib/fhevm/*

docs/
├── ZAMA_INTEGRATION.md           (this file)
├── SCORING_SPEC.md               (relayer scoring formula + hash)
├── ARCHITECTURE_CONFIDENTIAL.md
└── PITCH_SCRIPT.md
```

## Test coverage

The FHEVM workspace ships with 16 passing tests across 7 suites:

```
ConfidentialAdvance — end to end ............................ 2 ✓
ConfidentialAdvance — repayment + collateral + accrual ...... 3 ✓
ConfidentialPayrollRoster — confidential batch payroll ...... 1 ✓
IncomeProver — selective proof-of-income .................... 2 ✓
ConfidentialEmployerRunway — encrypted alerts ............... 2 ✓
ConfidentialAdvancePositionNFT — encrypted position transfer  1 ✓
ConfidentialCompliance — encrypted KYC gate on advance ...... 2 ✓
PayrollAttestorMirror — replay protection + scoring hash .... 3 ✓
                                                              ────
                                                              16 ✓
```

Run: `cd fhevm && npm test`.

## Deployment

`fhevm/scripts/deploy.ts` deploys all eleven contracts in dependency
order and wires roles (mirror as oracle, advance/roster as cUSDT
minter+debitor, position NFT minter, compliance gate). Output is
written to `fhevm/deployments.json`. `wire-frontend.ts` then writes the
matching `NEXT_PUBLIC_*` env vars into `frontend/.env.local`.

## Non-interference invariant

- No HSK contract import, no HSK contract call, no HSK contract write.
- The relayer is the only bridge — and it's read-only on the HSK side.
- Frontend changes are confined to `/confidential/*` routes; the public
  HSK dashboards are unaffected.
