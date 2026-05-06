import { expect } from "chai";
import { ethers } from "hardhat";
import { SalaryIndex, MockPriceFeed } from "../typechain-types";

describe("SalaryIndex", () => {
  it("converts INR → USDT via mock feed", async () => {
    const [owner, r1] = await ethers.getSigners();
    const SI = await ethers.getContractFactory("SalaryIndex");
    const si = (await SI.deploy()) as SalaryIndex;

    // feed: 1 USDT = 85 INR, 8 decimals => answer = 85 * 1e8
    const F = await ethers.getContractFactory("MockPriceFeed");
    const feed = (await F.deploy(85n * 10n ** 8n, 8)) as MockPriceFeed;

    const INR = ethers.encodeBytes32String("INR");
    await si.setFeed(INR, await feed.getAddress());

    // recipient paid 85000 INR at 6-decimal USDT => expect 1000 USDT = 1_000_000_000 (6 decimals)
    const tok = await si.tokenAmountFor(INR, 85000n * 10n ** 8n, 6);
    expect(tok).to.equal(1000n * 10n ** 6n);
  });

  it("stores fiat salary per payroll+recipient (only payroll owner)", async () => {
    const [owner, employer, r1, stranger] = await ethers.getSigners();
    const SI = await ethers.getContractFactory("SalaryIndex");
    const si = (await SI.deploy()) as SalaryIndex;

    // Set up a real factory + payroll so the owner check has something to verify against
    const HSP = await ethers.getContractFactory("HSPAdapter");
    const hsp = await HSP.deploy(); await hsp.waitForDeployment();
    const PF = await ethers.getContractFactory("PayrollFactory");
    const factory = await PF.deploy(await hsp.getAddress()); await factory.waitForDeployment();
    await hsp.authorizeCaller(await factory.getAddress());
    const Tok = await ethers.getContractFactory("MockERC20");
    const tok = await Tok.deploy("USDT", "USDT", 6); await tok.waitForDeployment();
    await factory.connect(employer).createPayroll(
      "p1", await tok.getAddress(), [r1.address], [1n], 60n
    );

    await si.setFactory(await factory.getAddress());

    const INR = ethers.encodeBytes32String("INR");
    // stranger cannot set fiat salary
    await expect(
      si.connect(stranger).setFiatSalary(1n, r1.address, INR, 85000n)
    ).to.be.revertedWith("Not payroll owner");

    // payroll owner can
    await si.connect(employer).setFiatSalary(1n, r1.address, INR, 85000n);
    const s = await si.fiatSalary(1n, r1.address);
    expect(s.fiatAmount).to.equal(85000n);
  });
});
