import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

describe("PayrollAttestorMirror — replay protection + scoring hash", function () {
  let owner: Signer;
  let relayer: Signer;
  let mirror: any;

  before(async () => {
    [owner, relayer] = await ethers.getSigners();
    const scoringHash = ethers.keccak256(ethers.toUtf8Bytes("hashpay-scoring-v1"));
    mirror = await ethers.deployContract("PayrollAttestorMirror", [scoringHash]);
    await mirror.waitForDeployment();
    await (await mirror.setRelayer(await relayer.getAddress())).wait();
  });

  it("exposes the scoring hash", async () => {
    expect(await mirror.scoringHash()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("hashpay-scoring-v1")));
  });

  it("rejects a stale cycle below the high-water-mark", async () => {
    const employee = await owner.getAddress();
    const employer = await relayer.getAddress();

    // First cycle at block 100.
    await (
      await mirror.connect(relayer).mirrorCycle(
        ethers.id("tx-1"),
        employer,
        employee,
        1,
        100,
        true
      )
    ).wait();

    // Replay attempt at block 99 must revert.
    await expect(
      mirror.connect(relayer).mirrorCycle(ethers.id("tx-2"), employer, employee, 2, 99, true)
    ).to.be.revertedWithCustomError(mirror, "StaleCycle");
  });

  it("accepts a strictly-higher block", async () => {
    const employee = await owner.getAddress();
    const employer = await relayer.getAddress();

    await (
      await mirror.connect(relayer).mirrorCycle(
        ethers.id("tx-3"),
        employer,
        employee,
        3,
        200,
        true
      )
    ).wait();
    expect(await mirror.lastBlockOf(employee)).to.equal(200n);
  });
});
