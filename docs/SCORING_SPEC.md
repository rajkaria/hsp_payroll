# HashPay Confidential — Scoring Specification

> Frozen scoring formula committed to by `PayrollAttestorMirror.scoringHash`.
> Borrowers (and any auditor) can verify that the relayer is applying
> exactly this formula by comparing
> `keccak256("hashpay-scoring-v1")` against the on-chain hash.

## Inputs

The off-chain relayer derives a borrower's encrypted credit score from
public HSK payroll-cycle attestations. The inputs are:

| Symbol | Source                                  | Meaning                                  |
| ------ | --------------------------------------- | ---------------------------------------- |
| `T`    | HSK `PayrollAttestor` events            | Total cycles attested for the borrower   |
| `S`    | HSK `PayrollAttestor` events            | Successful cycles (executed=true)        |
| `K`    | HSK `SalaryIndex` first-write timestamp | Tenure in months                         |
| `M`    | Recent successful cycles (last 12)      | Successful cycles in the last 12 months  |
| `D`    | `lastBlockOf` watermark                 | Most recent attested HSK block           |

## Formula (v1)

```
ratio       = T == 0 ? 0 : (S * 1000) / T            // 0..1000
tenureBonus = min(K * 5, 100)                        // capped at 100
recency     = M >= 6 ? 100 : (M * 100) / 6           // 0..100
base        = ratio * 0.7 + tenureBonus + recency * 0.3
score       = clamp(base, 0, 1000)
```

The relayer encrypts `score` (`euint32`) and posts it via
`PayrollAttestorMirror.forwardScore`. The encryption happens *before* the
value touches FHEVM state — the relayer never reveals an unencrypted
score.

## Streak (v1)

A separate `streak` counter tracks consecutive on-time cycles:

- On-time cycle (`executed=true`): post `forwardStreak(borrower, +1, reset=false)`.
- Missed cycle (`executed=false`): post `forwardStreak(borrower, 0, reset=true)`.

The encrypted streak feeds `ConfidentialAdvance`'s rate-tier selector
(under FHE):

| Streak       | Tier   | Rate (default) |
| ------------ | ------ | -------------- |
| `streak ≥ 12` | Gold   | 200 bps (2%)   |
| `streak ≥ 6`  | Silver | 500 bps (5%)   |
| `streak < 6`  | Bronze | 900 bps (9%)   |

## Replay protection

Cycles are accepted only when `hskBlock > lastBlockOf[employee]`.
Re-mirroring the same cycle (or a reorg-ed earlier cycle) reverts with
`StaleCycle`. This prevents a misbehaving relayer from inflating the
streak by replaying.

## Hash and rotation

```
scoringHash = keccak256("hashpay-scoring-v1")
```

If the formula changes, the relayer:

1. Publishes a new spec at `docs/SCORING_SPEC.md` (revising this file).
2. Calls `PayrollAttestorMirror.setScoringHash(keccak256("hashpay-scoring-vN"))`.
3. Updates the deployment manifest.

The on-chain hash is the canonical commitment. Off-chain spec drift
without a hash rotation is detectable.

## Trust model

- The relayer is the sole writer for score and streak. It cannot
  fabricate cycles (each is keyed by `hskTxHash` from the public HSK
  log) and cannot steal funds (no spending privileges).
- Borrowers can verify the relayer's published formula matches the
  on-chain hash. If the hash flips without a corresponding spec change,
  any borrower can refuse to grant `authorizeViewer` to lenders and
  effectively withdraw their reputation.
- The threshold-decryption trust model of FHEVM applies to all
  encrypted values stored on chain.
