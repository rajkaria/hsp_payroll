import { ethers } from "hardhat";
import { fhevm } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Seeds the demo: registers a single employer/employee pair, sets the
 * employee's encrypted salary, mirrors a few cycles, and forwards an
 * encrypted reputation score. Authorizes ConfidentialAdvance to underwrite
 * against the salary and score.
 */
async function main() {
  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments.json"), "utf8"),
  );
  const { contracts } = deployments;
  const [employer] = await ethers.getSigners();

  const employee = process.env.EMPLOYEE_ADDRESS ?? employer.address;
  console.log("Employer:", employer.address);
  console.log("Employee:", employee);

  const salaryIndex = await ethers.getContractAt(
    "ConfidentialSalaryIndex",
    contracts.ConfidentialSalaryIndex,
  );
  const reputationRegistry = await ethers.getContractAt(
    "ConfidentialReputationRegistry",
    contracts.ConfidentialReputationRegistry,
  );
  const mirror = await ethers.getContractAt(
    "PayrollAttestorMirror",
    contracts.PayrollAttestorMirror,
  );

  // 1. Register the employer/employee link.
  await (await salaryIndex.registerEmployer(employee, employer.address)).wait();
  console.log("Employer registered");

  // 2. Encrypt salary = $5,000.00 (cents = 500_000) and set it.
  const salaryCents = 500_000n;
  const salaryInput = await fhevm
    .createEncryptedInput(contracts.ConfidentialSalaryIndex, employer.address)
    .add64(salaryCents)
    .encrypt();
  await (
    await salaryIndex.setSalary(employee, salaryInput.handles[0], salaryInput.inputProof)
  ).wait();
  console.log("Salary set (encrypted)");

  // 3. Authorize the ConfidentialAdvance contract to read the salary.
  await (
    await salaryIndex.authorizeViewer(employee, contracts.ConfidentialAdvance)
  ).wait();
  console.log("ConfidentialAdvance authorized as salary viewer");

  // 4. Mirror three successful HSK cycles.
  for (let i = 0; i < 3; i++) {
    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes(`cycle-${i}-${employee}`));
    await (await mirror.mirrorCycle(fakeHash, employer.address, employee, i + 1, true)).wait();
  }
  console.log("Mirrored 3 cycles");

  // 5. Forward an encrypted score = 720 (out of 1000).
  const score = 720n;
  const scoreInput = await fhevm
    .createEncryptedInput(contracts.ConfidentialReputationRegistry, contracts.PayrollAttestorMirror)
    .add32(score)
    .encrypt();
  await (
    await mirror.forwardScore(employee, scoreInput.handles[0], scoreInput.inputProof)
  ).wait();
  console.log("Encrypted reputation score forwarded");

  console.log("\nDemo seeded. Borrower can now call requestAdvance.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
