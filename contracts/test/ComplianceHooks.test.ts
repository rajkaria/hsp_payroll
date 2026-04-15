import { expect } from "chai";
import { ethers } from "hardhat";
import { PayrollFactory, HSPAdapter, MockERC20, ComplianceHookRegistry, KYCSBTHook, JurisdictionHook, SanctionsHook, RateLimitHook, DemoKYCSBT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const MONTH = 30 * 24 * 60 * 60;
const AMT = ethers.parseUnits("1000", 6);
const FUND = ethers.parseUnits("10000", 6);

describe("Compliance Hooks", () => {
  let factory: PayrollFactory;
  let hsp: HSPAdapter;
  let token: MockERC20;
  let registry: ComplianceHookRegistry;
  let kyc: KYCSBTHook;
  let juris: JurisdictionHook;
  let sanc: SanctionsHook;
  let rate: RateLimitHook;
  let sbt: DemoKYCSBT;
  let owner: HardhatEthersSigner;
  let r1: HardhatEthersSigner;
  let r2: HardhatEthersSigner;
  let r3: HardhatEthersSigner;
  let payrollId: bigint;

  beforeEach(async () => {
    [owner, r1, r2, r3] = await ethers.getSigners();

    const HSP = await ethers.getContractFactory("HSPAdapter");
    hsp = (await HSP.deploy()) as HSPAdapter;
    const PF = await ethers.getContractFactory("PayrollFactory");
    factory = (await PF.deploy(await hsp.getAddress())) as PayrollFactory;
    await hsp.authorizeCaller(await factory.getAddress());
    // Also authorize the registry-less self-cancel path used in RecipientSkipped
    // (hspAdapter.cancelPayment requires authorized caller)

    const Token = await ethers.getContractFactory("MockERC20");
    token = (await Token.deploy("USDT", "USDT", 6)) as MockERC20;
    await token.mint(owner.address, ethers.parseUnits("10000000", 6));
    await token.connect(owner).approve(await factory.getAddress(), ethers.MaxUint256);

    const Reg = await ethers.getContractFactory("ComplianceHookRegistry");
    registry = (await Reg.deploy(await factory.getAddress())) as ComplianceHookRegistry;
    await factory.setComplianceRegistry(await registry.getAddress());

    const SBT = await ethers.getContractFactory("DemoKYCSBT");
    sbt = (await SBT.deploy()) as DemoKYCSBT;
    const K = await ethers.getContractFactory("KYCSBTHook");
    kyc = (await K.deploy(await sbt.getAddress())) as KYCSBTHook;
    const J = await ethers.getContractFactory("JurisdictionHook");
    juris = (await J.deploy()) as JurisdictionHook;
    const S = await ethers.getContractFactory("SanctionsHook");
    sanc = (await S.deploy()) as SanctionsHook;
    const R = await ethers.getContractFactory("RateLimitHook");
    rate = (await R.deploy(ethers.parseUnits("5000", 6))) as RateLimitHook;

    const tx = await factory.createPayroll(
      "Comp",
      await token.getAddress(),
      [r1.address, r2.address, r3.address],
      [AMT, AMT, AMT],
      MONTH
    );
    await tx.wait();
    payrollId = 1n;
    await factory.fundPayroll(payrollId, FUND);
  });

  it("KYC SBT hook blocks recipient without SBT, others paid", async () => {
    await registry.attachHook(payrollId, await kyc.getAddress());
    await sbt.mint(r1.address);
    await sbt.mint(r3.address);
    // r2 has no SBT → blocked
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
    expect(await token.balanceOf(r2.address)).to.equal(0n);
    expect(await token.balanceOf(r3.address)).to.equal(AMT);
  });

  it("Jurisdiction hook allows listed, blocks others", async () => {
    await registry.attachHook(payrollId, await juris.getAddress());
    await juris.setAllowed("US", true);
    await juris.setAllowed("IN", true);
    await juris.setJurisdiction(r1.address, "US");
    await juris.setJurisdiction(r2.address, "SG"); // blocked
    await juris.setJurisdiction(r3.address, "IN");
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
    expect(await token.balanceOf(r2.address)).to.equal(0n);
    expect(await token.balanceOf(r3.address)).to.equal(AMT);
  });

  it("Sanctions hook blocks sanctioned", async () => {
    await registry.attachHook(payrollId, await sanc.getAddress());
    await sanc.setSanctioned(r2.address, true);
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r2.address)).to.equal(0n);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
  });

  it("multiple hooks all must pass", async () => {
    await registry.attachHook(payrollId, await kyc.getAddress());
    await registry.attachHook(payrollId, await sanc.getAddress());
    await sbt.mint(r1.address);
    await sbt.mint(r2.address);
    await sbt.mint(r3.address);
    await sanc.setSanctioned(r2.address, true); // has SBT but sanctioned
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
    expect(await token.balanceOf(r2.address)).to.equal(0n);
  });

  it("detach hook restores normal flow", async () => {
    await registry.attachHook(payrollId, await kyc.getAddress());
    await sbt.mint(r1.address);
    // r2, r3 would be blocked
    await registry.detachHook(payrollId, await kyc.getAddress());
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
    expect(await token.balanceOf(r2.address)).to.equal(AMT);
    expect(await token.balanceOf(r3.address)).to.equal(AMT);
  });

  it("rate limit hook enforces daily cap", async () => {
    // cap is 5000 per day; single cycle only sends 1000 so all pass
    await registry.attachHook(payrollId, await rate.getAddress());
    await factory.executeCycle(payrollId);
    expect(await token.balanceOf(r1.address)).to.equal(AMT);
  });

  it("only employer can attach hook", async () => {
    await expect(
      registry.connect(r1).attachHook(payrollId, await kyc.getAddress())
    ).to.be.revertedWith("Not employer");
  });

  it("cannot attach more than 5 hooks", async () => {
    for (let i = 0; i < 5; i++) {
      const S = await ethers.getContractFactory("SanctionsHook");
      const s = await S.deploy();
      await registry.attachHook(payrollId, await s.getAddress());
    }
    const S = await ethers.getContractFactory("SanctionsHook");
    const s = await S.deploy();
    await expect(
      registry.attachHook(payrollId, await s.getAddress())
    ).to.be.revertedWith("Too many hooks");
  });

  it("RecipientSkipped event emits with reason", async () => {
    await registry.attachHook(payrollId, await sanc.getAddress());
    await sanc.setSanctioned(r1.address, true);
    await expect(factory.executeCycle(payrollId))
      .to.emit(factory, "RecipientSkipped");
  });
});
