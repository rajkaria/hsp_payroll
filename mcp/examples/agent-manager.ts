// End-to-end demo: an "agent manager" wallet spawns a team, hires 2 sub-agents,
// completes a task for each, then fires one. Uses the MCP tools *programmatically*
// (imports them directly) to demonstrate the exact same API an LLM would call
// over the MCP protocol.
//
// Run (after `npm install` in mcp/):
//   export HASHPAY_MODE=write
//   export HASHPAY_PRIVATE_KEY=0x...
//   npm run example:agent
//
// Or dry-run safely:
//   HASHPAY_MODE=dry-run HASHPAY_PRIVATE_KEY=0x... npm run example:agent

import { readTools } from "../src/tools/read.js";
import { writeTools } from "../src/tools/write.js";
import { agentTools } from "../src/tools/agent.js";

const tools = [...readTools, ...writeTools, ...agentTools];
const call = (name: string, args: Record<string, unknown>) => {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`No such tool: ${name}`);
  const parsed = t.inputSchema.parse(args);
  return t.handler(parsed);
};

const CHAIN_ID = Number(process.env.DEMO_CHAIN_ID ?? "11155111");

// Two test sub-agent wallets (demo addresses — replace with your own)
const AGENT_ALPHA = (process.env.AGENT_ALPHA ??
  "0x000000000000000000000000000000000000Aaaa") as `0x${string}`;
const AGENT_BETA = (process.env.AGENT_BETA ??
  "0x000000000000000000000000000000000000bbBB") as `0x${string}`;

async function main() {
  console.log("=== HashPay Agent-Manager Demo ===\n");

  // 0. Who am I?
  const me = await call("hashpay_whoami", {});
  console.log("signer:", me);

  // 1. Discover chain config + token address
  const chains = (await call("hashpay_list_chains", {})) as Array<{
    chainId: number;
    status: string;
    core: { MOCK_USDT?: string };
  }>;
  const chain = chains.find((c) => c.chainId === CHAIN_ID);
  if (!chain || chain.status !== "deployed") {
    throw new Error(`Chain ${CHAIN_ID} not deployed`);
  }
  const TOKEN = chain.core.MOCK_USDT!;
  console.log(`chain ${CHAIN_ID} token: ${TOKEN}\n`);

  // 2. Mint test funds to self
  console.log("[step] mint 1000 tUSDT...");
  await call("hashpay_mint_test_usdt", {
    chainId: CHAIN_ID,
    to: (me as { account: string }).account,
    amount: "1000000000", // 1000 × 10^6
  });

  // 3. Spawn an agent team in STREAM cadence with a 500 tUSDT budget
  console.log("[step] spawn agent team...");
  const team = (await call("hashpay_spawn_agent_team", {
    chainId: CHAIN_ID,
    teamName: "Research Squad Alpha",
    token: TOKEN,
    budget: "500000000",
    defaultCadence: "STREAM",
    frequencySeconds: 60,
  })) as { teamId: string | null };
  console.log("team:", team);
  if (!team.teamId) return; // dry-run bails here

  // 4. Hire two sub-agents at different rates
  console.log("[step] hire Agent Alpha @ 10 tUSDT/cycle...");
  await call("hashpay_hire_agent", {
    chainId: CHAIN_ID,
    teamId: team.teamId,
    agent: AGENT_ALPHA,
    ratePerCycle: "10000000",
    cadence: "STREAM",
  });

  console.log("[step] hire Agent Beta @ 15 tUSDT/cycle...");
  await call("hashpay_hire_agent", {
    chainId: CHAIN_ID,
    teamId: team.teamId,
    agent: AGENT_BETA,
    ratePerCycle: "15000000",
    cadence: "HYBRID",
    hybridStreamBps: 5000, // 50% streams, 50% batched
  });

  // 5. Wait for the first cycle to roll, then complete tasks
  console.log("[step] complete Alpha's task (execute + attest)...");
  await call("hashpay_complete_agent_task", {
    chainId: CHAIN_ID,
    teamId: team.teamId,
    agent: AGENT_ALPHA,
    taskSummary: "Drafted Q2 market analysis",
  });

  // 6. Check reputation — should now show cumulative income for Alpha
  const rep = await call("hashpay_get_reputation", {
    chainId: CHAIN_ID,
    address: AGENT_ALPHA,
  });
  console.log("alpha reputation:", rep);

  // 7. Fire Agent Beta (index 1 — index 0 was the placeholder self-recipient)
  console.log("[step] fire Agent Beta...");
  await call("hashpay_fire_agent", {
    chainId: CHAIN_ID,
    teamId: team.teamId,
    agentIndex: 1,
  });

  console.log("\n=== Demo complete ===");
}

main().catch((e) => {
  console.error("Demo failed:", e);
  process.exit(1);
});
