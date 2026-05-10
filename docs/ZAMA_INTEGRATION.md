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
- The new functionality lives behind an explicit "Confidential" page in
  the frontend; users opt in.

## Building blocks

Zama Protocol gives us four primitives that map cleanly to HashPay's
needs:

| FHE primitive                | HashPay use                                  |
| ---------------------------- | -------------------------------------------- |
| `euint64` ciphertext + ACL   | Encrypted fiat salary, encrypted balance     |
| `euint32` ciphertext + ACL   | Encrypted credit score                       |
| `FHE.ge / le / and / select` | Underwriting without decryption              |
| `externalEuint*` + proof     | Client-encrypted inputs (amount, salary, …)  |
| ERC-7984 (`cUSDT`)           | Confidential settlement asset for advances   |

## What we built

Five contracts plus a relayer (see [`fhevm/contracts`](../fhevm/contracts)
and [`fhevm/scripts/relayer.ts`](../fhevm/scripts/relayer.ts)). Together
they implement:

1. **Encrypted salary registry** mirroring HSK's `SalaryIndex`. The
   employer encrypts the amount client-side and writes only the
   ciphertext; both employer and employee receive ACL permission to
   decrypt. Other contracts can be granted permission via
   `authorizeViewer`.

2. **Encrypted reputation registry** mirroring HSK's
   `ReputationRegistry`. The numeric score (0..1000) lives only as
   `euint32`; the borrower controls who can underwrite against it.

3. **Confidential advance product**. The novel piece. Underwriting is
   FHE-native — see the explanation under "Why this is novel" below.

4. **ERC-7984 cUSDT** — a minimal confidential token used for
   disbursement. Balances are encrypted; transfers reveal neither
   amounts nor success/failure.

5. **PayrollAttestorMirror** — bridges plaintext HSK cycle events to
   the FHEVM side and forwards an encrypted score derived from the
   mirrored data.

## Why this is novel

Payroll-backed credit is the canonical privacy-needs-meet-onchain
finance use case Season 2 calls out, and it has no existing
implementation we're aware of. The lift FHE provides:

- **Underwriting blinds the lender.** The lender contract
  (`ConfidentialAdvance`) computes
  `(score >= minScore) AND (amount * salaryMultiplier <= salary)` over
  ciphertexts. It learns nothing about the inputs.
- **Disbursement blinds the observer.** The amount sent is `amount` if
  approved, `0` if denied — but the on-chain transfer is identical in
  shape either way. An external observer cannot distinguish approved
  borrowers from denied ones.
- **Same rails, opt-in privacy.** The HSK execution contracts continue
  to run public USDT payroll for users who don't need privacy. Users
  who do simply opt into the Sepolia confidential dApp; their HSK
  payroll is unaffected.

## Trust model

- **HSK side** is unchanged: same trust assumptions as before.
- **Relayer** is permissioned, run by the HashPay protocol team. It
  cannot fabricate cycles (every event is traceable to an HSK
  transaction hash) and cannot steal funds (it has no spending
  privileges). The score it computes is encrypted before posting; the
  scoring formula is open-source in
  [`relayer.ts`](../fhevm/scripts/relayer.ts).
- **FHEVM side** inherits Zama's threshold-decryption trust model.

## What stays plaintext

- HSK chain activity (intentional — that's the public payroll log).
- The relayer's `mirrorCycle` payload (it's already public on HSK).
- Plaintext parameters in `ConfidentialAdvance`: `minScore`,
  `salaryMultiplier`. Public so borrowers can verify the underwriting
  rules without trusting the operator.

## What is encrypted

- Salary amounts (`euint64`).
- Credit scores (`euint32`).
- Requested advance amounts (`euint64`).
- Disbursed cUSDT amounts (`euint64`).
- Approval/denial booleans (`ebool`).
- All cUSDT balances (`euint64`).

## Files

```
fhevm/
├── contracts/
│   ├── ConfidentialUSDT.sol
│   ├── ConfidentialSalaryIndex.sol
│   ├── ConfidentialReputationRegistry.sol
│   ├── ConfidentialAdvance.sol
│   └── PayrollAttestorMirror.sol
├── scripts/
│   ├── deploy.ts
│   ├── seed-demo.ts
│   ├── request-advance.ts
│   └── relayer.ts
├── test/
│   └── ConfidentialAdvance.test.ts
├── hardhat.config.ts
├── package.json
└── README.md

frontend/src/
├── app/confidential/page.tsx
├── components/confidential/*
└── lib/fhevm/*

docs/
├── ZAMA_INTEGRATION.md         (this file)
├── ARCHITECTURE_CONFIDENTIAL.md
└── PITCH_SCRIPT.md
```
