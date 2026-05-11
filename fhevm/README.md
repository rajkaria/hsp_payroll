# HashPay Confidential — Zama FHEVM Extension

Privacy-preserving payroll-backed credit on Sepolia FHEVM, built as an
**additive layer on top of HashPay**. The HashKey Chain payroll
contracts in [../contracts](../contracts) are not modified — USDT
settlement still runs on HSK exactly as before. This workspace adds an
encrypted metadata mirror plus a novel FHE-gated advance product.

## Why

On a public chain, salary amounts and credit scores are visible to
anyone. For payroll-backed credit to scale to real users, both must be
private. FHE makes that possible without giving up onchain settlement.

## What's novel

**FHE-gated salary advances.** A borrower's salary, credit score, and
the requested advance amount are all encrypted. The contract underwrites
the loan using FHE comparisons — `score >= minScore AND amount * 3 <= salary` —
and produces an encrypted disbursement (`amount` if approved, `0` if
denied). Disbursement happens in `cUSDT` (ERC-7984-style confidential
token). The protocol operator, lender, and external observers learn
nothing about any of the values; only the borrower decrypts the result.

A denial and an approval emit an identical event. Denial is
indistinguishable from approval on-chain.

## Architecture

```
HashKey Chain (unchanged)               Sepolia FHEVM (new)
─────────────────────────              ──────────────────────────
PayrollFactory ──CycleExecuted──┐      ConfidentialSalaryIndex
PayrollAttestor                 │      ConfidentialReputationRegistry
ReputationRegistry              │      ConfidentialAdvance
SalaryIndex                     │      ConfidentialUSDT (cUSDT)
                                │      PayrollAttestorMirror ◄──── relayer
                                └─────────────────────────────────────┘
```

The relayer is the only cross-chain piece. It listens for
`CycleExecuted` events on HSK, posts plaintext cycle attestations to
`PayrollAttestorMirror`, and forwards a freshly-computed *encrypted*
credit score to `ConfidentialReputationRegistry`. The score-derivation
logic lives entirely off-chain in the relayer; only ciphertext touches
FHEVM state.

See [docs/ARCHITECTURE_CONFIDENTIAL.md](../docs/ARCHITECTURE_CONFIDENTIAL.md)
and [docs/ZAMA_INTEGRATION.md](../docs/ZAMA_INTEGRATION.md) for details.

## Contracts

| Contract                          | Purpose                                                |
| --------------------------------- | ------------------------------------------------------ |
| `ConfidentialUSDT.sol`            | ERC-7984-style confidential settlement token.          |
| `ConfidentialSalaryIndex.sol`     | Encrypted salary amounts (mirrors HSK SalaryIndex).    |
| `ConfidentialReputationRegistry.sol` | Encrypted credit scores.                            |
| `ConfidentialAdvance.sol`         | FHE-gated salary advance underwriter and disburser.    |
| `PayrollAttestorMirror.sol`       | Cross-chain attestation ingestion + score forwarder.   |

## Quickstart

```bash
cd fhevm
cp .env.example .env
# Fill in PRIVATE_KEY and (optionally) SEPOLIA_RPC_URL
npm install
npm run compile
npm test                       # local FHEVM mock
npm run deploy:sepolia         # writes deployments.json
npm run seed:sepolia           # registers a demo employer + employee, sets encrypted salary + score
npm run advance:sepolia        # borrower requests an advance; balance is decrypted and printed
```

## Frontend

A new page in the existing Next.js app at `frontend/src/app/confidential`
provides the user-facing flow:

- Connect wallet (RainbowKit, the same connector the rest of HashPay uses)
- Switch network to Sepolia (HSK app continues to use HashKey Chain)
- Request a confidential advance — amount is encrypted client-side via
  `@zama-fhe/relayer-sdk` before being sent to the contract
- Decrypt your own cUSDT balance to see the result

## Security notes

`ConfidentialUSDT` is a **demo-grade** ERC-7984 implementation. For
mainnet, replace it with OpenZeppelin's audited
`@openzeppelin/confidential-contracts` reference, or another vetted
ERC-7984. Everything else is production-shaped but unaudited; do not
move real funds through it without an audit.

## Hackathon submission

This project targets **Zama Developer Program Mainnet Season 2 — Builder
Track** under the *FHE integration in existing dApps* category.
