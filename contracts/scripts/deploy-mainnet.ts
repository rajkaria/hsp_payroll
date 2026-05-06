import { ethers } from "hardhat";

/**
 * Mainnet deployment script for HashKey Chain (and Ethereum mainnet later).
 *
 * Differences from deploy-protocol.ts:
 *   - NO MockERC20 deploy. Caller MUST set USDT_ADDRESS env var to the canonical
 *     stablecoin on the target chain.
 *   - NO MockYieldVault / YieldEscrow deploy. Yield primitive is shipped disabled
 *     for v1 (no production ERC-4626 vault on HashKey Chain yet).
 *   - NO MockPriceFeed deploy. SalaryIndex is deployed but no feeds wired.
 *   - NO DemoKYCSBT deploy.
 *   - Optional MULTISIG_ADDRESS: ownership/governance is transferred to it after wiring.
 *
 * Usage:
 *   USDT_ADDRESS=0x... \
 *   MULTISIG_ADDRESS=0x... \
 *   PRIVATE_KEY=... \
 *   npx hardhat run scripts/deploy-mainnet.ts --network hashkeyMainnet
 */

const EAS_CONFIG: Record<number, { eas: string; schemaRegistry: string } | null> = {
  // HashKey Mainnet — fill in once HashKey announces canonical EAS deployment.
  // If null, the script skips PayrollAttestor wiring; on-chain attestations
  // can be enabled later via attestor.setSchemaUID(uid).
  177: null,
  // Ethereum mainnet
  1: {
    eas: "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587",
    schemaRegistry: "0xA7b39296258348C78294F95B872b282326A97BDF",
  },
};

async function main() {
  const usdtAddr = process.env.USDT_ADDRESS;
  if (!usdtAddr) {
    throw new Error("USDT_ADDRESS env var required (canonical stablecoin on target chain)");
  }
  if (!ethers.isAddress(usdtAddr)) {
    throw new Error(`USDT_ADDRESS is not a valid address: ${usdtAddr}`);
  }
  const multisig = process.env.MULTISIG_ADDRESS;
  if (multisig && !ethers.isAddress(multisig)) {
    throw new Error(`MULTISIG_ADDRESS is not a valid address: ${multisig}`);
  }

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("\n=== HashPay MAINNET Deployment ===");
  console.log(`Chain:     ${chainId}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} (native)`);
  console.log(`USDT:      ${usdtAddr}`);
  console.log(`Multisig:  ${multisig ?? "(none — ownership stays with deployer; transfer manually later)"}`);

  // Sanity check — make sure USDT is a real ERC-20
  const usdt = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", usdtAddr);
  try {
    const bal = await usdt.balanceOf(deployer.address);
    console.log(`USDT bal:  ${bal.toString()} (raw)`);
  } catch (e) {
    throw new Error(`USDT_ADDRESS does not appear to be an ERC-20: ${(e as Error).message}`);
  }

  // ---- Core ----
  const HSP = await ethers.getContractFactory("HSPAdapter");
  const hsp = await HSP.deploy();
  await hsp.waitForDeployment();
  console.log("HSPAdapter:        ", await hsp.getAddress());

  const PF = await ethers.getContractFactory("PayrollFactory");
  const factory = await PF.deploy(await hsp.getAddress());
  await factory.waitForDeployment();
  await (await hsp.authorizeCaller(await factory.getAddress())).wait();
  console.log("PayrollFactory:    ", await factory.getAddress());

  // ---- Optional EAS attestor ----
  let attestorAddr = ethers.ZeroAddress;
  let easAddr: string | undefined;
  let schemaUID: string | undefined;
  const easCfg = EAS_CONFIG[chainId];
  if (easCfg) {
    const Att = await ethers.getContractFactory("PayrollAttestor");
    const attestor = await Att.deploy(easCfg.eas, easCfg.schemaRegistry, await factory.getAddress());
    await attestor.waitForDeployment();
    try {
      await (await attestor.registerSchema()).wait();
      schemaUID = await attestor.schemaUID();
    } catch {
      const schema = await attestor.SCHEMA();
      const uid = ethers.solidityPackedKeccak256(
        ["string", "address", "bool"],
        [schema, ethers.ZeroAddress, false],
      );
      await (await attestor.setSchemaUID(uid)).wait();
      schemaUID = uid;
    }
    attestorAddr = await attestor.getAddress();
    easAddr = easCfg.eas;
    console.log("PayrollAttestor:   ", attestorAddr, "schemaUID:", schemaUID);
  } else {
    console.log("PayrollAttestor:   <skipped — no EAS on this chain yet>");
  }

  // ---- Reputation + Cadence + Advance + Compliance (all governance-gated) ----
  const Reg = await ethers.getContractFactory("ReputationRegistry");
  const reg = await Reg.deploy(); await reg.waitForDeployment();
  if (attestorAddr !== ethers.ZeroAddress) {
    await (await reg.setAttestor(attestorAddr)).wait();
    const Att = await ethers.getContractFactory("PayrollAttestor");
    const attestor = Att.attach(attestorAddr);
    await (await (attestor as any).setReputationRegistry(await reg.getAddress())).wait();
  }
  console.log("ReputationRegistry:", await reg.getAddress());

  const AC = await ethers.getContractFactory("AdaptiveCadence");
  const cadence = await AC.deploy(await factory.getAddress()); await cadence.waitForDeployment();
  await (await factory.setExtension(await cadence.getAddress())).wait();
  console.log("AdaptiveCadence:   ", await cadence.getAddress());

  const Adv = await ethers.getContractFactory("PayrollAdvance");
  const adv = await Adv.deploy(await factory.getAddress(), await reg.getAddress());
  await adv.waitForDeployment();
  await (await factory.setAdvanceExtension(await adv.getAddress())).wait();
  console.log("PayrollAdvance:    ", await adv.getAddress());

  const Comp = await ethers.getContractFactory("ComplianceHookRegistry");
  const comp = await Comp.deploy(await factory.getAddress()); await comp.waitForDeployment();
  await (await factory.setComplianceRegistry(await comp.getAddress())).wait();
  console.log("ComplianceRegistry:", await comp.getAddress());

  // Reference compliance hooks — only the proven-working ones.
  // RateLimitHook + TimelockHook are NOT deployed (their `view` check signatures
  // make them no-ops; tracked in audit fix C9/C10 for redesign before mainnet).
  const Juris = await ethers.getContractFactory("JurisdictionHook");
  const juris = await Juris.deploy(); await juris.waitForDeployment();
  console.log("JurisdictionHook:  ", await juris.getAddress());

  const Sanc = await ethers.getContractFactory("SanctionsHook");
  const sanc = await Sanc.deploy(); await sanc.waitForDeployment();
  console.log("SanctionsHook:     ", await sanc.getAddress());

  // SalaryIndex — wired to factory so setFiatSalary is owner-gated. No price feeds yet.
  const SI = await ethers.getContractFactory("SalaryIndex");
  const si = await SI.deploy(); await si.waitForDeployment();
  await (await si.setFactory(await factory.getAddress())).wait();
  console.log("SalaryIndex:       ", await si.getAddress());

  // ---- Ownership transfer to multisig ----
  if (multisig) {
    console.log(`\nTransferring ownership to multisig: ${multisig}`);
    await (await factory.setGovernance(multisig)).wait();
    await (await hsp.transferOwnership(multisig)).wait();
    // Other governance contracts (Reputation/AdaptiveCadence/PayrollAdvance/SalaryIndex/Compliance)
    // own only setters that are non-critical; document a follow-up to rotate them via custom path.
    console.log("→ PayrollFactory.governance & HSPAdapter.owner now set to multisig.");
    console.log("→ Manually rotate ReputationRegistry / SalaryIndex / Compliance / Cadence / Advance");
    console.log("  governance addresses via their respective owner-only setters.");
  }

  console.log("\n=== Deployment summary ===");
  const summary = {
    chainId,
    USDT: usdtAddr,
    HSP_ADAPTER: await hsp.getAddress(),
    PAYROLL_FACTORY: await factory.getAddress(),
    PAYROLL_ATTESTOR: attestorAddr,
    EAS: easAddr,
    EAS_SCHEMA_UID: schemaUID,
    REPUTATION_REGISTRY: await reg.getAddress(),
    ADAPTIVE_CADENCE: await cadence.getAddress(),
    PAYROLL_ADVANCE: await adv.getAddress(),
    COMPLIANCE_REGISTRY: await comp.getAddress(),
    JURISDICTION_HOOK: await juris.getAddress(),
    SANCTIONS_HOOK: await sanc.getAddress(),
    SALARY_INDEX: await si.getAddress(),
    GOVERNANCE: multisig ?? deployer.address,
  };
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nNext steps:");
  console.log("  1) Verify all contracts on the chain explorer (npx hardhat verify ...)");
  console.log("  2) Update frontend/src/config/contracts.ts with these addresses");
  console.log("  3) If multisig was passed, confirm governance rotation succeeded");
  console.log("  4) Run a $1 end-to-end smoke test before public launch");
  console.log("  5) Apply for HSP merchant credentials (HSP_API_KEY etc.)");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
