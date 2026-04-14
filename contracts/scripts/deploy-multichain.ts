import { ethers } from "hardhat";

// Chain-specific EAS and SchemaRegistry addresses
const EAS_CONFIG: Record<number, { eas: string; schemaRegistry: string }> = {
  // HashKey Chain Testnet (OP Stack predeploy)
  133: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  // Base Sepolia (OP Stack predeploy)
  84532: {
    eas: "0x4200000000000000000000000000000000000021",
    schemaRegistry: "0x4200000000000000000000000000000000000020",
  },
  // Sepolia (standalone EAS deployment)
  11155111: {
    eas: "0xc2679fBd37d54388cE493f1db75e8dAD8e0b84D5",
    schemaRegistry: "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
  },
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const easConfig = EAS_CONFIG[chainId];
  if (!easConfig) {
    throw new Error(`No EAS config for chain ${chainId}. Supported: ${Object.keys(EAS_CONFIG).join(", ")}`);
  }

  console.log(`\n=== Deploying to chain ${chainId} ===`);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("EAS:", easConfig.eas);
  console.log("SchemaRegistry:", easConfig.schemaRegistry);

  // 1. Deploy HSPAdapter
  const HSPAdapter = await ethers.getContractFactory("HSPAdapter");
  const hsp = await HSPAdapter.deploy();
  await hsp.waitForDeployment();
  console.log("\nHSPAdapter:", await hsp.getAddress());

  // 2. Deploy PayrollFactory
  const PayrollFactory = await ethers.getContractFactory("PayrollFactory");
  const factory = await PayrollFactory.deploy(await hsp.getAddress());
  await factory.waitForDeployment();
  console.log("PayrollFactory:", await factory.getAddress());

  // 3. Authorize PayrollFactory as HSP caller
  const authTx = await hsp.authorizeCaller(await factory.getAddress());
  await authTx.wait();
  console.log("PayrollFactory authorized as HSP caller");

  // 4. Deploy MockERC20
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
  await usdt.waitForDeployment();
  console.log("MockUSDT:", await usdt.getAddress());

  // 5. Deploy PayrollAttestor
  const PayrollAttestor = await ethers.getContractFactory("PayrollAttestor");
  const attestor = await PayrollAttestor.deploy(
    easConfig.eas,
    easConfig.schemaRegistry,
    await factory.getAddress()
  );
  await attestor.waitForDeployment();
  console.log("PayrollAttestor:", await attestor.getAddress());

  // 6. Register attestation schema
  const registerTx = await attestor.registerSchema();
  await registerTx.wait();
  const schemaUID = await attestor.schemaUID();
  console.log("EAS Schema UID:", schemaUID);

  // Output as JSON for easy copy to frontend
  const addresses = {
    chainId,
    HSP_ADAPTER: await hsp.getAddress(),
    PAYROLL_FACTORY: await factory.getAddress(),
    MOCK_USDT: await usdt.getAddress(),
    PAYROLL_ATTESTOR: await attestor.getAddress(),
    EAS: easConfig.eas,
    EAS_SCHEMA_UID: schemaUID,
  };

  console.log("\n=== Deployment Complete ===");
  console.log("\nAdd to frontend/src/config/contracts.ts CHAIN_CONTRACTS:");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
