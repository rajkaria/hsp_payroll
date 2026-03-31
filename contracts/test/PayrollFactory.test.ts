import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PayrollFactory, HSPAdapter, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const MONTHLY = 30 * 24 * 60 * 60;
const AMOUNT_1 = ethers.parseUnits("1000", 6); // 1000 USDT
const AMOUNT_2 = ethers.parseUnits("2000", 6);
const FUND_AMOUNT = ethers.parseUnits("10000", 6);

describe("PayrollFactory", function () {
  let factory: PayrollFactory;
  let hspAdapter: HSPAdapter;
  let token: MockERC20;
  let owner: HardhatEthersSigner;
  let recipient1: HardhatEthersSigner;
  let recipient2: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, recipient1, recipient2, other] = await ethers.getSigners();

    // Deploy HSPAdapter
    const HSPAdapterFactory = await ethers.getContractFactory("HSPAdapter");
    hspAdapter = (await HSPAdapterFactory.deploy()) as HSPAdapter;
    await hspAdapter.waitForDeployment();

    // Deploy PayrollFactory
    const PayrollFactoryFactory = await ethers.getContractFactory("PayrollFactory");
    factory = (await PayrollFactoryFactory.deploy(await hspAdapter.getAddress())) as PayrollFactory;
    await factory.waitForDeployment();

    // Deploy MockERC20 (6 decimals, like USDT)
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = (await MockERC20Factory.deploy("Mock USDT", "mUSDT", 6)) as MockERC20;
    await token.waitForDeployment();

    // Mint tokens to owner
    await token.mint(owner.address, ethers.parseUnits("1000000", 6));

    // Approve factory to spend tokens
    await token.connect(owner).approve(await factory.getAddress(), ethers.MaxUint256);
  });

  // ─── Helper ────────────────────────────────────────────────────────────────

  async function createDefaultPayroll(): Promise<bigint> {
    const tx = await factory.createPayroll(
      "Test Payroll",
      await token.getAddress(),
      [recipient1.address, recipient2.address],
      [AMOUNT_1, AMOUNT_2],
      MONTHLY
    );
    const receipt = await tx.wait();
    const iface = factory.interface;
    for (const log of receipt!.logs) {
      try {
        const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed && parsed.name === "PayrollCreated") {
          return parsed.args[0] as bigint;
        }
      } catch {
        // skip
      }
    }
    throw new Error("PayrollCreated event not found");
  }

  // ─── createPayroll ─────────────────────────────────────────────────────────

  describe("createPayroll", function () {
    it("creates a payroll and increments payrollCount", async function () {
      expect(await factory.payrollCount()).to.equal(0n);
      await createDefaultPayroll();
      expect(await factory.payrollCount()).to.equal(1n);
    });

    it("stores correct payroll details", async function () {
      const payrollId = await createDefaultPayroll();
      const details = await factory.getPayrollDetails(payrollId);

      expect(details.owner).to.equal(owner.address);
      expect(details.token).to.equal(await token.getAddress());
      expect(details.name).to.equal("Test Payroll");
      expect(details.recipients).to.deep.equal([recipient1.address, recipient2.address]);
      expect(details.amounts).to.deep.equal([AMOUNT_1, AMOUNT_2]);
      expect(details.frequency).to.equal(BigInt(MONTHLY));
      expect(details.cycleCount).to.equal(0n);
      expect(details.totalDeposited).to.equal(0n);
      expect(details.totalPaid).to.equal(0n);
      expect(details.active).to.equal(true);
      expect(details.lastExecuted).to.equal(0n);
    });

    it("emits PayrollCreated with correct args", async function () {
      await expect(
        factory.createPayroll(
          "My Payroll",
          await token.getAddress(),
          [recipient1.address],
          [AMOUNT_1],
          MONTHLY
        )
      )
        .to.emit(factory, "PayrollCreated")
        .withArgs(1n, owner.address, await token.getAddress(), "My Payroll");
    });

    it("registers recipients in recipientPayrolls", async function () {
      const payrollId = await createDefaultPayroll();
      const r1Payrolls = await factory.getRecipientPayrolls(recipient1.address);
      expect(r1Payrolls).to.include(payrollId);
      const r2Payrolls = await factory.getRecipientPayrolls(recipient2.address);
      expect(r2Payrolls).to.include(payrollId);
    });

    it("reverts if no recipients provided", async function () {
      await expect(
        factory.createPayroll("Bad", await token.getAddress(), [], [], MONTHLY)
      ).to.be.revertedWith("No recipients");
    });

    it("reverts if recipients and amounts length mismatch", async function () {
      await expect(
        factory.createPayroll(
          "Bad",
          await token.getAddress(),
          [recipient1.address, recipient2.address],
          [AMOUNT_1],
          MONTHLY
        )
      ).to.be.revertedWith("Length mismatch");
    });

    it("reverts if frequency is too short (< 60 seconds)", async function () {
      await expect(
        factory.createPayroll(
          "Bad",
          await token.getAddress(),
          [recipient1.address],
          [AMOUNT_1],
          59
        )
      ).to.be.revertedWith("Frequency too short");
    });

    it("reverts if a recipient is the zero address", async function () {
      await expect(
        factory.createPayroll(
          "Bad",
          await token.getAddress(),
          [ethers.ZeroAddress],
          [AMOUNT_1],
          MONTHLY
        )
      ).to.be.revertedWith("Zero address recipient");
    });

    it("reverts if an amount is zero", async function () {
      await expect(
        factory.createPayroll(
          "Bad",
          await token.getAddress(),
          [recipient1.address],
          [0n],
          MONTHLY
        )
      ).to.be.revertedWith("Zero amount");
    });

    it("allows creating multiple payrolls with incrementing IDs", async function () {
      await createDefaultPayroll();
      await createDefaultPayroll();
      expect(await factory.payrollCount()).to.equal(2n);
    });
  });

  // ─── fundPayroll ────────────────────────────────────────────────────────────

  describe("fundPayroll", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
    });

    it("accepts funds and updates escrow balance", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      expect(await factory.escrowBalances(payrollId)).to.equal(FUND_AMOUNT);
    });

    it("updates totalDeposited on payroll", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.totalDeposited).to.equal(FUND_AMOUNT);
    });

    it("transfers tokens from owner to factory", async function () {
      const ownerBefore = await token.balanceOf(owner.address);
      const factoryBefore = await token.balanceOf(await factory.getAddress());

      await factory.fundPayroll(payrollId, FUND_AMOUNT);

      expect(await token.balanceOf(owner.address)).to.equal(ownerBefore - FUND_AMOUNT);
      expect(await token.balanceOf(await factory.getAddress())).to.equal(factoryBefore + FUND_AMOUNT);
    });

    it("emits PayrollFunded event", async function () {
      await expect(factory.fundPayroll(payrollId, FUND_AMOUNT))
        .to.emit(factory, "PayrollFunded")
        .withArgs(payrollId, FUND_AMOUNT, FUND_AMOUNT);
    });

    it("accumulates escrow over multiple fundings", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      expect(await factory.escrowBalances(payrollId)).to.equal(FUND_AMOUNT * 2n);
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        factory.connect(other).fundPayroll(payrollId, FUND_AMOUNT)
      ).to.be.revertedWith("Not payroll owner");
    });

    it("reverts if payroll is not active", async function () {
      await factory.cancelPayroll(payrollId);
      await expect(factory.fundPayroll(payrollId, FUND_AMOUNT)).to.be.revertedWith("Payroll not active");
    });
  });

  // ─── executeCycle ──────────────────────────────────────────────────────────

  describe("executeCycle", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
    });

    it("pays all recipients the correct amounts", async function () {
      const r1Before = await token.balanceOf(recipient1.address);
      const r2Before = await token.balanceOf(recipient2.address);

      await factory.executeCycle(payrollId);

      expect(await token.balanceOf(recipient1.address)).to.equal(r1Before + AMOUNT_1);
      expect(await token.balanceOf(recipient2.address)).to.equal(r2Before + AMOUNT_2);
    });

    it("deducts cycle cost from escrow balance", async function () {
      const cycleCost = AMOUNT_1 + AMOUNT_2;
      await factory.executeCycle(payrollId);
      expect(await factory.escrowBalances(payrollId)).to.equal(FUND_AMOUNT - cycleCost);
    });

    it("increments cycleCount and sets lastExecuted", async function () {
      await factory.executeCycle(payrollId);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.cycleCount).to.equal(1n);
      expect(details.lastExecuted).to.be.gt(0n);
    });

    it("updates totalPaid", async function () {
      const cycleCost = AMOUNT_1 + AMOUNT_2;
      await factory.executeCycle(payrollId);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.totalPaid).to.equal(cycleCost);
    });

    it("creates receipts for each recipient", async function () {
      await factory.executeCycle(payrollId);
      const receipts = await factory.getReceipts(payrollId, 1n);
      expect(receipts.length).to.equal(2);

      expect(receipts[0].recipient).to.equal(recipient1.address);
      expect(receipts[0].amount).to.equal(AMOUNT_1);
      expect(receipts[0].cycleNumber).to.equal(1n);
      expect(receipts[0].payrollId).to.equal(payrollId);
      expect(receipts[0].hspRequestId).to.not.equal(ethers.ZeroHash);

      expect(receipts[1].recipient).to.equal(recipient2.address);
      expect(receipts[1].amount).to.equal(AMOUNT_2);
    });

    it("emits CycleExecuted event", async function () {
      const cycleCost = AMOUNT_1 + AMOUNT_2;
      await expect(factory.executeCycle(payrollId))
        .to.emit(factory, "CycleExecuted")
        .withArgs(payrollId, 1n, cycleCost);
    });

    it("emits PaymentSettled for each recipient", async function () {
      await expect(factory.executeCycle(payrollId))
        .to.emit(factory, "PaymentSettled");
    });

    it("marks HSP requests as Settled", async function () {
      await factory.executeCycle(payrollId);
      const receipts = await factory.getReceipts(payrollId, 1n);
      for (const receipt of receipts) {
        const req = await hspAdapter.getRequest(receipt.hspRequestId);
        expect(req.status).to.equal(2); // Settled
      }
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        factory.connect(other).executeCycle(payrollId)
      ).to.be.revertedWith("Not payroll owner");
    });

    it("reverts if payroll is not active", async function () {
      await factory.cancelPayroll(payrollId);
      await expect(factory.executeCycle(payrollId)).to.be.revertedWith("Payroll not active");
    });

    it("reverts if called too early for second cycle", async function () {
      await factory.executeCycle(payrollId);
      await expect(factory.executeCycle(payrollId)).to.be.revertedWith("Too early for next cycle");
    });

    it("allows execution after frequency period has passed", async function () {
      await factory.executeCycle(payrollId);
      await time.increase(MONTHLY);
      // Should not revert
      await factory.executeCycle(payrollId);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.cycleCount).to.equal(2n);
    });

    it("reverts if insufficient escrow balance", async function () {
      // Create a new payroll with very small funding
      const tx = await factory.createPayroll(
        "Underfunded",
        await token.getAddress(),
        [recipient1.address],
        [AMOUNT_1],
        MONTHLY
      );
      const receipt2 = await tx.wait();
      let pid2 = 0n;
      for (const log of receipt2!.logs) {
        try {
          const parsed = factory.interface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed && parsed.name === "PayrollCreated") {
            pid2 = parsed.args[0] as bigint;
          }
        } catch { /* skip */ }
      }

      // Fund with less than cycle cost
      const insufficientAmount = ethers.parseUnits("500", 6);
      await factory.fundPayroll(pid2, insufficientAmount);

      await expect(factory.executeCycle(pid2)).to.be.revertedWith("Insufficient escrow balance");
    });

    it("first cycle can execute without time check (lastExecuted == 0)", async function () {
      // First execution should work without any time advance
      await expect(factory.executeCycle(payrollId)).to.not.be.reverted;
    });
  });

  // ─── cancelPayroll ─────────────────────────────────────────────────────────

  describe("cancelPayroll", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
    });

    it("sets payroll to inactive", async function () {
      await factory.cancelPayroll(payrollId);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.active).to.equal(false);
    });

    it("refunds remaining escrow balance to owner", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      const ownerBefore = await token.balanceOf(owner.address);

      await factory.cancelPayroll(payrollId);

      expect(await token.balanceOf(owner.address)).to.equal(ownerBefore + FUND_AMOUNT);
      expect(await factory.escrowBalances(payrollId)).to.equal(0n);
    });

    it("emits PayrollCancelled with refunded amount", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      await expect(factory.cancelPayroll(payrollId))
        .to.emit(factory, "PayrollCancelled")
        .withArgs(payrollId, FUND_AMOUNT);
    });

    it("emits PayrollCancelled with zero if no funds", async function () {
      await expect(factory.cancelPayroll(payrollId))
        .to.emit(factory, "PayrollCancelled")
        .withArgs(payrollId, 0n);
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        factory.connect(other).cancelPayroll(payrollId)
      ).to.be.revertedWith("Not payroll owner");
    });

    it("reverts if already cancelled", async function () {
      await factory.cancelPayroll(payrollId);
      await expect(factory.cancelPayroll(payrollId)).to.be.revertedWith("Already cancelled");
    });

    it("refunds partial escrow after a cycle has been executed", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      await factory.executeCycle(payrollId);
      const cycleCost = AMOUNT_1 + AMOUNT_2;
      const expectedRefund = FUND_AMOUNT - cycleCost;
      const ownerBefore = await token.balanceOf(owner.address);

      await factory.cancelPayroll(payrollId);

      expect(await token.balanceOf(owner.address)).to.equal(ownerBefore + expectedRefund);
    });
  });

  // ─── withdrawExcess ─────────────────────────────────────────────────────────

  describe("withdrawExcess", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
    });

    it("withdraws specified amount to owner", async function () {
      const withdrawAmount = ethers.parseUnits("3000", 6);
      const ownerBefore = await token.balanceOf(owner.address);

      await factory.withdrawExcess(payrollId, withdrawAmount);

      expect(await token.balanceOf(owner.address)).to.equal(ownerBefore + withdrawAmount);
    });

    it("reduces escrow balance by withdrawn amount", async function () {
      const withdrawAmount = ethers.parseUnits("3000", 6);
      await factory.withdrawExcess(payrollId, withdrawAmount);
      expect(await factory.escrowBalances(payrollId)).to.equal(FUND_AMOUNT - withdrawAmount);
    });

    it("emits FundsWithdrawn event", async function () {
      const withdrawAmount = ethers.parseUnits("3000", 6);
      await expect(factory.withdrawExcess(payrollId, withdrawAmount))
        .to.emit(factory, "FundsWithdrawn")
        .withArgs(payrollId, withdrawAmount);
    });

    it("reverts if amount exceeds escrow balance", async function () {
      const tooMuch = FUND_AMOUNT + 1n;
      await expect(factory.withdrawExcess(payrollId, tooMuch)).to.be.revertedWith("Insufficient balance");
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        factory.connect(other).withdrawExcess(payrollId, ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("Not payroll owner");
    });

    it("allows withdrawing the full escrow balance", async function () {
      const ownerBefore = await token.balanceOf(owner.address);
      await factory.withdrawExcess(payrollId, FUND_AMOUNT);
      expect(await token.balanceOf(owner.address)).to.equal(ownerBefore + FUND_AMOUNT);
      expect(await factory.escrowBalances(payrollId)).to.equal(0n);
    });
  });

  // ─── addRecipient ──────────────────────────────────────────────────────────

  describe("addRecipient", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
    });

    it("adds a new recipient to the payroll", async function () {
      await factory.addRecipient(payrollId, other.address, AMOUNT_1);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.recipients).to.include(other.address);
      expect(details.amounts[2]).to.equal(AMOUNT_1);
    });

    it("registers payroll in recipientPayrolls for new recipient", async function () {
      await factory.addRecipient(payrollId, other.address, AMOUNT_1);
      const payrolls = await factory.getRecipientPayrolls(other.address);
      expect(payrolls).to.include(payrollId);
    });

    it("emits RecipientAdded event", async function () {
      await expect(factory.addRecipient(payrollId, other.address, AMOUNT_1))
        .to.emit(factory, "RecipientAdded")
        .withArgs(payrollId, other.address, AMOUNT_1);
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        factory.connect(other).addRecipient(payrollId, other.address, AMOUNT_1)
      ).to.be.revertedWith("Not payroll owner");
    });

    it("reverts if recipient is zero address", async function () {
      await expect(
        factory.addRecipient(payrollId, ethers.ZeroAddress, AMOUNT_1)
      ).to.be.revertedWith("Zero address");
    });

    it("reverts if amount is zero", async function () {
      await expect(
        factory.addRecipient(payrollId, other.address, 0n)
      ).to.be.revertedWith("Zero amount");
    });

    it("reverts if payroll is not active", async function () {
      await factory.cancelPayroll(payrollId);
      await expect(
        factory.addRecipient(payrollId, other.address, AMOUNT_1)
      ).to.be.revertedWith("Payroll not active");
    });
  });

  // ─── removeRecipient ───────────────────────────────────────────────────────

  describe("removeRecipient", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
    });

    it("removes a recipient by index (swap-and-pop)", async function () {
      // Remove recipient at index 0 (recipient1)
      await factory.removeRecipient(payrollId, 0);
      const details = await factory.getPayrollDetails(payrollId);
      // After removal, length should be 1
      expect(details.recipients.length).to.equal(1);
      // recipient1 should no longer be in the list
      expect(details.recipients).to.not.include(recipient1.address);
    });

    it("emits RecipientRemoved event with removed address", async function () {
      await expect(factory.removeRecipient(payrollId, 0))
        .to.emit(factory, "RecipientRemoved")
        .withArgs(payrollId, recipient1.address);
    });

    it("removes last recipient correctly", async function () {
      await factory.removeRecipient(payrollId, 1);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.recipients.length).to.equal(1);
      expect(details.recipients[0]).to.equal(recipient1.address);
    });

    it("reverts if index is out of bounds", async function () {
      await expect(factory.removeRecipient(payrollId, 5)).to.be.revertedWith("Index out of bounds");
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        factory.connect(other).removeRecipient(payrollId, 0)
      ).to.be.revertedWith("Not payroll owner");
    });

    it("reverts if payroll is not active", async function () {
      await factory.cancelPayroll(payrollId);
      await expect(factory.removeRecipient(payrollId, 0)).to.be.revertedWith("Payroll not active");
    });

    it("amounts array stays in sync after removal", async function () {
      // Start: [recipient1 -> AMOUNT_1, recipient2 -> AMOUNT_2]
      // Remove index 0: recipient2 should be swapped to index 0
      await factory.removeRecipient(payrollId, 0);
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.amounts.length).to.equal(1);
      expect(details.amounts[0]).to.equal(AMOUNT_2);
    });
  });

  // ─── getRunway ─────────────────────────────────────────────────────────────

  describe("getRunway", function () {
    let payrollId: bigint;

    beforeEach(async function () {
      payrollId = await createDefaultPayroll();
    });

    it("returns 3 cycles remaining with FUND_AMOUNT=10000 and cycle cost=3000", async function () {
      // AMOUNT_1 = 1000, AMOUNT_2 = 2000 => cycle cost = 3000
      // FUND_AMOUNT = 10000 => 10000 / 3000 = 3 cycles
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      expect(await factory.getRunway(payrollId)).to.equal(3n);
    });

    it("returns 0 if no escrow balance", async function () {
      expect(await factory.getRunway(payrollId)).to.equal(0n);
    });

    it("returns 0 if cycle cost is zero (no recipients)", async function () {
      // Create a payroll then remove all recipients
      const tx = await factory.createPayroll(
        "Empty",
        await token.getAddress(),
        [recipient1.address],
        [AMOUNT_1],
        MONTHLY
      );
      const receipt2 = await tx.wait();
      let pid2 = 0n;
      for (const log of receipt2!.logs) {
        try {
          const parsed = factory.interface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed && parsed.name === "PayrollCreated") {
            pid2 = parsed.args[0] as bigint;
          }
        } catch { /* skip */ }
      }
      await factory.removeRecipient(pid2, 0);
      expect(await factory.getRunway(pid2)).to.equal(0n);
    });

    it("decreases after executing a cycle", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      await factory.executeCycle(payrollId);
      // 10000 - 3000 = 7000 remaining, 7000 / 3000 = 2 cycles
      expect(await factory.getRunway(payrollId)).to.equal(2n);
    });

    it("increases after adding more funds", async function () {
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      // Add enough for one more cycle (3000)
      const additionalFund = ethers.parseUnits("3000", 6);
      await factory.fundPayroll(payrollId, additionalFund);
      // 13000 / 3000 = 4 cycles
      expect(await factory.getRunway(payrollId)).to.equal(4n);
    });
  });

  // ─── getRecipientPayrolls ──────────────────────────────────────────────────

  describe("getRecipientPayrolls", function () {
    it("returns all payroll IDs for a recipient across multiple payrolls", async function () {
      const id1 = await createDefaultPayroll();
      const id2 = await createDefaultPayroll();

      const payrolls = await factory.getRecipientPayrolls(recipient1.address);
      expect(payrolls).to.include(id1);
      expect(payrolls).to.include(id2);
    });

    it("returns empty array for unknown address", async function () {
      const payrolls = await factory.getRecipientPayrolls(other.address);
      expect(payrolls.length).to.equal(0);
    });
  });

  // ─── getPayrollDetails ─────────────────────────────────────────────────────

  describe("getPayrollDetails", function () {
    it("returns correct startTime on creation", async function () {
      const payrollId = await createDefaultPayroll();
      const details = await factory.getPayrollDetails(payrollId);
      expect(details.startTime).to.be.gt(0n);
    });

    it("reflects updated state after funding and execution", async function () {
      const payrollId = await createDefaultPayroll();
      await factory.fundPayroll(payrollId, FUND_AMOUNT);
      await factory.executeCycle(payrollId);

      const details = await factory.getPayrollDetails(payrollId);
      expect(details.totalDeposited).to.equal(FUND_AMOUNT);
      expect(details.totalPaid).to.equal(AMOUNT_1 + AMOUNT_2);
      expect(details.cycleCount).to.equal(1n);
      expect(details.lastExecuted).to.be.gt(0n);
    });
  });

  // ─── hspAdapter reference ─────────────────────────────────────────────────

  describe("hspAdapter", function () {
    it("stores the correct HSPAdapter address", async function () {
      expect(await factory.hspAdapter()).to.equal(await hspAdapter.getAddress());
    });
  });
});
