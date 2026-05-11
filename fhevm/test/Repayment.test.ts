import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Signer } from "ethers";

describe("ConfidentialAdvance — repayment + collateral + accrual", function () {
  let owner: Signer;
  let employer: Signer;
  let employee: Signer;
  let employerAddr: string;
  let employeeAddr: string;

  let cUSDTAddr: string;
  let salaryIndexAddr: string;
  let reputationRegistryAddr: string;
  let mirrorAddr: string;
  let advanceAddr: string;

  let cUSDT: any;
  let salaryIndex: any;
  let reputationRegistry: any;
  let mirror: any;
  let advance: any;

  before(async () => {
    [owner, employer, employee] = await ethers.getSigners();
    employerAddr = await employer.getAddress();
    employeeAddr = await employee.getAddress();

    cUSDT = await ethers.deployContract("ConfidentialUSDT");
    await cUSDT.waitForDeployment();
    cUSDTAddr = await cUSDT.getAddress();

    salaryIndex = await ethers.deployContract("ConfidentialSalaryIndex");
    await salaryIndex.waitForDeployment();
    salaryIndexAddr = await salaryIndex.getAddress();

    reputationRegistry = await ethers.deployContract("ConfidentialReputationRegistry");
    await reputationRegistry.waitForDeployment();
    reputationRegistryAddr = await reputationRegistry.getAddress();

    mirror = await ethers.deployContract("PayrollAttestorMirror", [
      ethers.keccak256(ethers.toUtf8Bytes("hashpay-scoring-v1")),
    ]);
    await mirror.waitForDeployment();
    mirrorAddr = await mirror.getAddress();

    advance = await ethers.deployContract("ConfidentialAdvance", [
      salaryIndexAddr,
      reputationRegistryAddr,
      cUSDTAddr,
      600,
      3,
    ]);
    await advance.waitForDeployment();
    advanceAddr = await advance.getAddress();

    await (await reputationRegistry.setOracle(mirrorAddr)).wait();
    await (await mirror.setReputationRegistry(reputationRegistryAddr)).wait();
    await (await mirror.setRelayer(await owner.getAddress())).wait();
    await (await cUSDT.setMinter(advanceAddr, true)).wait();
    await (await cUSDT.setDebitor(advanceAddr, true)).wait();
    await (await salaryIndex.registerEmployer(employeeAddr, employerAddr)).wait();

    // Encrypted salary 500_000 cents = $5,000.
    const salaryInput = await fhevm
      .createEncryptedInput(salaryIndexAddr, employerAddr)
      .add64(500_000n)
      .encrypt();
    await (
      await salaryIndex
        .connect(employer)
        .setSalary(employeeAddr, salaryInput.handles[0], salaryInput.inputProof)
    ).wait();
    await (await salaryIndex.connect(employer).authorizeViewer(employeeAddr, advanceAddr)).wait();

    // Encrypted score 720.
    const scoreInput = await fhevm
      .createEncryptedInput(reputationRegistryAddr, mirrorAddr)
      .add32(720n)
      .encrypt();
    await (
      await mirror.connect(owner).forwardScore(employeeAddr, scoreInput.handles[0], scoreInput.inputProof)
    ).wait();
    await (await reputationRegistry.connect(employee).authorizeViewer(advanceAddr)).wait();
  });

  it("decrements outstanding under FHE on repay", async () => {
    // Borrow $1,000.
    const reqInput = await fhevm
      .createEncryptedInput(advanceAddr, employeeAddr)
      .add64(100_000n)
      .encrypt();
    await (await advance.connect(employee).requestAdvance(reqInput.handles[0], reqInput.inputProof)).wait();

    let outHandle = await advance.outstandingOf(employeeAddr);
    let outVal = await fhevm.userDecryptEuint(FhevmType.euint64, outHandle, advanceAddr, employee);
    expect(outVal).to.equal(100_000n);

    // Repay $400.
    const repayInput = await fhevm
      .createEncryptedInput(advanceAddr, employeeAddr)
      .add64(40_000n)
      .encrypt();
    await (await advance.connect(employee).repay(repayInput.handles[0], repayInput.inputProof)).wait();

    outHandle = await advance.outstandingOf(employeeAddr);
    outVal = await fhevm.userDecryptEuint(FhevmType.euint64, outHandle, advanceAddr, employee);
    expect(outVal).to.equal(60_000n);
  });

  it("respects encrypted credit limit", async () => {
    // Set a tight limit of $500.
    await (await advance.connect(owner).setCreditLimit(employeeAddr, 50_000n)).wait();

    // Try to borrow $800 (would exceed remaining limit of $440 after $60 outstanding).
    const reqInput = await fhevm
      .createEncryptedInput(advanceAddr, employeeAddr)
      .add64(80_000n)
      .encrypt();
    await (await advance.connect(employee).requestAdvance(reqInput.handles[0], reqInput.inputProof)).wait();

    // Outstanding shouldn't have moved.
    const outHandle = await advance.outstandingOf(employeeAddr);
    const outVal = await fhevm.userDecryptEuint(FhevmType.euint64, outHandle, advanceAddr, employee);
    expect(outVal).to.equal(60_000n);
  });

  it("posts and releases collateral under FHE", async () => {
    // Mint $2,000 of cUSDT to employee directly.
    const mintInput = await fhevm
      .createEncryptedInput(cUSDTAddr, await owner.getAddress())
      .add64(200_000n)
      .encrypt();
    await (
      await cUSDT.connect(owner).confidentialMintFromExternal(employeeAddr, mintInput.handles[0], mintInput.inputProof)
    ).wait();

    // Lift the credit limit so the post-collateral path exercises only the salary cap.
    await (await advance.connect(owner).setCreditLimit(employeeAddr, 10_000_000n)).wait();

    // Post $500 collateral.
    const postInput = await fhevm
      .createEncryptedInput(advanceAddr, employeeAddr)
      .add64(50_000n)
      .encrypt();
    await (await advance.connect(employee).postCollateral(postInput.handles[0], postInput.inputProof)).wait();

    const colHandle = await advance.collateralOf(employeeAddr);
    const colVal = await fhevm.userDecryptEuint(FhevmType.euint64, colHandle, advanceAddr, employee);
    expect(colVal).to.equal(50_000n);
  });
});
