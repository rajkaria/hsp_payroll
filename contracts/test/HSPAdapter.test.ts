import { expect } from "chai";
import { ethers } from "hardhat";
import { HSPAdapter } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// Helper: call createPaymentRequest and extract the returned requestId from the tx receipt
async function createRequest(
  adapter: HSPAdapter,
  payer: string,
  recipient: string,
  token: string,
  amount: bigint
): Promise<string> {
  const tx = await adapter.createPaymentRequest(payer, recipient, token, amount);
  const receipt = await tx.wait();
  // The function returns bytes32; decode it via static call on the same nonce is fragile.
  // Instead read it from the emitted event.
  const iface = adapter.interface;
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed && parsed.name === "PaymentRequestCreated") {
        return parsed.args[0] as string;
      }
    } catch {
      // skip non-matching logs
    }
  }
  throw new Error("PaymentRequestCreated event not found");
}

// Helper: call createBatchRequests and extract requestIds from events
async function createBatch(
  adapter: HSPAdapter,
  payer: string,
  recipients: string[],
  token: string,
  amounts: bigint[]
): Promise<string[]> {
  const tx = await adapter.createBatchRequests(payer, recipients, token, amounts);
  const receipt = await tx.wait();
  const iface = adapter.interface;
  const ids: string[] = [];
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed && parsed.name === "PaymentRequestCreated") {
        ids.push(parsed.args[0] as string);
      }
    } catch {
      // skip
    }
  }
  return ids;
}

describe("HSPAdapter", function () {
  let adapter: HSPAdapter;
  let owner: HardhatEthersSigner;
  let payer: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let recipient2: HardhatEthersSigner;
  let tokenAddress: string;

  beforeEach(async function () {
    [owner, payer, recipient, recipient2] = await ethers.getSigners();
    tokenAddress = ethers.Wallet.createRandom().address;

    const HSPAdapterFactory = await ethers.getContractFactory("HSPAdapter");
    adapter = (await HSPAdapterFactory.deploy()) as HSPAdapter;
    await adapter.waitForDeployment();
    // Authorize owner as a caller (simulates PayrollFactory being authorized)
    await adapter.authorizeCaller(owner.address);
  });

  // ─── createPaymentRequest ─────────────────────────────────────────────────

  describe("createPaymentRequest", function () {
    it("creates a request and increments requestCount", async function () {
      expect(await adapter.requestCount()).to.equal(0n);

      await adapter.createPaymentRequest(
        payer.address,
        recipient.address,
        tokenAddress,
        ethers.parseEther("100")
      );

      expect(await adapter.requestCount()).to.equal(1n);
    });

    it("emits PaymentRequestCreated with correct args", async function () {
      const amount = ethers.parseEther("50");

      await expect(
        adapter.createPaymentRequest(payer.address, recipient.address, tokenAddress, amount)
      ).to.emit(adapter, "PaymentRequestCreated");
    });

    it("emits PaymentRequestCreated with correct payer, recipient, token, amount", async function () {
      const amount = ethers.parseEther("50");
      const tx = await adapter.createPaymentRequest(
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );
      const receipt = await tx.wait();
      const parsed = adapter.interface.parseLog({
        topics: [...receipt!.logs[0].topics],
        data: receipt!.logs[0].data,
      })!;

      expect(parsed.name).to.equal("PaymentRequestCreated");
      expect(parsed.args[1]).to.equal(payer.address);    // indexed payer
      expect(parsed.args[2]).to.equal(recipient.address); // indexed recipient
      expect(parsed.args[3]).to.equal(tokenAddress);
      expect(parsed.args[4]).to.equal(amount);
    });

    it("sets request status to Pending (0)", async function () {
      const amount = ethers.parseEther("100");
      const requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );

      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(0); // Pending
    });

    it("stores all fields correctly", async function () {
      const amount = ethers.parseEther("200");
      const requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );

      const req = await adapter.getRequest(requestId);
      expect(req.requestId).to.equal(requestId);
      expect(req.payer).to.equal(payer.address);
      expect(req.recipient).to.equal(recipient.address);
      expect(req.token).to.equal(tokenAddress);
      expect(req.amount).to.equal(amount);
      expect(req.settledAt).to.equal(0n);
      expect(req.createdAt).to.be.gt(0n);
    });

    it("generates unique requestIds for sequential requests", async function () {
      const amount = ethers.parseEther("100");

      const id1 = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );
      const id2 = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );

      expect(id1).to.not.equal(id2);
    });
  });

  // ─── confirmPayment ───────────────────────────────────────────────────────

  describe("confirmPayment", function () {
    let requestId: string;

    beforeEach(async function () {
      requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        ethers.parseEther("100")
      );
    });

    it("confirms a pending request and sets status to Confirmed (1)", async function () {
      await adapter.confirmPayment(requestId);
      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(1); // Confirmed
    });

    it("emits PaymentConfirmed event", async function () {
      await expect(adapter.confirmPayment(requestId))
        .to.emit(adapter, "PaymentConfirmed")
        .withArgs(requestId);
    });

    it("reverts if request does not exist", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(adapter.confirmPayment(fakeId)).to.be.revertedWith("Request does not exist");
    });

    it("reverts if request is not Pending (already Confirmed)", async function () {
      await adapter.confirmPayment(requestId);
      await expect(adapter.confirmPayment(requestId)).to.be.revertedWith("Not pending");
    });

    it("reverts if request is Cancelled", async function () {
      await adapter.cancelPayment(requestId);
      await expect(adapter.confirmPayment(requestId)).to.be.revertedWith("Not pending");
    });

    it("reverts if request is already Settled", async function () {
      await adapter.markSettled(requestId);
      await expect(adapter.confirmPayment(requestId)).to.be.revertedWith("Not pending");
    });
  });

  // ─── markSettled ──────────────────────────────────────────────────────────

  describe("markSettled", function () {
    let requestId: string;

    beforeEach(async function () {
      requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        ethers.parseEther("100")
      );
    });

    it("settles a Confirmed request and sets status to Settled (2)", async function () {
      await adapter.confirmPayment(requestId);
      await adapter.markSettled(requestId);
      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(2); // Settled
    });

    it("can settle a Pending request directly (without confirm)", async function () {
      await adapter.markSettled(requestId);
      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(2); // Settled
    });

    it("sets settledAt to a non-zero timestamp", async function () {
      await adapter.confirmPayment(requestId);
      await adapter.markSettled(requestId);
      const req = await adapter.getRequest(requestId);
      expect(req.settledAt).to.be.gt(0n);
    });

    it("emits PaymentSettled event with requestId and timestamp", async function () {
      await adapter.confirmPayment(requestId);
      const tx = await adapter.markSettled(requestId);
      const block = await ethers.provider.getBlock(tx.blockNumber!);

      await expect(Promise.resolve(tx))
        .to.emit(adapter, "PaymentSettled")
        .withArgs(requestId, block!.timestamp);
    });

    it("reverts if request does not exist", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(adapter.markSettled(fakeId)).to.be.revertedWith("Request does not exist");
    });

    it("reverts if request is Cancelled", async function () {
      await adapter.cancelPayment(requestId);
      await expect(adapter.markSettled(requestId)).to.be.revertedWith("Cannot settle");
    });

    it("reverts if request is already Settled", async function () {
      await adapter.markSettled(requestId);
      await expect(adapter.markSettled(requestId)).to.be.revertedWith("Cannot settle");
    });
  });

  // ─── cancelPayment ────────────────────────────────────────────────────────

  describe("cancelPayment", function () {
    let requestId: string;

    beforeEach(async function () {
      requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        ethers.parseEther("100")
      );
    });

    it("cancels a pending request and sets status to Cancelled (3)", async function () {
      await adapter.cancelPayment(requestId);
      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(3); // Cancelled
    });

    it("emits PaymentCancelled event", async function () {
      await expect(adapter.cancelPayment(requestId))
        .to.emit(adapter, "PaymentCancelled")
        .withArgs(requestId);
    });

    it("reverts if request does not exist", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      await expect(adapter.cancelPayment(fakeId)).to.be.revertedWith("Request does not exist");
    });

    it("reverts if request is not Pending (Confirmed)", async function () {
      await adapter.confirmPayment(requestId);
      await expect(adapter.cancelPayment(requestId)).to.be.revertedWith("Can only cancel pending");
    });

    it("reverts if request is already Cancelled", async function () {
      await adapter.cancelPayment(requestId);
      await expect(adapter.cancelPayment(requestId)).to.be.revertedWith("Can only cancel pending");
    });

    it("reverts if request is Settled", async function () {
      await adapter.markSettled(requestId);
      await expect(adapter.cancelPayment(requestId)).to.be.revertedWith("Can only cancel pending");
    });
  });

  // ─── createBatchRequests ──────────────────────────────────────────────────

  describe("createBatchRequests", function () {
    it("creates multiple requests and returns their IDs", async function () {
      const recipients = [recipient.address, recipient2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

      const ids = await createBatch(adapter, payer.address, recipients, tokenAddress, amounts);

      expect(ids.length).to.equal(2);
      expect(await adapter.requestCount()).to.equal(2n);
    });

    it("all created requests have Pending status", async function () {
      const recipients = [recipient.address, recipient2.address];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

      const ids = await createBatch(adapter, payer.address, recipients, tokenAddress, amounts);

      for (const id of ids) {
        const req = await adapter.getRequest(id);
        expect(req.status).to.equal(0); // Pending
      }
    });

    it("emits PaymentRequestCreated for each request in the batch", async function () {
      const recipients = [recipient.address, recipient2.address];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

      const tx = await adapter.createBatchRequests(
        payer.address,
        recipients,
        tokenAddress,
        amounts
      );
      const receipt = await tx.wait();
      const events = receipt!.logs
        .map((log) => {
          try {
            return adapter.interface.parseLog({ topics: [...log.topics], data: log.data });
          } catch {
            return null;
          }
        })
        .filter((e) => e !== null && e.name === "PaymentRequestCreated");

      expect(events.length).to.equal(2);
    });

    it("stores correct recipient and amount per request", async function () {
      const recipients = [recipient.address, recipient2.address];
      const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

      const ids = await createBatch(adapter, payer.address, recipients, tokenAddress, amounts);

      const req0 = await adapter.getRequest(ids[0]);
      expect(req0.recipient).to.equal(recipients[0]);
      expect(req0.amount).to.equal(amounts[0]);

      const req1 = await adapter.getRequest(ids[1]);
      expect(req1.recipient).to.equal(recipients[1]);
      expect(req1.amount).to.equal(amounts[1]);
    });

    it("reverts on length mismatch between recipients and amounts", async function () {
      const recipients = [recipient.address, recipient2.address];
      const amounts = [ethers.parseEther("100")]; // mismatched

      await expect(
        adapter.createBatchRequests(payer.address, recipients, tokenAddress, amounts)
      ).to.be.revertedWith("Length mismatch");
    });

    it("handles a single-item batch correctly", async function () {
      const recipients = [recipient.address];
      const amounts = [ethers.parseEther("500")];

      const ids = await createBatch(adapter, payer.address, recipients, tokenAddress, amounts);

      expect(ids.length).to.equal(1);
      const req = await adapter.getRequest(ids[0]);
      expect(req.payer).to.equal(payer.address);
      expect(req.amount).to.equal(amounts[0]);
    });

    it("handles an empty batch (zero-length arrays)", async function () {
      const ids = await createBatch(adapter, payer.address, [], tokenAddress, []);

      expect(ids.length).to.equal(0);
      expect(await adapter.requestCount()).to.equal(0n);
    });

    it("all batch requests carry the correct payer and token", async function () {
      const recipients = [recipient.address, recipient2.address];
      const amounts = [ethers.parseEther("5"), ethers.parseEther("15")];

      const ids = await createBatch(adapter, payer.address, recipients, tokenAddress, amounts);

      for (const id of ids) {
        const req = await adapter.getRequest(id);
        expect(req.payer).to.equal(payer.address);
        expect(req.token).to.equal(tokenAddress);
      }
    });
  });

  // ─── getRequest ───────────────────────────────────────────────────────────

  describe("getRequest", function () {
    it("returns correct request data for an existing request", async function () {
      const amount = ethers.parseEther("75");
      const requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );

      const req = await adapter.getRequest(requestId);
      expect(req.requestId).to.equal(requestId);
      expect(req.payer).to.equal(payer.address);
      expect(req.recipient).to.equal(recipient.address);
      expect(req.token).to.equal(tokenAddress);
      expect(req.amount).to.equal(amount);
      expect(req.status).to.equal(0); // Pending
      expect(req.settledAt).to.equal(0n);
    });

    it("reverts for a non-existent requestId", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("does-not-exist"));
      await expect(adapter.getRequest(fakeId)).to.be.revertedWith("Request does not exist");
    });

    it("reflects status updates after confirm", async function () {
      const amount = ethers.parseEther("50");
      const requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );
      await adapter.confirmPayment(requestId);

      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(1); // Confirmed
    });

    it("reflects settledAt timestamp after markSettled", async function () {
      const amount = ethers.parseEther("50");
      const requestId = await createRequest(
        adapter,
        payer.address,
        recipient.address,
        tokenAddress,
        amount
      );
      const tx = await adapter.markSettled(requestId);
      const block = await ethers.provider.getBlock(tx.blockNumber!);

      const req = await adapter.getRequest(requestId);
      expect(req.status).to.equal(2); // Settled
      expect(req.settledAt).to.equal(BigInt(block!.timestamp));
    });
  });
});
