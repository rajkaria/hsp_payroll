import { ethers } from "hardhat";

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

  console.log("\n=== Deployment Complete ===");
  console.log("Copy these to frontend/src/config/contracts.ts:");
  console.log(`HSP_ADAPTER_ADDRESS: "${await hsp.getAddress()}"`);
  console.log(`PAYROLL_FACTORY_ADDRESS: "${await factory.getAddress()}"`);
  console.log(`MOCK_USDT_ADDRESS: "${await usdt.getAddress()}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
