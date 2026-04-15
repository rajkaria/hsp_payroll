import { expect } from "chai";
import { ethers } from "hardhat";
import { ReputationRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const ONE_K = ethers.parseUnits("1000", 6);
const TEN_K = ethers.parseUnits("10000", 6);
const MONTH = 30 * 24 * 60 * 60;

describe("ReputationRegistry", () => {
  let reg: ReputationRegistry;
  let attestor: HardhatEthersSigner;
  let emp1: HardhatEthersSigner;
  let emp2: HardhatEthersSigner;
  let rec: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async () => {
    [attestor, emp1, emp2, rec, other] = await ethers.getSigners();
    const R = await ethers.getContractFactory("ReputationRegistry");
    reg = (await R.deploy()) as ReputationRegistry;
    await reg.setAttestor(attestor.address);
  });

  const uid = (n: number) => ethers.zeroPadValue("0x" + n.toString(16).padStart(2, "0"), 32);

  it("records attestation and increments all fields", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    expect(await reg.incomeOf(rec.address)).to.equal(ONE_K);
    expect(await reg.employersOf(rec.address)).to.equal(1n);
  });

  it("multiple employers tracked separately", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    await reg.recordAttestation(emp2.address, rec.address, ONE_K, MONTH, 0, uid(2));
    expect(await reg.employersOf(rec.address)).to.equal(2n);
    expect(await reg.perEmployerTotal(rec.address, emp1.address)).to.equal(ONE_K);
    expect(await reg.perEmployerTotal(rec.address, emp2.address)).to.equal(ONE_K);
  });

  it("on-time when elapsed within ±10% of interval", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, MONTH, uid(2));
    expect(await reg.onTimeRate(rec.address)).to.equal(10000n);
  });

  it("late when elapsed exceeds 110%", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, MONTH * 2, uid(2));
    const rate = await reg.onTimeRate(rec.address);
    // 1 on-time (first), 1 late = 50%
    expect(rate).to.equal(5000n);
  });

  it("only attestor can write", async () => {
    await expect(
      reg.connect(other).recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1))
    ).to.be.revertedWith("Only attestor");
  });

  it("verifyMinimumIncome with no window returns true when threshold met", async () => {
    await reg.recordAttestation(emp1.address, rec.address, TEN_K, MONTH, 0, uid(1));
    expect(await reg.verifyMinimumIncome(rec.address, TEN_K, 0)).to.equal(true);
    expect(await reg.verifyMinimumIncome(rec.address, TEN_K * 2n, 0)).to.equal(false);
  });

  it("milestone events emitted at thresholds", async () => {
    await expect(
      reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1))
    ).to.emit(reg, "IncomeMilestone").withArgs(rec.address, ONE_K);
  });

  it("incomeInWindow filters attestations by time", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    const now = await ethers.provider.getBlock("latest").then(b => b!.timestamp);
    const total = await reg.incomeInWindow(rec.address, now - 60, now + 60);
    expect(total).to.equal(ONE_K);
  });

  it("attestationsOf returns all UIDs", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, MONTH, uid(2));
    const uids = await reg.attestationsOf(rec.address);
    expect(uids.length).to.equal(2);
  });

  it("incomeProof returns full snapshot", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    const proof = await reg.incomeProof(rec.address);
    expect(proof.totalReceived).to.equal(ONE_K);
    expect(proof.employerCount).to.equal(1n);
    expect(proof.totalCycles).to.equal(1n);
  });

  it("first and last timestamps tracked", async () => {
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, 0, uid(1));
    const firstBlock = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);
    await reg.recordAttestation(emp1.address, rec.address, ONE_K, MONTH, MONTH, uid(2));
    const proof = await reg.incomeProof(rec.address);
    expect(proof.firstPaymentTimestamp).to.be.gte(firstBlock!.timestamp);
    expect(proof.lastPaymentTimestamp).to.be.gt(proof.firstPaymentTimestamp);
  });
});
