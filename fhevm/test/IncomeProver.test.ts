import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Signer } from "ethers";

describe("IncomeProver — selective proof-of-income", function () {
  let owner: Signer;
  let employer: Signer;
  let employee: Signer;
  let landlord: Signer;
  let salaryIndex: any;
  let salaryIndexAddr: string;
  let prover: any;
  let proverAddr: string;

  before(async () => {
    [owner, employer, employee, landlord] = await ethers.getSigners();
    salaryIndex = await ethers.deployContract("ConfidentialSalaryIndex");
    await salaryIndex.waitForDeployment();
    salaryIndexAddr = await salaryIndex.getAddress();

    prover = await ethers.deployContract("IncomeProver", [salaryIndexAddr]);
    await prover.waitForDeployment();
    proverAddr = await prover.getAddress();

    await (await salaryIndex.registerEmployer(await employee.getAddress(), await employer.getAddress())).wait();

    // Salary $7,500 = 750_000 cents.
    const inp = await fhevm
      .createEncryptedInput(salaryIndexAddr, await employer.getAddress())
      .add64(750_000n)
      .encrypt();
    await (
      await salaryIndex.connect(employer).setSalary(await employee.getAddress(), inp.handles[0], inp.inputProof)
    ).wait();
    await (await salaryIndex.connect(employer).authorizeViewer(await employee.getAddress(), proverAddr)).wait();
  });

  it("produces a true ebool when salary >= threshold", async () => {
    await (await prover.connect(employee).proveAtLeast(500_000n, await landlord.getAddress())).wait();
    const [okHandle] = await prover.proofOf(await employee.getAddress(), await landlord.getAddress());
    const ok = await fhevm.userDecryptEbool(okHandle, proverAddr, landlord);
    expect(ok).to.equal(true);
  });

  it("produces a false ebool when salary < threshold", async () => {
    await (await prover.connect(employee).proveAtLeast(1_000_000n, await landlord.getAddress())).wait();
    const [okHandle] = await prover.proofOf(await employee.getAddress(), await landlord.getAddress());
    const ok = await fhevm.userDecryptEbool(okHandle, proverAddr, landlord);
    expect(ok).to.equal(false);
  });
});
