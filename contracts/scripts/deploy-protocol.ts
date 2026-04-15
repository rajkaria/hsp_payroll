import { ethers } from "hardhat";

const EAS_CONFIG: Record<number, { eas: string; schemaRegistry: string }> = {
  133: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  84532: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  11155111: {
    eas: "0xc2679fBd37d54388cE493f1db75e8dAD8e0b84D5",
    schemaRegistry: "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
  },
};

/**
 * End-to-end protocol deployment: all primitives wired together.
 * Usage: npx hardhat run scripts/deploy-protocol.ts --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const easConfig = EAS_CONFIG[chainId];
  if (!easConfig) throw new Error(`No EAS config for chain ${chainId}`);

  console.log(`\n=== HashPay Protocol → chain ${chainId} ===`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Core
  const HSP = await ethers.getContractFactory("HSPAdapter");
  const hsp = await HSP.deploy(); await hsp.waitForDeployment();
  console.log("HSPAdapter:", await hsp.getAddress());

  const PF = await ethers.getContractFactory("PayrollFactory");
  const factory = await PF.deploy(await hsp.getAddress()); await factory.waitForDeployment();
  await (await hsp.authorizeCaller(await factory.getAddress())).wait();
  console.log("PayrollFactory:", await factory.getAddress());

  const Tok = await ethers.getContractFactory("MockERC20");
  const usdt = await Tok.deploy("Mock USDT", "USDT", 6); await usdt.waitForDeployment();
  console.log("MockUSDT:", await usdt.getAddress());

  const Att = await ethers.getContractFactory("PayrollAttestor");
  const attestor = await Att.deploy(easConfig.eas, easConfig.schemaRegistry, await factory.getAddress());
  await attestor.waitForDeployment();
  let schemaUID: string;
  try {
    await (await attestor.registerSchema()).wait();
    schemaUID = await attestor.schemaUID();
  } catch (e) {
    // Schema already registered globally — compute deterministic UID and set directly
    const schema = await attestor.SCHEMA();
    const uid = ethers.solidityPackedKeccak256(
      ["string", "address", "bool"],
      [schema, ethers.ZeroAddress, false]
    );
    await (await attestor.setSchemaUID(uid)).wait();
    schemaUID = uid;
  }
  console.log("PayrollAttestor:", await attestor.getAddress(), "schemaUID:", schemaUID);

  // Protocol primitives
  const Reg = await ethers.getContractFactory("ReputationRegistry");
  const reg = await Reg.deploy(); await reg.waitForDeployment();
  await (await reg.setAttestor(await attestor.getAddress())).wait();
  await (await attestor.setReputationRegistry(await reg.getAddress())).wait();
  console.log("ReputationRegistry:", await reg.getAddress());

  const AC = await ethers.getContractFactory("AdaptiveCadence");
  const cadence = await AC.deploy(await factory.getAddress()); await cadence.waitForDeployment();
  await (await factory.setExtension(await cadence.getAddress())).wait();
  console.log("AdaptiveCadence:", await cadence.getAddress());

  const Vault = await ethers.getContractFactory("MockYieldVault");
  const vault = await Vault.deploy(await usdt.getAddress(), "HashPay yUSDT", "yUSDT");
  await vault.waitForDeployment();
  console.log("MockYieldVault:", await vault.getAddress());

  const YE = await ethers.getContractFactory("YieldEscrow");
  const ye = await YE.deploy(await factory.getAddress(), await vault.getAddress());
  await ye.waitForDeployment();
  await (await factory.setYieldExtension(await ye.getAddress())).wait();
  console.log("YieldEscrow:", await ye.getAddress());

  const Adv = await ethers.getContractFactory("PayrollAdvance");
  const adv = await Adv.deploy(await factory.getAddress(), await reg.getAddress());
  await adv.waitForDeployment();
  await (await factory.setAdvanceExtension(await adv.getAddress())).wait();
  console.log("PayrollAdvance:", await adv.getAddress());

  const Comp = await ethers.getContractFactory("ComplianceHookRegistry");
  const comp = await Comp.deploy(await factory.getAddress()); await comp.waitForDeployment();
  await (await factory.setComplianceRegistry(await comp.getAddress())).wait();
  console.log("ComplianceHookRegistry:", await comp.getAddress());

  // Reference hooks
  const SBT = await ethers.getContractFactory("DemoKYCSBT");
  const sbt = await SBT.deploy(); await sbt.waitForDeployment();
  const KYC = await ethers.getContractFactory("KYCSBTHook");
  const kyc = await KYC.deploy(await sbt.getAddress()); await kyc.waitForDeployment();
  const Juris = await ethers.getContractFactory("JurisdictionHook");
  const juris = await Juris.deploy(); await juris.waitForDeployment();
  const Sanc = await ethers.getContractFactory("SanctionsHook");
  const sanc = await Sanc.deploy(); await sanc.waitForDeployment();

  const SI = await ethers.getContractFactory("SalaryIndex");
  const si = await SI.deploy(); await si.waitForDeployment();
  console.log("SalaryIndex:", await si.getAddress());

  console.log("\n=== Deployment Complete — paste into frontend/src/config/contracts.ts ===\n");
  console.log(JSON.stringify({
    chainId,
    HSP_ADAPTER: await hsp.getAddress(),
    PAYROLL_FACTORY: await factory.getAddress(),
    MOCK_USDT: await usdt.getAddress(),
    PAYROLL_ATTESTOR: await attestor.getAddress(),
    EAS: easConfig.eas,
    EAS_SCHEMA_UID: schemaUID,
    REPUTATION_REGISTRY: await reg.getAddress(),
    ADAPTIVE_CADENCE: await cadence.getAddress(),
    MOCK_YIELD_VAULT: await vault.getAddress(),
    YIELD_ESCROW: await ye.getAddress(),
    PAYROLL_ADVANCE: await adv.getAddress(),
    COMPLIANCE_REGISTRY: await comp.getAddress(),
    KYC_SBT: await sbt.getAddress(),
    KYC_HOOK: await kyc.getAddress(),
    JURISDICTION_HOOK: await juris.getAddress(),
    SANCTIONS_HOOK: await sanc.getAddress(),
    SALARY_INDEX: await si.getAddress(),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
