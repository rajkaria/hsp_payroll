import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Signer } from "ethers";

describe("ConfidentialCompliance — encrypted KYC gate on advance", function () {
  let owner: Signer;
  let employer: Signer;
  let employee: Signer;
  let cUSDT: any;
  let salaryIndex: any;
  let reputationRegistry: any;
  let mirror: any;
  let advance: any;
  let compliance: any;
  let cUSDTAddr: string;
  let salaryIndexAddr: string;
  let reputationRegistryAddr: string;
  let mirrorAddr: string;
  let advanceAddr: string;
  let complianceAddr: string;

  before(async () => {
    [owner, employer, employee] = await ethers.getSigners();
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

    compliance = await ethers.deployContract("ConfidentialCompliance");
    await compliance.waitForDeployment();
    complianceAddr = await compliance.getAddress();

    await (await reputationRegistry.setOracle(mirrorAddr)).wait();
    await (await mirror.setReputationRegistry(reputationRegistryAddr)).wait();
    await (await mirror.setRelayer(await owner.getAddress())).wait();
    await (await cUSDT.setMinter(advanceAddr, true)).wait();
    await (await cUSDT.setDebitor(advanceAddr, true)).wait();
    await (await advance.setCompliance(complianceAddr)).wait();
    await (await salaryIndex.registerEmployer(await employee.getAddress(), await employer.getAddress())).wait();

    // Salary $5,000.
    const salInp = await fhevm.createEncryptedInput(salaryIndexAddr, await employer.getAddress()).add64(500_000n).encrypt();
    await (await salaryIndex.connect(employer).setSalary(await employee.getAddress(), salInp.handles[0], salInp.inputProof)).wait();
    await (await salaryIndex.connect(employer).authorizeViewer(await employee.getAddress(), advanceAddr)).wait();

    // Score 720.
    const scInp = await fhevm.createEncryptedInput(reputationRegistryAddr, mirrorAddr).add32(720n).encrypt();
    await (await mirror.connect(owner).forwardScore(await employee.getAddress(), scInp.handles[0], scInp.inputProof)).wait();
    await (await reputationRegistry.connect(employee).authorizeViewer(advanceAddr)).wait();
  });

  it("blocks the advance silently when the employee fails KYC", async () => {
    await (await compliance.connect(owner).setFlag(await employee.getAddress(), false)).wait();
    await (await compliance.connect(employee).authorizeChecker(advanceAddr)).wait();

    const reqInp = await fhevm.createEncryptedInput(advanceAddr, await employee.getAddress()).add64(50_000n).encrypt();
    await (await advance.connect(employee).requestAdvance(reqInp.handles[0], reqInp.inputProof)).wait();

    const balH = await cUSDT.confidentialBalanceOf(await employee.getAddress());
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balH, cUSDTAddr, employee);
    expect(bal).to.equal(0n);
  });

  it("approves when the employee passes KYC", async () => {
    await (await compliance.connect(owner).setFlag(await employee.getAddress(), true)).wait();
    await (await compliance.connect(employee).authorizeChecker(advanceAddr)).wait();

    const reqInp = await fhevm.createEncryptedInput(advanceAddr, await employee.getAddress()).add64(50_000n).encrypt();
    await (await advance.connect(employee).requestAdvance(reqInp.handles[0], reqInp.inputProof)).wait();

    const balH = await cUSDT.confidentialBalanceOf(await employee.getAddress());
    const bal = await fhevm.userDecryptEuint(FhevmType.euint64, balH, cUSDTAddr, employee);
    expect(bal).to.equal(50_000n);
  });
});
