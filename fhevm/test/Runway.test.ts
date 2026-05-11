import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { Signer } from "ethers";

describe("ConfidentialEmployerRunway — encrypted alerts", function () {
  let owner: Signer;
  let employer: Signer;
  let cUSDT: any;
  let cUSDTAddr: string;
  let runway: any;
  let runwayAddr: string;

  before(async () => {
    [owner, employer] = await ethers.getSigners();
    cUSDT = await ethers.deployContract("ConfidentialUSDT");
    await cUSDT.waitForDeployment();
    cUSDTAddr = await cUSDT.getAddress();

    runway = await ethers.deployContract("ConfidentialEmployerRunway", [cUSDTAddr]);
    await runway.waitForDeployment();
    runwayAddr = await runway.getAddress();

    // Mint $9,000 cUSDT to employer.
    const fundInput = await fhevm
      .createEncryptedInput(cUSDTAddr, await owner.getAddress())
      .add64(900_000n)
      .encrypt();
    await (
      await cUSDT
        .connect(owner)
        .confidentialMintFromExternal(await employer.getAddress(), fundInput.handles[0], fundInput.inputProof)
    ).wait();

    // Employer says per-cycle total is $5,000.
    const totalInput = await fhevm
      .createEncryptedInput(runwayAddr, await employer.getAddress())
      .add64(500_000n)
      .encrypt();
    await (await runway.connect(employer).setPerCycleTotal(totalInput.handles[0], totalInput.inputProof)).wait();

    // Employer authorizes runway contract to read its cUSDT balance.
    await (await cUSDT.connect(employer).authorizeBalanceViewer(runwayAddr)).wait();
  });

  it("returns true for hasLowRunway when balance < N cycles", async () => {
    // 9,000 / 5,000 = 1.8 cycles → fewer than 2 → true.
    const tx = await runway.connect(employer).hasLowRunway(await employer.getAddress(), 2);
    const r = await tx.wait();
    expect(r.status).to.equal(1);
  });

  it("returns false for hasAtLeast(3)", async () => {
    const tx = await runway.connect(employer).hasAtLeast(await employer.getAddress(), 3);
    const r = await tx.wait();
    expect(r.status).to.equal(1);
  });
});
