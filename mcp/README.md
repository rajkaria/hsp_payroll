# @hashpay/mcp-server

Model Context Protocol server for the **HashPay Income Protocol**.

Exposes 25 tools that let any LLM agent (Claude Desktop, Cursor, a custom Agent-SDK loop, …) or any backend script read and write the HashPay primitives — payroll, reputation, yield, earned-wage advances, compliance hooks, salary oracle — across every supported EVM chain.

> *"An agent manager hires three research sub-agents, pays them per-second as they work, checks each one's on-chain reputation before re-hiring, and lets the highest-rep one borrow an earned-wage advance to cover a Claude API bill — all via MCP tool calls."*

---

## Install

```bash
npm install -g @hashpay/mcp-server
# or run ad-hoc:
npx -y @hashpay/mcp-server
```

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) / `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "hashpay": {
      "command": "npx",
      "args": ["-y", "@hashpay/mcp-server"],
      "env": {
        "HASHPAY_MODE": "read"
      }
    }
  }
}
```

Full config variants (write mode with private key, Ledger, WalletConnect) in [`examples/claude-desktop-config.json`](./examples/claude-desktop-config.json).

Restart Claude Desktop. Ask *"What's my HashPay reputation on Sepolia? My address is 0x…"* — Claude will call `hashpay_get_reputation`.

## Configuration

All config is via env vars.

| Variable | Values | Default | Purpose |
|---|---|---|---|
| `HASHPAY_MODE` | `read` \| `dry-run` \| `write` | `read` | Safety gate. `dry-run` simulates writes without sending. |
| `HASHPAY_SIGNER` | `privateKey` \| `ledger` \| `walletconnect` | `privateKey` | Who signs write txs. |
| `HASHPAY_PRIVATE_KEY` | `0x…` | — | Required for `privateKey` signer. |
| `HASHPAY_LEDGER_PATH` | BIP-44 path | `44'/60'/0'/0/0` | Ledger derivation path. |
| `HASHPAY_WC_PROJECT_ID` | Reown project ID | — | Required for `walletconnect` signer. Get free at [cloud.reown.com](https://cloud.reown.com). |
| `HASHPAY_DEFAULT_CHAIN` | chainId | `11155111` | Chain used when a tool omits `chainId`. |
| `HASHPAY_ALLOWED_CHAINS` | CSV of chainIds | all | Restrict which chains the MCP will touch. |
| `HASHPAY_MAX_SPEND_PER_SESSION` | integer base units | unlimited | Caps cumulative write-mode spend per process lifetime. |
| `<CHAIN>_RPC_URL` | RPC URL | public default | Override the RPC for any chain (e.g. `SEPOLIA_RPC_URL`). |

### Signers

1. **Private key** — simplest, works anywhere. `HASHPAY_SIGNER=privateKey`.
2. **Ledger hardware wallet** — every tx prompts the device.
   ```bash
   npm install @ledgerhq/hw-app-eth @ledgerhq/hw-transport-node-hid
   export HASHPAY_SIGNER=ledger
   ```
3. **WalletConnect v2** — pairs with a mobile wallet via QR.
   ```bash
   npm install @walletconnect/sign-client
   export HASHPAY_SIGNER=walletconnect
   export HASHPAY_WC_PROJECT_ID=...
   ```
   On first startup the MCP prints a `wc://…` URI to stderr — scan it with your mobile wallet. Session persists for the MCP process lifetime.

## Tool surface

### Read (no signing; 10 tools)

| Tool | Purpose |
|---|---|
| `hashpay_list_chains` | Supported chains + deployed contract map |
| `hashpay_get_payroll` | Full state of one payroll |
| `hashpay_list_payrolls_by_recipient` | All payrolls paying a given address |
| `hashpay_get_reputation` | Income / employer count / on-time rate / milestone |
| `hashpay_verify_minimum_income` | Oracle predicate for lending / visas / gating |
| `hashpay_get_advance_quote` | LTV + APR tier + max borrow |
| `hashpay_get_yield_state` | Vault available balance + accrued yield |
| `hashpay_get_streamed_balance` | Per-second accrual for a STREAM/HYBRID recipient |
| `hashpay_get_compliance_hooks` | List hooks + preview pass/fail with reason |
| `hashpay_get_salary_index` | Chainlink-compatible role/region salary feed |
| `hashpay_get_token_info` | ERC-20 symbol / decimals / balance / allowance |

### Write (requires `HASHPAY_MODE=write`; 11 tools)

| Tool | Purpose |
|---|---|
| `hashpay_whoami` | Signer address + mode + session spend snapshot |
| `hashpay_create_payroll` | Deploy new payroll via Factory |
| `hashpay_fund_payroll` | Approve + transfer into escrow |
| `hashpay_execute_cycle` | Run settlement (compliance → repay → cadence → transfer) |
| `hashpay_add_recipient` / `hashpay_remove_recipient` | Manage recipients |
| `hashpay_set_cadence` | BATCH / STREAM / PULL / HYBRID per recipient |
| `hashpay_claim_stream` | Recipient withdraws accrued stream |
| `hashpay_enable_yield` / `hashpay_claim_yield` | ERC-4626 yield vault on idle funds |
| `hashpay_request_advance` | Earned-wage advance priced to reputation |
| `hashpay_fund_lender_pool` | Lend to advance pool, earn interest |
| `hashpay_attach_compliance_hook` | Attach KYC/Jurisdiction/Sanctions/RateLimit/Timelock |
| `hashpay_attest_cycle` | Post-cycle EAS attestations + reputation writes |
| `hashpay_mint_test_usdt` | Dev-only faucet on testnets |

### Agent sugar (5 tools — the killer demo)

| Tool | Purpose |
|---|---|
| `hashpay_spawn_agent_team` | One-shot: deploy payroll + fund + set STREAM cadence |
| `hashpay_hire_agent` | Add sub-agent + rate + cadence |
| `hashpay_complete_agent_task` | Execute cycle + attest → reputation updates |
| `hashpay_agent_pay_for_compute` | Sub-agent borrows advance for mid-task expenses |
| `hashpay_fire_agent` | Remove sub-agent |

## Safety model

* **Default mode is `read`.** Write tools refuse until `HASHPAY_MODE` is `write` or `dry-run`.
* **Every write simulates first.** If the simulation reverts, no tx is broadcast.
* **Dry-run.** Set `HASHPAY_MODE=dry-run` to get the simulated return value + side effects without sending.
* **Spend cap.** `HASHPAY_MAX_SPEND_PER_SESSION` (in token base units) aborts writes that would push cumulative spend over the cap.
* **Chain allowlist.** `HASHPAY_ALLOWED_CHAINS` rejects tool calls targeting chains outside the list.
* **Response includes `txHash` + `explorerUrl`.** LLMs should surface these to the user for confirmation.

## Supported chains

| Chain | ID | Status |
|---|---|---|
| Sepolia | 11155111 | ✅ Deployed |
| HashKey Testnet | 133 | ✅ Deployed |
| Base Sepolia | 84532 | Ready to deploy |
| Arbitrum Sepolia | 421614 | Ready to deploy |
| Optimism Sepolia | 11155420 | Ready to deploy |
| Polygon Amoy | 80002 | Ready to deploy |
| Ethereum | 1 | Ready to deploy |
| Base | 8453 | Ready to deploy |
| Arbitrum | 42161 | Ready to deploy |
| Optimism | 10 | Ready to deploy |
| Polygon | 137 | Ready to deploy |
| HashKey Chain | 177 | Ready to deploy |

*"Ready to deploy"* = contracts compile + tests pass; run `contracts/scripts/deploy-protocol.ts --network <name>` from the root repo to populate addresses in [`src/chains.ts`](./src/chains.ts).

Non-EVM chains (Solana, Aptos) are out of scope for v1 — will ship as separate packages.

## Examples

```bash
# Read-only — no keys required
HASHPAY_MODE=read npx tsx examples/reputation-lookup.ts 0xYourAddress

# Full agent flow — dry-run first!
HASHPAY_MODE=dry-run HASHPAY_PRIVATE_KEY=0x... npm run example:agent

# Live
HASHPAY_MODE=write HASHPAY_PRIVATE_KEY=0x... npm run example:agent
```

## Local dev

```bash
git clone https://github.com/rajkaria/hsp_payroll
cd hsp_payroll/mcp
npm install
npm run build
npm run dev        # stdio-connected in foreground for tool testing
```

## License

MIT — part of the open-source [HashPay Income Protocol](../README.md).
