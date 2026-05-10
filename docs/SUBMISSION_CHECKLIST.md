# HashPay Confidential — Submission Checklist

Tracks the path from "tests passing locally" to "submitted to Zama
Developer Program Season 2 Builder Track."

Deadline: **2026-05-10 23:59 AOE** (≈ 2026-05-11 12:00 UTC).

## 1. Local sanity (5 min)

- [ ] `cd fhevm && npm install`
- [ ] `npx hardhat compile` → "Compiled 11 Solidity files successfully"
- [ ] `npx hardhat test` → "2 passing"

## 2. Sepolia prerequisites (10 min)

- [ ] Sepolia ETH in your deployer wallet (≥ 0.1 ETH for the full deploy
      + a few demo calls). Get it from https://sepoliafaucet.com or
      https://www.alchemy.com/faucets/ethereum-sepolia.
- [ ] An RPC URL. Options:
      - `https://eth-sepolia.public.blastapi.io` (free, rate-limited)
      - Alchemy / Infura / QuickNode (recommended for the demo)
- [ ] `cp fhevm/.env.example fhevm/.env`, then fill:
      - `PRIVATE_KEY=` (no 0x prefix needed by viem; with 0x prefix is fine for ethers)
      - `SEPOLIA_RPC_URL=`

## 3. Deploy + wire (10 min)

- [ ] `cd fhevm && npm run deploy:sepolia`
      Writes `fhevm/deployments.json` with the 5 contract addresses.
- [ ] `npm run verify:deployment`
      View-only sanity check that wiring is correct.
- [ ] `npm run seed:sepolia`
      Registers a demo employer/employee, sets encrypted salary,
      mirrors three cycles, forwards an encrypted score.
- [ ] `npm run advance:sepolia`
      Submits an encrypted advance request and prints the decrypted
      cUSDT balance. Should print `120000` (= $1,200.00 in cents).

## 4. Frontend (10 min)

- [ ] `npm run wire-frontend`
      Auto-populates `frontend/.env.local` with the deployed addresses.
- [ ] `cd ../frontend && npm install` (if you haven't already)
- [ ] `npm run dev` → open http://localhost:3000/confidential
- [ ] Connect wallet, switch to Sepolia.
- [ ] Employer flow: paste the demo employee address, type "5000", click
      "Set encrypted salary." Confirm two transactions.
- [ ] Employee flow: switch wallets to the employee address, type
      "1200", click "Encrypt & request." Confirm two transactions.
- [ ] Click "Decrypt" on the cUSDT card. Sign the EIP-712 prompt.
      Should show $1,200.00 with a green "Approved" line.

## 5. Record the pitch (15 min)

- [ ] Open `docs/PITCH_SCRIPT.md` next to OBS / Loom / QuickTime.
- [ ] Record the 3-minute walkthrough following the timing in the
      script. Two browser windows side-by-side: existing HashPay
      employer dashboard (window 1) and the new `/confidential` page
      (window 2).
- [ ] Trim, export at 1080p, upload to YouTube unlisted.

## 6. Submit (10 min)

- [ ] Open the Builder Track submission link from the Zama Season 2
      announcement.
- [ ] Fill the form:
      - Project name: **HashPay Confidential**
      - Description (one-liner): "Privacy-preserving payroll-backed
        credit. Salary, credit score, and advance amount all encrypted
        — underwriting runs entirely under FHE."
      - Demo URL: your hosted frontend (`/confidential` route).
      - Repository: `https://github.com/<you>/hsp_payroll`
      - Video: YouTube link.
      - Sepolia contract addresses: paste from `deployments.json`.
- [ ] Submit. Confirm the receipt email.

## 7. Post-submission

- [ ] Tweet/post about the submission with the video and repo links.
- [ ] Add the public submission URL to the project README.

## Common gotchas

- **"ACLNotAllowed()" reverts in tests** — the cross-contract
  `FHE.allowTransient` for cUSDT is required; this is already wired in
  `ConfidentialAdvance.requestAdvance`. If you add a new cross-contract
  FHE op, remember the same pattern.
- **Hardhat 3 ESM error** — make sure your install used the pinned
  versions in `package.json`. `rm -rf node_modules package-lock.json &&
  npm install` if you got Hardhat 3 by accident.
- **"sender doesn't have enough funds"** on Sepolia — top up the
  faucet; FHE ops cost more gas than typical EVM ops.
- **Frontend "ZamaProtocolUnsupported" revert** — you're connected to
  the wrong chain. Switch wallet to Sepolia (11155111).
