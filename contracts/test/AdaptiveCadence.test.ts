import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PayrollFactory, HSPAdapter, MockERC20, AdaptiveCadence } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const DAY = 24 * 60 * 60;
const FREQ = 30 * DAY;
const AMT = ethers.parseUnits("3000", 6); // 3000 USDT/cycle
const FUND = ethers.parseUnits("90000", 6);

enum Mode { BATCH, STREAM, PULL, HYBRID }

describe("AdaptiveCadence", () => {
  let factory: PayrollFactory;
  let hsp: HSPAdapter;
  let token: MockERC20;
  let cadence: AdaptiveCadence;
  let owner: HardhatEthersSigner;
  let r1: HardhatEthersSigner;
  let r2: HardhatEthersSigner;
  let r3: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let payrollId: bigint;

  beforeEach(async () => {
    [owner, r1, r2, r3, other] = await ethers.getSigners();

    const HSP = await ethers.getContractFactory("HSPAdapter");
    hsp = (await HSP.deploy()) as HSPAdapter;
    const PF = await ethers.getContractFactory("PayrollFactory");
    factory = (await PF.deploy(await hsp.getAddress())) as PayrollFactory;
    await hsp.authorizeCaller(await factory.getAddress());

    const Token = await ethers.getContractFactory("MockERC20");
    token = (await Token.deploy("USDT", "USDT", 6)) as MockERC20;
    await token.mint(owner.address, ethers.parseUnits("10000000", 6));
    await token.connect(owner).approve(await factory.getAddress(), ethers.MaxUint256);

    const AC = await ethers.getContractFactory("AdaptiveCadence");
    cadence = (await AC.deploy(await factory.getAddress())) as AdaptiveCadence;
    await factory.setExtension(await cadence.getAddress());

    const tx = await factory.createPayroll(
      "Test",
      await token.getAddress(),
      [r1.address, r2.address, r3.address],
      [AMT, AMT, AMT],
      FREQ
    );
    await tx.wait();
    payrollId = 1n;
    await factory.fundPayroll(payrollId, FUND);
  });

  describe("policy & permissions", () => {
    it("only employer can set policy", async () => {
      await expect(
        cadence.connect(other).setCadencePolicy(payrollId, r1.address, Mode.STREAM, false, 0)
      ).to.be.revertedWith("Not employer");
    });

    it("employer sets initial policy & emits events", async () => {
      await expect(cadence.setCadencePolicy(payrollId, r1.address, Mode.STREAM, true, 0))
        .to.emit(cadence, "CadencePolicySet")
        .withArgs(payrollId, r1.address, Mode.STREAM, true);
    });

    it("recipient cannot switch without permission", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.BATCH, false, 0);
      await expect(cadence.connect(r1).setRecipientCadence(payrollId, Mode.STREAM))
        .to.be.revertedWith("Switching not permitted");
    });

    it("recipient can switch when permitted", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.BATCH, true, 0);
      await expect(cadence.connect(r1).setRecipientCadence(payrollId, Mode.STREAM))
        .to.emit(cadence, "CadenceModeChanged").withArgs(payrollId, r1.address, Mode.STREAM);
    });
  });

  describe("BATCH mode", () => {
    it("recipient receives full amount at execute (backwards compat)", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      expect(await token.balanceOf(r1.address)).to.equal(AMT);
      expect(await token.balanceOf(r2.address)).to.equal(AMT);
      expect(await token.balanceOf(r3.address)).to.equal(AMT);
    });
  });

  describe("STREAM mode", () => {
    it("accrual sits in cadence after execute; recipient wallet is 0", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.STREAM, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      expect(await token.balanceOf(r1.address)).to.equal(0n);
      expect(await token.balanceOf(await cadence.getAddress())).to.equal(AMT);
    });

    it("stream ticks linearly between cycles", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.STREAM, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      await time.increase(FREQ / 2);
      const accrued = await cadence.accruedFor(payrollId, r1.address);
      // roughly 50% of AMT, within stream rate precision (rate = AMT/FREQ; ~50% * FREQ * rate = AMT/2)
      expect(accrued).to.be.gt((AMT * 49n) / 100n);
      expect(accrued).to.be.lt((AMT * 51n) / 100n);
    });

    it("recipient can claim mid-cycle and continue accruing", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.STREAM, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      await time.increase(FREQ / 3);
      await cadence.connect(r1).claim(payrollId);
      const bal = await token.balanceOf(r1.address);
      expect(bal).to.be.gt(0n);
      expect(bal).to.be.lt(AMT);
    });

    it("accrued never exceeds committed", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.STREAM, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      await time.increase(FREQ * 5);
      const accrued = await cadence.accruedFor(payrollId, r1.address);
      expect(accrued).to.be.lte(AMT);
    });
  });

  describe("PULL mode", () => {
    it("cannot claim before cycle executed", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.PULL, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await expect(cadence.connect(r1).claim(payrollId)).to.be.revertedWith("Nothing to claim");
    });

    it("claims full cycle amount after execute", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.PULL, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      await cadence.connect(r1).claim(payrollId);
      expect(await token.balanceOf(r1.address)).to.equal(AMT);
    });

    it("accumulates multiple cycles; recipient can claim all at once", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.PULL, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      await time.increase(FREQ);
      await factory.executeCycle(payrollId);
      await cadence.connect(r1).claim(payrollId);
      expect(await token.balanceOf(r1.address)).to.equal(AMT * 2n);
    });
  });

  describe("HYBRID mode", () => {
    it("splits payout 50/50 between stream and batch", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.HYBRID, false, 5000);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      // Flush HYBRID batch portion
      await cadence.flushBatchQueue(payrollId);
      expect(await token.balanceOf(r1.address)).to.equal(AMT / 2n);
    });
  });

  describe("cross-mode invariants", () => {
    it("three recipients with three modes all behave correctly", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.STREAM, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.PULL, false, 0);
      await factory.executeCycle(payrollId);
      expect(await token.balanceOf(r1.address)).to.equal(AMT);
      expect(await token.balanceOf(r2.address)).to.equal(0n);
      expect(await token.balanceOf(r3.address)).to.equal(0n);
      // r2 stream accrual ticks
      await time.increase(FREQ);
      expect(await cadence.accruedFor(payrollId, r2.address)).to.be.gt(0n);
      // r3 can claim full
      await cadence.connect(r3).claim(payrollId);
      expect(await token.balanceOf(r3.address)).to.equal(AMT);
    });

    it("reentrancy on claim blocked", async () => {
      await cadence.setCadencePolicy(payrollId, r1.address, Mode.PULL, false, 0);
      await cadence.setCadencePolicy(payrollId, r2.address, Mode.BATCH, false, 0);
      await cadence.setCadencePolicy(payrollId, r3.address, Mode.BATCH, false, 0);
      await factory.executeCycle(payrollId);
      await cadence.connect(r1).claim(payrollId);
      // Second claim should revert — accrued was drained
      await expect(cadence.connect(r1).claim(payrollId)).to.be.revertedWith("Nothing to claim");
    });
  });
});
