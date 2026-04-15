import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PayrollFactory, HSPAdapter, MockERC20, PayrollAdvance, ReputationRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const MONTH = 30 * 24 * 60 * 60;
const AMT = ethers.parseUnits("1000", 6);
const FUND = ethers.parseUnits("10000", 6);
const POOL_LIQ = ethers.parseUnits("50000", 6);

describe("PayrollAdvance", () => {
  let factory: PayrollFactory;
  let hsp: HSPAdapter;
  let token: MockERC20;
  let advance: PayrollAdvance;
  let reg: ReputationRegistry;
  let owner: HardhatEthersSigner;
  let r1: HardhatEthersSigner;
  let r2: HardhatEthersSigner;
  let lender: HardhatEthersSigner;
  let payrollId: bigint;

  const uid = (n: number) => ethers.zeroPadValue("0x" + n.toString(16).padStart(2, "0"), 32);

  beforeEach(async () => {
    [owner, r1, r2, lender] = await ethers.getSigners();

    const HSP = await ethers.getContractFactory("HSPAdapter");
    hsp = (await HSP.deploy()) as HSPAdapter;
    const PF = await ethers.getContractFactory("PayrollFactory");
    factory = (await PF.deploy(await hsp.getAddress())) as PayrollFactory;
    await hsp.authorizeCaller(await factory.getAddress());

    const Token = await ethers.getContractFactory("MockERC20");
    token = (await Token.deploy("USDT", "USDT", 6)) as MockERC20;
    await token.mint(owner.address, ethers.parseUnits("10000000", 6));
    await token.mint(lender.address, POOL_LIQ);
    await token.connect(owner).approve(await factory.getAddress(), ethers.MaxUint256);

    const Reg = await ethers.getContractFactory("ReputationRegistry");
    reg = (await Reg.deploy()) as ReputationRegistry;
    await reg.setAttestor(owner.address);

    const Adv = await ethers.getContractFactory("PayrollAdvance");
    advance = (await Adv.deploy(await factory.getAddress(), await reg.getAddress())) as PayrollAdvance;
    await factory.setAdvanceExtension(await advance.getAddress());

    const tx = await factory.createPayroll(
      "Adv",
      await token.getAddress(),
      [r1.address, r2.address],
      [AMT, AMT],
      MONTH
    );
    await tx.wait();
    payrollId = 1n;
    await factory.fundPayroll(payrollId, FUND);

    // Seed lender pool
    await token.connect(lender).approve(await advance.getAddress(), ethers.MaxUint256);
    await advance.connect(lender).fundLenderPool(await token.getAddress(), POOL_LIQ);
  });

  async function giveR1Reputation(amount: bigint) {
    // boost r1 income past $10k threshold with 100% on-time
    await reg.recordAttestation(owner.address, r1.address, amount, MONTH, 0, uid(1));
    await reg.recordAttestation(owner.address, r1.address, amount, MONTH, MONTH, uid(2));
  }

  it("tier = 0 LTV for recipient with no reputation", async () => {
    const [ltv] = await advance.tierFor(r1.address);
    expect(ltv).to.equal(0n);
  });

  it("tier = 70% LTV for high-income on-time recipient", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    const [ltv] = await advance.tierFor(r1.address);
    expect(ltv).to.equal(7000n);
  });

  it("cannot borrow more than max LTV", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    const max = await advance.maxAdvanceFor(r1.address, payrollId);
    expect(max).to.equal((AMT * 7000n) / 10000n);
    await expect(
      advance.connect(r1).requestAdvance(payrollId, max + 1n)
    ).to.be.revertedWith("Advance denied");
  });

  it("recipient can borrow within LTV and receives tokens", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    const bal0 = await token.balanceOf(r1.address);
    await advance.connect(r1).requestAdvance(payrollId, ethers.parseUnits("500", 6));
    const bal1 = await token.balanceOf(r1.address);
    expect(bal1 - bal0).to.equal(ethers.parseUnits("500", 6));
    expect(await advance.outstandingDebt(r1.address)).to.equal(ethers.parseUnits("500", 6));
  });

  it("advance auto-repaid on executeCycle", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    const borrowed = ethers.parseUnits("500", 6);
    await advance.connect(r1).requestAdvance(payrollId, borrowed);
    const balBeforeCycle = await token.balanceOf(r1.address);
    await factory.executeCycle(payrollId);
    const balAfter = await token.balanceOf(r1.address);
    // Net payout = AMT - (principal + interest) = 1000 - (500 + 5) = 495
    const interest = (borrowed * 100n) / 10000n;
    expect(balAfter - balBeforeCycle).to.equal(AMT - borrowed - interest);
    expect(await advance.outstandingDebt(r1.address)).to.equal(0n);
  });

  it("lender pool grows from interest", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    const borrowed = ethers.parseUnits("500", 6);
    await advance.connect(r1).requestAdvance(payrollId, borrowed);
    await factory.executeCycle(payrollId);
    const interest = (borrowed * 100n) / 10000n;
    expect(await advance.lenderPoolBalance(await token.getAddress())).to.equal(POOL_LIQ + interest);
  });

  it("lender earns share of interest on withdrawal", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    const borrowed = ethers.parseUnits("500", 6);
    await advance.connect(r1).requestAdvance(payrollId, borrowed);
    await factory.executeCycle(payrollId);
    const shares = await advance.lenderShares(await token.getAddress(), lender.address);
    const balBefore = await token.balanceOf(lender.address);
    await advance.connect(lender).withdrawFromPool(await token.getAddress(), shares);
    const balAfter = await token.balanceOf(lender.address);
    const interest = (borrowed * 100n) / 10000n;
    expect(balAfter - balBefore).to.equal(POOL_LIQ + interest);
  });

  it("denies advance with zero amount", async () => {
    await giveR1Reputation(ethers.parseUnits("6000", 6));
    await expect(
      advance.connect(r1).requestAdvance(payrollId, 0n)
    ).to.be.revertedWith("Advance denied");
  });

  it("recipients without advance pass through unchanged", async () => {
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r2.address)).to.equal(AMT);
  });
});
