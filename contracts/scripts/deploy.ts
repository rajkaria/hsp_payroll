import { ethers } from "hardhat";

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021";
const SCHEMA_REGISTRY_ADDRESS = "0x4200000000000000000000000000000000000020";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // Deploy HSPAdapter
  const HSPAdapter = await ethers.getContractFactory("HSPAdapter");
  const hsp = await HSPAdapter.deploy();
  await hsp.waitForDeployment();
  console.log("HSPAdapter deployed to:", await hsp.getAddress());

  // Deploy PayrollFactory
  const PayrollFactory = await ethers.getContractFactory("PayrollFactory");
  const factory = await PayrollFactory.deploy(await hsp.getAddress());
  await factory.waitForDeployment();
  console.log("PayrollFactory deployed to:", await factory.getAddress());

  // Deploy MockERC20 (for testnet)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
  await usdt.waitForDeployment();
  console.log("MockUSDT deployed to:", await usdt.getAddress());

  // Deploy PayrollAttestor (EAS integration)
  const PayrollAttestor = await ethers.getContractFactory("PayrollAttestor");
  const attestor = await PayrollAttestor.deploy(
    EAS_ADDRESS,
    SCHEMA_REGISTRY_ADDRESS,
    await factory.getAddress()
  );
  await attestor.waitForDeployment();
  console.log("PayrollAttestor deployed to:", await attestor.getAddress());

  // Register attestation schema
  const registerTx = await attestor.registerSchema();
  await registerTx.wait();
  const schemaUID = await attestor.schemaUID();
  console.log("EAS Schema UID:", schemaUID);

  console.log("\n=== Deployment Complete ===");
  console.log("Copy these to frontend/src/config/contracts.ts:");
  console.log(`HSP_ADAPTER: "${await hsp.getAddress()}"`);
  console.log(`PAYROLL_FACTORY: "${await factory.getAddress()}"`);
  console.log(`MOCK_USDT: "${await usdt.getAddress()}"`);
  console.log(`PAYROLL_ATTESTOR: "${await attestor.getAddress()}"`);
  console.log(`EAS_SCHEMA_UID: "${schemaUID}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
