import { ethers } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Deploys the HashPay Confidential stack to Sepolia FHEVM.
 *
 * Order matters:
 *   1. ConfidentialUSDT
 *   2. ConfidentialSalaryIndex
 *   3. ConfidentialReputationRegistry
 *   4. PayrollAttestorMirror (oracle for ReputationRegistry)
 *   5. ConfidentialAdvance (depends on the previous four)
 *
 * After deployment, the script wires up roles:
 *   - PayrollAttestorMirror is registered as the oracle of the
 *     ReputationRegistry.
 *   - ConfidentialAdvance is registered as a minter on cUSDT.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const cUSDT = await ethers.deployContract("ConfidentialUSDT");
  await cUSDT.waitForDeployment();
  const cUSDTAddress = await cUSDT.getAddress();
  console.log("ConfidentialUSDT deployed at", cUSDTAddress);

  const salaryIndex = await ethers.deployContract("ConfidentialSalaryIndex");
  await salaryIndex.waitForDeployment();
  const salaryIndexAddress = await salaryIndex.getAddress();
  console.log("ConfidentialSalaryIndex deployed at", salaryIndexAddress);

  const reputationRegistry = await ethers.deployContract("ConfidentialReputationRegistry");
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("ConfidentialReputationRegistry deployed at", reputationRegistryAddress);

  const mirror = await ethers.deployContract("PayrollAttestorMirror");
  await mirror.waitForDeployment();
  const mirrorAddress = await mirror.getAddress();
  console.log("PayrollAttestorMirror deployed at", mirrorAddress);

  const advance = await ethers.deployContract("ConfidentialAdvance", [
    salaryIndexAddress,
    reputationRegistryAddress,
    cUSDTAddress,
    600, // minScore
    3,   // salaryMultiplier (3 months of salary must cover advance)
  ]);
  await advance.waitForDeployment();
  const advanceAddress = await advance.getAddress();
  console.log("ConfidentialAdvance deployed at", advanceAddress);

  // Wiring.
  await (await reputationRegistry.setOracle(mirrorAddress)).wait();
  await (await mirror.setReputationRegistry(reputationRegistryAddress)).wait();
  await (await mirror.setRelayer(deployer.address)).wait(); // demo: deployer is the relayer
  await (await cUSDT.setMinter(advanceAddress, true)).wait();

  const out = {
    network: "sepolia",
    chainId: 11155111,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ConfidentialUSDT: cUSDTAddress,
      ConfidentialSalaryIndex: salaryIndexAddress,
      ConfidentialReputationRegistry: reputationRegistryAddress,
      PayrollAttestorMirror: mirrorAddress,
      ConfidentialAdvance: advanceAddress,
    },
    parameters: {
      minScore: 600,
      salaryMultiplier: 3,
    },
  };

  const outPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote deployments.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
