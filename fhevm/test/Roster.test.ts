import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Signer } from "ethers";

describe("ConfidentialPayrollRoster — confidential batch payroll", function () {
  let owner: Signer;
  let employer: Signer;
  let alice: Signer;
  let bob: Signer;

  let cUSDT: any;
  let cUSDTAddr: string;
  let roster: any;
  let rosterAddr: string;

  before(async () => {
    [owner, employer, alice, bob] = await ethers.getSigners();
    cUSDT = await ethers.deployContract("ConfidentialUSDT");
    await cUSDT.waitForDeployment();
    cUSDTAddr = await cUSDT.getAddress();

    roster = await ethers.deployContract("ConfidentialPayrollRoster", [cUSDTAddr]);
    await roster.waitForDeployment();
    rosterAddr = await roster.getAddress();

    await (await cUSDT.setMinter(rosterAddr, true)).wait();
    await (await cUSDT.setDebitor(rosterAddr, true)).wait();

    // Pre-fund employer with $10,000 cUSDT.
    const fundInput = await fhevm
      .createEncryptedInput(cUSDTAddr, await owner.getAddress())
      .add64(1_000_000n)
      .encrypt();
    await (
      await cUSDT
        .connect(owner)
        .confidentialMintFromExternal(await employer.getAddress(), fundInput.handles[0], fundInput.inputProof)
    ).wait();
  });

  it("disburses encrypted per-employee amounts in a single tx", async () => {
    const tx = await roster.connect(employer).createRoster();
    const receipt = await tx.wait();
    // Roster id 1 expected.
    const rosterId = 1n;

    const aliceAmt = 200_000n; // $2,000
    const bobAmt = 350_000n;   // $3,500

    let inp = await fhevm.createEncryptedInput(rosterAddr, await employer.getAddress()).add64(aliceAmt).encrypt();
    await (await roster.connect(employer).addEmployee(rosterId, await alice.getAddress(), inp.handles[0], inp.inputProof)).wait();

    inp = await fhevm.createEncryptedInput(rosterAddr, await employer.getAddress()).add64(bobAmt).encrypt();
    await (await roster.connect(employer).addEmployee(rosterId, await bob.getAddress(), inp.handles[0], inp.inputProof)).wait();

    await (await roster.connect(employer).executeRoster(rosterId)).wait();

    const aliceBalH = await cUSDT.confidentialBalanceOf(await alice.getAddress());
    const bobBalH = await cUSDT.confidentialBalanceOf(await bob.getAddress());
    const aliceBal = await fhevm.userDecryptEuint(FhevmType.euint64, aliceBalH, cUSDTAddr, alice);
    const bobBal = await fhevm.userDecryptEuint(FhevmType.euint64, bobBalH, cUSDTAddr, bob);
    expect(aliceBal).to.equal(aliceAmt);
    expect(bobBal).to.equal(bobAmt);
  });
});
