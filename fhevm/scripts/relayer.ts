import { ethers, fhevm } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Off-chain relayer that bridges HSK PayrollAttestor events to the
 * Sepolia FHEVM PayrollAttestorMirror.
 *
 * For the demo this is a one-shot script: it reads recent PayrollFactory
 * `CycleExecuted` events from an HSK RPC, posts each as a plaintext
 * cycle attestation to the mirror, and recomputes + forwards an encrypted
 * credit score for each affected borrower.
 *
 * Production note: this is the only piece that talks to both chains. It
 * is operated by the HashPay team or a permissioned attestor set; the
 * trust model is the same as the existing HSK PayrollAttestor.
 */

const HSK_RPC = process.env.HSK_RPC_URL ?? "https://mainnet.hsk.xyz";
const HSK_PAYROLL_FACTORY = process.env.HSK_PAYROLL_FACTORY ?? "";

const FACTORY_EVENT_ABI = [
  "event CycleExecuted(uint256 indexed payrollId, address indexed employer, address indexed employee, uint256 cycleId)",
];

async function main() {
  if (!HSK_PAYROLL_FACTORY) {
    throw new Error("Set HSK_PAYROLL_FACTORY in .env to the HashKey-Chain PayrollFactory address");
  }

  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments.json"), "utf8"),
  );
  const { contracts } = deployments;

  const hskProvider = new ethers.JsonRpcProvider(HSK_RPC);
  const factory = new ethers.Contract(HSK_PAYROLL_FACTORY, FACTORY_EVENT_ABI, hskProvider);

  const fromBlock = Number(process.env.FROM_BLOCK ?? 0);
  const toBlock = await hskProvider.getBlockNumber();
  const events = await factory.queryFilter(factory.filters.CycleExecuted(), fromBlock, toBlock);
  console.log(`Found ${events.length} CycleExecuted events on HSK`);

  const mirror = await ethers.getContractAt("PayrollAttestorMirror", contracts.PayrollAttestorMirror);

  const touched = new Set<string>();
  for (const e of events) {
    const log = e as ethers.EventLog;
    const employer = log.args.employer as string;
    const employee = log.args.employee as string;
    const cycleId = log.args.cycleId as bigint;
    const txHash = log.transactionHash;

    try {
      await (
        await mirror.mirrorCycle(txHash, employer, employee, cycleId, true)
      ).wait();
      console.log(`Mirrored cycle ${cycleId} for ${employee}`);
      touched.add(employee.toLowerCase());
    } catch (err: any) {
      if (String(err?.message ?? "").includes("AlreadyMirrored")) continue;
      throw err;
    }
  }

  // Recompute and forward an encrypted score for each touched borrower.
  for (const addr of touched) {
    const successful = await mirror.successfulCycles(addr);
    const total = await mirror.totalCycles(addr);
    const ratio = total === 0n ? 0n : (successful * 1000n) / total;
    const tenureBonus = total >= 12n ? 50n : total >= 6n ? 25n : 0n;
    const score = ratio + tenureBonus > 999n ? 999n : ratio + tenureBonus;

    const scoreInput = await fhevm
      .createEncryptedInput(contracts.ConfidentialReputationRegistry, contracts.PayrollAttestorMirror)
      .add32(score)
      .encrypt();
    await (await mirror.forwardScore(addr, scoreInput.handles[0], scoreInput.inputProof)).wait();
    console.log(`Forwarded encrypted score=${score} for ${addr}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
