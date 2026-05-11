import { ethers } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Deploys the full HashPay Confidential stack to Sepolia FHEVM.
 *
 * Order matters:
 *   1. ConfidentialUSDT
 *   2. ConfidentialSalaryIndex
 *   3. ConfidentialReputationRegistry
 *   4. PayrollAttestorMirror (oracle for ReputationRegistry)
 *   5. ConfidentialCompliance
 *   6. ConfidentialAdvance (depends on the previous five)
 *   7. ConfidentialPayrollRoster
 *   8. IncomeProver
 *   9. ConfidentialEmployerRunway
 *  10. ConfidentialAdvancePositionNFT
 *  11. ConfidentialFXOracle
 *
 * After deployment, the script wires up roles:
 *   - PayrollAttestorMirror is the oracle of the ReputationRegistry.
 *   - ConfidentialAdvance is registered as a minter + debitor on cUSDT.
 *   - ConfidentialPayrollRoster is registered as a minter + debitor on cUSDT.
 *   - ConfidentialAdvance gates on ConfidentialCompliance.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const cUSDT = await ethers.deployContract("ConfidentialUSDT");
  await cUSDT.waitForDeployment();
  const cUSDTAddress = await cUSDT.getAddress();
  console.log("ConfidentialUSDT", cUSDTAddress);

  const salaryIndex = await ethers.deployContract("ConfidentialSalaryIndex");
  await salaryIndex.waitForDeployment();
  const salaryIndexAddress = await salaryIndex.getAddress();
  console.log("ConfidentialSalaryIndex", salaryIndexAddress);

  const reputationRegistry = await ethers.deployContract("ConfidentialReputationRegistry");
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("ConfidentialReputationRegistry", reputationRegistryAddress);

  const scoringHash = ethers.keccak256(ethers.toUtf8Bytes("hashpay-scoring-v1"));
  const mirror = await ethers.deployContract("PayrollAttestorMirror", [scoringHash]);
  await mirror.waitForDeployment();
  const mirrorAddress = await mirror.getAddress();
  console.log("PayrollAttestorMirror", mirrorAddress);

  const compliance = await ethers.deployContract("ConfidentialCompliance");
  await compliance.waitForDeployment();
  const complianceAddress = await compliance.getAddress();
  console.log("ConfidentialCompliance", complianceAddress);

  const advance = await ethers.deployContract("ConfidentialAdvance", [
    salaryIndexAddress,
    reputationRegistryAddress,
    cUSDTAddress,
    600,
    3,
  ]);
  await advance.waitForDeployment();
  const advanceAddress = await advance.getAddress();
  console.log("ConfidentialAdvance", advanceAddress);

  const roster = await ethers.deployContract("ConfidentialPayrollRoster", [cUSDTAddress]);
  await roster.waitForDeployment();
  const rosterAddress = await roster.getAddress();
  console.log("ConfidentialPayrollRoster", rosterAddress);

  const incomeProver = await ethers.deployContract("IncomeProver", [salaryIndexAddress]);
  await incomeProver.waitForDeployment();
  const incomeProverAddress = await incomeProver.getAddress();
  console.log("IncomeProver", incomeProverAddress);

  const runway = await ethers.deployContract("ConfidentialEmployerRunway", [cUSDTAddress]);
  await runway.waitForDeployment();
  const runwayAddress = await runway.getAddress();
  console.log("ConfidentialEmployerRunway", runwayAddress);

  const positionNFT = await ethers.deployContract("ConfidentialAdvancePositionNFT");
  await positionNFT.waitForDeployment();
  const positionNFTAddress = await positionNFT.getAddress();
  console.log("ConfidentialAdvancePositionNFT", positionNFTAddress);

  const fxOracle = await ethers.deployContract("ConfidentialFXOracle");
  await fxOracle.waitForDeployment();
  const fxOracleAddress = await fxOracle.getAddress();
  console.log("ConfidentialFXOracle", fxOracleAddress);

  // Wiring.
  await (await reputationRegistry.setOracle(mirrorAddress)).wait();
  await (await mirror.setReputationRegistry(reputationRegistryAddress)).wait();
  await (await mirror.setRelayer(deployer.address)).wait();
  await (await fxOracle.setRelayer(deployer.address)).wait();

  await (await cUSDT.setMinter(advanceAddress, true)).wait();
  await (await cUSDT.setDebitor(advanceAddress, true)).wait();
  await (await cUSDT.setMinter(rosterAddress, true)).wait();
  await (await cUSDT.setDebitor(rosterAddress, true)).wait();
  await (await positionNFT.setMinter(advanceAddress, true)).wait();
  await (await advance.setCompliance(complianceAddress)).wait();

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
      ConfidentialCompliance: complianceAddress,
      ConfidentialAdvance: advanceAddress,
      ConfidentialPayrollRoster: rosterAddress,
      IncomeProver: incomeProverAddress,
      ConfidentialEmployerRunway: runwayAddress,
      ConfidentialAdvancePositionNFT: positionNFTAddress,
      ConfidentialFXOracle: fxOracleAddress,
    },
    parameters: {
      minScore: 600,
      salaryMultiplier: 3,
      defaultCreditLimit: 1_000_000,
      rateGoldBps: 200,
      rateSilverBps: 500,
      rateBronzeBps: 900,
      streakGold: 12,
      streakSilver: 6,
      scoringHash,
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
