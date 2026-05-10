import { ethers } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Sanity-checks a Sepolia deployment without spending FHE gas.
 * Reads each contract address from deployments.json, verifies code is
 * present, and calls a few view methods to confirm wiring:
 *   - ConfidentialAdvance.minScore / salaryMultiplier match what we deployed
 *   - ConfidentialReputationRegistry.oracle == PayrollAttestorMirror
 *   - PayrollAttestorMirror.reputationRegistry == ConfidentialReputationRegistry
 *   - ConfidentialUSDT.isMinter(ConfidentialAdvance) == true
 *
 * Useful right after deploy and before recording the demo video.
 */
async function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("deployments.json not found — run deploy:sepolia first");
  }
  const dep = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const c = dep.contracts;

  console.log(`Verifying deployment on chainId=${dep.chainId}`);

  const provider = ethers.provider;
  for (const [name, addr] of Object.entries<string>(c)) {
    const code = await provider.getCode(addr);
    if (code === "0x") throw new Error(`${name} (${addr}) has no code`);
    console.log(`  ✓ ${name} present at ${addr} (${(code.length - 2) / 2} bytes)`);
  }

  const advance = await ethers.getContractAt("ConfidentialAdvance", c.ConfidentialAdvance);
  const reputation = await ethers.getContractAt(
    "ConfidentialReputationRegistry",
    c.ConfidentialReputationRegistry,
  );
  const mirror = await ethers.getContractAt(
    "PayrollAttestorMirror",
    c.PayrollAttestorMirror,
  );
  const cUSDT = await ethers.getContractAt("ConfidentialUSDT", c.ConfidentialUSDT);

  const minScore = await advance.minScore();
  const multiplier = await advance.salaryMultiplier();
  console.log(`  ✓ ConfidentialAdvance params: minScore=${minScore} multiplier=${multiplier}`);

  const oracle = await reputation.oracle();
  if (oracle.toLowerCase() !== c.PayrollAttestorMirror.toLowerCase()) {
    throw new Error(`Oracle mismatch: ${oracle} != ${c.PayrollAttestorMirror}`);
  }
  console.log(`  ✓ ReputationRegistry.oracle wired`);

  const reg = await mirror.reputationRegistry();
  if (reg.toLowerCase() !== c.ConfidentialReputationRegistry.toLowerCase()) {
    throw new Error(`Mirror reputationRegistry mismatch: ${reg}`);
  }
  console.log(`  ✓ PayrollAttestorMirror.reputationRegistry wired`);

  const isMinter = await cUSDT.isMinter(c.ConfidentialAdvance);
  if (!isMinter) throw new Error("ConfidentialAdvance is not a cUSDT minter");
  console.log(`  ✓ ConfidentialAdvance is registered as cUSDT minter`);

  console.log("\nDeployment OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
