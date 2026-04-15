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

  it("stores fiat salary per payroll+recipient", async () => {
    const [owner, r1] = await ethers.getSigners();
    const SI = await ethers.getContractFactory("SalaryIndex");
    const si = (await SI.deploy()) as SalaryIndex;
    const INR = ethers.encodeBytes32String("INR");
    await si.setFiatSalary(1n, r1.address, INR, 85000n);
    const s = await si.fiatSalary(1n, r1.address);
    expect(s.fiatAmount).to.equal(85000n);
  });
});
