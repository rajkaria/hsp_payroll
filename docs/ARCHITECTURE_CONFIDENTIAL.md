# HashPay Confidential — Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HashKey Chain (chainId 177) — UNCHANGED                                 │
│                                                                         │
│   PayrollFactory ──► CycleExecuted ──► PayrollAttestor ──► EAS         │
│        │                                                                │
│        ▼                                                                │
│   USDT settlement (employer ⇒ employees)                                │
│                                                                         │
│   SalaryIndex     ReputationRegistry    PayrollAdvance                  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ off-chain relayer (read-only on HSK)
                                   │ writes plaintext attestation +
                                   │ encrypted score on Sepolia
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Sepolia FHEVM (chainId 11155111) — NEW                                  │
│                                                                         │
│   PayrollAttestorMirror                                                 │
│        │                                                                │
│        ├──► ConfidentialReputationRegistry  (euint32 score)             │
│        │                                                                │
│   ConfidentialSalaryIndex (euint64 salary)  ──┐                         │
│                                               │                         │
│   ConfidentialAdvance ◄───────────────────────┘                         │
│        │  underwrites with FHE.ge / FHE.and / FHE.select                │
│        ▼                                                                │
│   ConfidentialUSDT (encrypted balances, ERC-7984-style)                 │
│        │                                                                │
│        ▼                                                                │
│   Borrower decrypts balance via Zama relayer to see disbursement        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Sequence — encrypted advance request

```
Borrower (browser)             ConfidentialAdvance        cUSDT
       │                                │                    │
       │ encrypt amount client-side via │                    │
       │ @zama-fhe/relayer-sdk          │                    │
       │ (handle + proof)               │                    │
       │                                │                    │
       ├───requestAdvance(handle, proof)►                    │
       │                                │                    │
       │                       FHE.fromExternal              │
       │                       ─► euint64 amount             │
       │                                │                    │
       │                       reputationRegistry.scoreOf    │
       │                       salaryIndex.salaryOf          │
       │                       FHE.ge(score, minScore)       │
       │                       FHE.div(salary, multiplier)   │
       │                       FHE.le(amount, max)           │
       │                       FHE.and / FHE.select          │
       │                                │                    │
       │                                ├──confidentialMint──►
       │                                │   (encrypted amt)  │
       │                                │                    │
       │ event ConfidentialDecisionEmitted                   │
       │ (identical regardless of approval)                  │
       │                                │                    │
       │ poll cUSDT.confidentialBalanceOf                    │
       │ ◄───────────────── handle ─────┼────────────────────┤
       │ user decryption via Zama relayer                    │
       │ ─► plaintext amount (or 0 if denied)                │
```

## Threat model

**Adversaries:**
- Public-chain observers (read all events, all calldata, all storage).
- The protocol operator (knows the contract code, controls the relayer
  but does not control the user's wallet).
- A malicious or compromised lender (controls a contract that may try
  to read the borrower's salary or score).

**What's protected (under Zama's threshold trust model):**
- Salary amount: confidentiality from observers and operator. Lender
  contract sees only the ciphertext handle; can compute over it but
  cannot decrypt.
- Credit score: same.
- Advance amount: same.
- Disbursed amount and approval bit: same.

**What's not protected:**
- The fact that an employer/employee relationship exists (public on
  HSK).
- The fact that a borrower has *requested* an advance (event is
  emitted, identical regardless of outcome — but the request itself is
  observable).
- Side-channel timing of cycles on HSK.

## Why each contract exists

- **ConfidentialUSDT** — disbursement asset. Without an encrypted token
  the disbursed amount would leak via standard ERC-20 events.
- **ConfidentialSalaryIndex** — encrypted salary store. Necessary
  because the underwriting rule references salary, and the salary must
  remain private to the employer/employee.
- **ConfidentialReputationRegistry** — encrypted score store. Same
  argument.
- **ConfidentialAdvance** — the only place encrypted underwriting
  logic runs. It does not custody funds: it asks `cUSDT` to mint to the
  borrower in an encrypted amount. This keeps the advance contract
  small and auditable.
- **PayrollAttestorMirror** — cross-chain bridge for cycle attestations
  + score updates. Permissioned. Could be replaced in the future by a
  light client over HSK.

## ACL policy

| Ciphertext              | Allowed parties                                              |
| ----------------------- | ------------------------------------------------------------ |
| salary                  | salary-index contract, employer, employee, advance contract  |
| score                   | reputation-registry contract, borrower, advance contract     |
| amount (encrypted req)  | advance contract, borrower                                   |
| approved (ebool)        | advance contract, borrower                                   |
| disbursed (euint64)     | advance contract, borrower                                   |
| balance (cUSDT)         | cUSDT contract, account holder                               |

The borrower must explicitly call `authorizeViewer(advanceContract)` on
the reputation registry before requesting. This is by design — the
borrower decides which lender contract is allowed to underwrite
against their score, every time the lender changes.

## Why the HSK side does not change

The HSK contracts already do their job: deterministic public payroll
execution in USDT. Privacy is a different requirement layered on top of
that, not a replacement for it. Putting the FHE pieces on Sepolia
keeps the HSK production path stable and lets us iterate on
confidentiality independently. If the user is happy with the public
payroll, they don't go near the confidential dApp.
