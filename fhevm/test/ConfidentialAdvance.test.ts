import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { Signer } from "ethers";

describe("HashPay Confidential — end to end", function () {
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

    mirror = await ethers.deployContract("PayrollAttestorMirror");
    await mirror.waitForDeployment();
    mirrorAddr = await mirror.getAddress();

    advance = await ethers.deployContract("ConfidentialAdvance", [
      salaryIndexAddr,
      reputationRegistryAddr,
      cUSDTAddr,
      600, // minScore
      3,   // salaryMultiplier
    ]);
    await advance.waitForDeployment();
    advanceAddr = await advance.getAddress();

    await (await reputationRegistry.setOracle(mirrorAddr)).wait();
    await (await mirror.setReputationRegistry(reputationRegistryAddr)).wait();
    await (await mirror.setRelayer(await owner.getAddress())).wait();
    await (await cUSDT.setMinter(advanceAddr, true)).wait();

    await (await salaryIndex.registerEmployer(employeeAddr, employerAddr)).wait();
  });

  it("approves an advance when the encrypted score and salary clear the threshold", async () => {
    // Encrypt salary = 500_000 cents ($5,000)
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

    const scoreInput = await fhevm
      .createEncryptedInput(reputationRegistryAddr, mirrorAddr)
      .add32(720n)
      .encrypt();
    await (
      await mirror.connect(owner).forwardScore(employeeAddr, scoreInput.handles[0], scoreInput.inputProof)
    ).wait();
    await (await reputationRegistry.connect(employee).authorizeViewer(advanceAddr)).wait();

    // Borrower asks for $1,200 (120_000 cents). Salary covers >> 3x.
    const requestInput = await fhevm
      .createEncryptedInput(advanceAddr, employeeAddr)
      .add64(120_000n)
      .encrypt();
    await (
      await advance.connect(employee).requestAdvance(requestInput.handles[0], requestInput.inputProof)
    ).wait();

    const balanceHandle = await cUSDT.confidentialBalanceOf(employeeAddr);
    const balance = await fhevm.userDecryptEuint(64, balanceHandle, cUSDTAddr, employee);
    expect(balance).to.equal(120_000n);
  });

  it("denies an advance silently when the requested amount exceeds the salary threshold", async () => {
    // New borrower (use owner as a fresh address for simplicity).
    const requestInput = await fhevm
      .createEncryptedInput(advanceAddr, employeeAddr)
      .add64(10_000_000n) // $100,000 — far exceeds salary * 3
      .encrypt();
    await (
      await advance.connect(employee).requestAdvance(requestInput.handles[0], requestInput.inputProof)
    ).wait();

    // The previous test already credited 120_000. After a denied request,
    // balance should be unchanged (additional credit = 0).
    const balanceHandle = await cUSDT.confidentialBalanceOf(employeeAddr);
    const balance = await fhevm.userDecryptEuint(64, balanceHandle, cUSDTAddr, employee);
    expect(balance).to.equal(120_000n);
  });
});
