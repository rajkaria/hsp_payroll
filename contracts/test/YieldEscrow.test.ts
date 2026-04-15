import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PayrollFactory, HSPAdapter, MockERC20, YieldEscrow, MockYieldVault } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const YEAR = 365 * 24 * 60 * 60;
const MONTH = 30 * 24 * 60 * 60;
const AMT = ethers.parseUnits("1000", 6);
const FUND = ethers.parseUnits("100000", 6);

describe("YieldEscrow + MockYieldVault", () => {
  let factory: PayrollFactory;
  let hsp: HSPAdapter;
  let token: MockERC20;
  let vault: MockYieldVault;
  let yieldEscrow: YieldEscrow;
  let owner: HardhatEthersSigner;
  let r1: HardhatEthersSigner;
  let r2: HardhatEthersSigner;
  let payrollId: bigint;

  beforeEach(async () => {
    [owner, r1, r2] = await ethers.getSigners();

    const HSP = await ethers.getContractFactory("HSPAdapter");
    hsp = (await HSP.deploy()) as HSPAdapter;
    const PF = await ethers.getContractFactory("PayrollFactory");
    factory = (await PF.deploy(await hsp.getAddress())) as PayrollFactory;
    await hsp.authorizeCaller(await factory.getAddress());

    const Token = await ethers.getContractFactory("MockERC20");
    token = (await Token.deploy("USDT", "USDT", 6)) as MockERC20;
    await token.mint(owner.address, ethers.parseUnits("10000000", 6));
    await token.connect(owner).approve(await factory.getAddress(), ethers.MaxUint256);

    const V = await ethers.getContractFactory("MockYieldVault");
    vault = (await V.deploy(await token.getAddress(), "yUSDT", "yUSDT")) as MockYieldVault;

    const YE = await ethers.getContractFactory("YieldEscrow");
    yieldEscrow = (await YE.deploy(await factory.getAddress(), await vault.getAddress())) as YieldEscrow;
    await factory.setYieldExtension(await yieldEscrow.getAddress());

    const tx = await factory.createPayroll(
      "Yieldy",
      await token.getAddress(),
      [r1.address, r2.address],
      [AMT, AMT],
      MONTH
    );
    await tx.wait();
    payrollId = 1n;
  });

  it("fund without yield keeps tokens in factory", async () => {
    await factory.fundPayroll(payrollId, FUND);
    expect(await factory.escrowBalances(payrollId)).to.equal(FUND);
    expect(await token.balanceOf(await factory.getAddress())).to.equal(FUND);
  });

  it("enable yield, fund → tokens move to vault", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    expect(await token.balanceOf(await vault.getAddress())).to.equal(FUND);
    expect(await yieldEscrow.availableBalance(payrollId)).to.equal(FUND);
  });

  it("vault accrues ~4.5% APY over a year", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    await time.increase(YEAR);
    const bal = await yieldEscrow.availableBalance(payrollId);
    // expected ~ FUND * 1.045
    const expected = (FUND * 10450n) / 10000n;
    expect(bal).to.be.gte((expected * 99n) / 100n);
    expect(bal).to.be.lte((expected * 101n) / 100n);
  });

  it("executeCycle withdraws exact amount, remainder keeps earning", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    await time.increase(MONTH);
    const before = await yieldEscrow.availableBalance(payrollId);
    const cycleCost = AMT * 2n;
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
    expect(await token.balanceOf(r2.address)).to.equal(AMT);
    const after = await yieldEscrow.availableBalance(payrollId);
    // after ~ before - cycleCost (within dust)
    // tolerate yield accrual drift during the call (sub-second APY)
    expect(after).to.be.gte(before - cycleCost - 1000n);
    expect(after).to.be.lte(before - cycleCost + 1000n);
  });

  it("disable yield withdraws everything back to factory", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    await time.increase(MONTH);
    await yieldEscrow.disableYield(payrollId);
    const factBal = await token.balanceOf(await factory.getAddress());
    expect(factBal).to.be.gte(FUND);
  });

  it("claimYield transfers yield to employer without touching principal", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    const ownerBefore = await token.balanceOf(owner.address);
    await time.increase(YEAR);
    const y = await yieldEscrow.accruedYield(payrollId);
    expect(y).to.be.gt(0n);
    await yieldEscrow.claimYield(payrollId);
    const ownerAfter = await token.balanceOf(owner.address);
    expect(ownerAfter - ownerBefore).to.be.gte((y * 99n) / 100n);
  });

  it("runwayWithYield returns base vs extended cycles", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    await time.increase(YEAR);
    const cycleCost = AMT * 2n;
    const [base, extended] = await yieldEscrow.runwayWithYield(payrollId, cycleCost);
    expect(base).to.equal(FUND / cycleCost);
    expect(extended).to.be.gte(base);
  });

  it("sharesAccountingMatchesUnderlying — multiple funds preserve ratio", async () => {
    await yieldEscrow.enableYield(payrollId, ethers.ZeroAddress, false);
    await factory.fundPayroll(payrollId, FUND);
    await time.increase(MONTH);
    await factory.fundPayroll(payrollId, FUND / 2n);
    const total = await yieldEscrow.availableBalance(payrollId);
    expect(total).to.be.gte(FUND + FUND / 2n);
  });

  it("only employer can enable yield", async () => {
    await expect(
      yieldEscrow.connect(r1).enableYield(payrollId, ethers.ZeroAddress, false)
    ).to.be.revertedWith("Not employer");
  });
});
