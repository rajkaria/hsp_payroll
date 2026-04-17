// Read-only demo — no keys, no signing. Works in HASHPAY_MODE=read (default).
//
// Looks up the reputation of an address on both Sepolia and HashKey Testnet.
//
// Usage:
//   npx tsx examples/reputation-lookup.ts 0xYourAddress

import { readTools } from "../src/tools/read.js";

const call = (name: string, args: Record<string, unknown>) => {
  const t = readTools.find((x) => x.name === name);
  if (!t) throw new Error(`No such tool: ${name}`);
  return t.handler(t.inputSchema.parse(args));
};

async function main() {
  const addr = process.argv[2];
  if (!addr) {
    console.error("Usage: tsx reputation-lookup.ts 0xAddress");
    process.exit(1);
  }

  for (const chainId of [11155111, 133]) {
    console.log(`\n=== Chain ${chainId} ===`);
    const rep = await call("hashpay_get_reputation", {
      chainId,
      address: addr,
    });
    console.log(rep);

    const verified = await call("hashpay_verify_minimum_income", {
      chainId,
      address: addr,
      minAmount: "100000000", // 100 tUSDT
      windowSeconds: 30 * 24 * 3600,
    });
    console.log("earns ≥100 tUSDT / 30 days:", verified);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
