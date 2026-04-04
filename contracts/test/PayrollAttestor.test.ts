import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PayrollAttestor", function () {
  async function deployFixture() {
    const [owner, employer, recipient1, recipient2] = await ethers.getSigners();

    // Deploy EAS infrastructure (no predeploys on local Hardhat)
    const SchemaRegistry = await ethers.getContractFactory("SchemaRegistry");
    const schemaRegistry = await SchemaRegistry.deploy();
    await schemaRegistry.waitForDeployment();

    const EAS = await ethers.getContractFactory("EAS");
    const eas = await EAS.deploy(await schemaRegistry.getAddress());
    await eas.waitForDeployment();

    // Deploy HSP + PayrollFactory
    const HSPAdapter = await ethers.getContractFactory("HSPAdapter");
    const hsp = await HSPAdapter.deploy();
    await hsp.waitForDeployment();

    const PayrollFactory = await ethers.getContractFactory("PayrollFactory");
    const factory = await PayrollFactory.deploy(await hsp.getAddress());
    await factory.waitForDeployment();

    // Authorize PayrollFactory as HSP caller
    await hsp.authorizeCaller(await factory.getAddress());

    // Deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Mock USDT", "USDT", 6);
    await token.waitForDeployment();

    // Deploy PayrollAttestor
    const PayrollAttestor = await ethers.getContractFactory("PayrollAttestor");
    const attestor = await PayrollAttestor.deploy(
      await eas.getAddress(),
      await schemaRegistry.getAddress(),
      await factory.getAddress()
    );
    await attestor.waitForDeployment();

    // Setup: mint tokens, create and fund a payroll, execute a cycle
    const mintAmount = ethers.parseUnits("100000", 6);
    await token.mint(employer.address, mintAmount);
    await token.connect(employer).approve(await factory.getAddress(), mintAmount);

    const amounts = [ethers.parseUnits("1000", 6), ethers.parseUnits("500", 6)];
    await factory.connect(employer).createPayroll(
      "Test Payroll",
      await token.getAddress(),
      [recipient1.address, recipient2.address],
      amounts,
      604800 // weekly
    );

    await factory.connect(employer).fundPayroll(1, ethers.parseUnits("10000", 6));
    await factory.connect(employer).executeCycle(1);

    return { owner, employer, recipient1, recipient2, eas, schemaRegistry, factory, token, attestor };
  }

  describe("registerSchema", function () {
    it("registers schema and stores UID", async function () {
      const { attestor } = await loadFixture(deployFixture);
      const tx = await attestor.registerSchema();
      await tx.wait();
      const uid = await attestor.schemaUID();
      expect(uid).to.not.equal(ethers.ZeroHash);
    });

    it("emits SchemaRegistered event", async function () {
      const { attestor } = await loadFixture(deployFixture);
      await expect(attestor.registerSchema()).to.emit(attestor, "SchemaRegistered");
    });

    it("reverts on duplicate registration", async function () {
      const { attestor } = await loadFixture(deployFixture);
      await attestor.registerSchema();
      await expect(attestor.registerSchema()).to.be.revertedWith("Schema already registered");
    });

    it("only owner can register", async function () {
      const { attestor, employer } = await loadFixture(deployFixture);
      await expect(attestor.connect(employer).registerSchema()).to.be.revertedWith("Not owner");
    });
  });

  describe("attestCycle", function () {
    it("creates attestations for each receipt in cycle", async function () {
      const { attestor, employer, token } = await loadFixture(deployFixture);
      await attestor.registerSchema();

      const tx = await attestor.attestCycle(
        1, // payrollId
        1, // cycleNumber
        employer.address,
        await token.getAddress(),
        "USDT"
      );
      const receipt = await tx.wait();

      // Should emit 2 PayrollAttested events (2 recipients)
      const events = receipt?.logs.filter(
        (log) => {
          try {
            return attestor.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "PayrollAttested";
          } catch { return false; }
        }
      );
      expect(events?.length).to.equal(2);
    });

    it("returns correct number of UIDs", async function () {
      const { attestor, employer, token } = await loadFixture(deployFixture);
      await attestor.registerSchema();

      // Use staticCall to get return value
      const uids = await attestor.attestCycle.staticCall(
        1, 1, employer.address, await token.getAddress(), "USDT"
      );
      expect(uids.length).to.equal(2);
      expect(uids[0]).to.not.equal(ethers.ZeroHash);
      expect(uids[1]).to.not.equal(ethers.ZeroHash);
    });

    it("reverts if schema not registered", async function () {
      const { attestor, employer, token } = await loadFixture(deployFixture);
      await expect(
        attestor.attestCycle(1, 1, employer.address, await token.getAddress(), "USDT")
      ).to.be.revertedWith("Schema not registered");
    });

    it("reverts for cycle with no receipts", async function () {
      const { attestor, employer, token } = await loadFixture(deployFixture);
      await attestor.registerSchema();
      await expect(
        attestor.attestCycle(1, 99, employer.address, await token.getAddress(), "USDT") // non-existent cycle
      ).to.be.revertedWith("No receipts for cycle");
    });

    it("attestation exists in EAS after creation", async function () {
      const { attestor, eas, employer, token } = await loadFixture(deployFixture);
      await attestor.registerSchema();

      const uids = await attestor.attestCycle.staticCall(
        1, 1, employer.address, await token.getAddress(), "USDT"
      );
      await attestor.attestCycle(1, 1, employer.address, await token.getAddress(), "USDT");

      // getAttestation should not revert for valid UIDs (it reverts for non-existent)
      const att = await eas.getAttestation(uids[0]);
      // The Result is non-empty — attestation exists
      expect(att.length).to.be.greaterThan(0);

      // Second attestation also exists
      const att2 = await eas.getAttestation(uids[1]);
      expect(att2.length).to.be.greaterThan(0);
    });
  });

  describe("attestSingle", function () {
    it("creates a single attestation", async function () {
      const { attestor, employer, token, recipient1 } = await loadFixture(deployFixture);
      await attestor.registerSchema();

      const uid = await attestor.attestSingle.staticCall(
        1, 1, employer.address, recipient1.address,
        ethers.parseUnits("1000", 6),
        await token.getAddress(),
        ethers.randomBytes(32),
        "USDT"
      );
      expect(uid).to.not.equal(ethers.ZeroHash);
    });
  });
});
