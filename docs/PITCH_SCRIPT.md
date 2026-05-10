# HashPay Confidential — 3-Minute Pitch Script

For the Zama Developer Program Season 2 Builder Track submission video.

## Setup before recording

Two browser windows side-by-side:

1. The existing HashPay employer dashboard on HashKey Chain.
2. The new `/confidential` page on Sepolia FHEVM.

A small terminal at the bottom showing the chain explorers.

## Script (target 3:00)

### 0:00–0:25 — The problem

> Salary advances are a $40-billion-dollar business. They're also a privacy
> nightmare. To get one, you hand a lender your full payroll: salary
> amount, employer, repayment history, credit score. The lender keeps it.
> The lender's data broker keeps it. The lender's analytics partners keep
> it.
>
> Onchain finance is supposed to fix this. But on a public blockchain,
> "compliant payroll" means broadcasting every salary to the world. We're
> at $27 billion in tokenized RWA precisely because confidentiality
> remains the missing layer.

### 0:25–0:50 — The solution in one sentence

> HashPay Confidential is a payroll-backed credit primitive where the
> salary, the credit score, and the requested loan amount are *all*
> encrypted, and the underwriting decision happens entirely under FHE.
> The lender approves or denies you without ever seeing a single number.

[Cut to architecture diagram from `ARCHITECTURE_CONFIDENTIAL.md`.]

### 0:50–1:30 — Demo: employer sets an encrypted salary

[Window 2, /confidential, employer wallet connected.]

> The employer types a salary — $5,000 a month. The frontend encrypts
> that locally using the Zama relayer SDK. What goes on-chain is a
> ciphertext handle and a proof. The salary value never touches the
> wire.

[Click "Set encrypted salary." Show the tx on Sepolia explorer — calldata
is opaque ciphertext.]

> The employer sees the value because they have the ACL key. The
> employee sees it because the contract granted them the key. Nobody
> else does — not the protocol, not me as the operator, not Etherscan.

### 1:30–2:20 — Demo: borrower requests an encrypted advance

[Switch to employee wallet.]

> Now the employee asks for $1,200. They encrypt the amount client-side
> and call `requestAdvance`. The contract fetches the encrypted score
> from the reputation registry, the encrypted salary from the salary
> index, and computes:
>
>   approved = (score >= 600) AND (salary >= amount * 3)
>
> All under FHE. The result is an encrypted boolean. The contract uses
> `FHE.select` to pick between the requested amount and zero, then mints
> that encrypted value as cUSDT — Zama's ERC-7984 confidential token.

[Show the tx on Sepolia. Same event emitted regardless of approval.]

> Watch the event. It's the same event whether I was approved or denied.
> The chain reveals nothing.

[Click "decrypt my balance."]

> But I can decrypt my own cUSDT balance — and there it is, $1,200,
> approved.

### 2:20–2:50 — Why it doesn't disrupt HashKey Chain

[Switch to window 1.]

> HashPay's existing payroll execution still runs on HashKey Chain in
> plaintext USDT, exactly as it did before. We didn't modify a single
> HSK contract. The confidential layer is purely additive — a
> read-only relayer mirrors HSK events to Sepolia, encrypts the credit
> score client-side, and forwards it. If the FHE stack disappears
> tomorrow, HashKey payroll keeps running.
>
> That's the integration story: HSK for execution, Sepolia FHEVM for
> confidentiality. Best of both rails.

### 2:50–3:00 — Close

> HashPay Confidential. Real RWA cashflows, real credit, zero leakage.
> Built on the Zama Protocol. Code's open at github.com/[org]/hsp_payroll.
>
> Thanks.

## B-roll suggestions

- Block explorer showing the opaque ciphertext calldata.
- Side-by-side: HSK plaintext payroll vs Sepolia confidential salary.
- A short cut of the FHE comparison code in `ConfidentialAdvance.sol`.
- A still of the `PITCH` line: "score, salary, amount — all encrypted."

## Submission links

- Live frontend: `https://<deployment>/confidential`
- Sepolia contracts: see `fhevm/deployments.json`
- Demo video (record via the script above)
- GitHub repo: `https://github.com/<org>/hsp_payroll`
