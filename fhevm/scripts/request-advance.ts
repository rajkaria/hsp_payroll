import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Requests a confidential advance and (in the local FHEVM mock environment)
 * decrypts the resulting cUSDT balance to verify the disbursement.
 *
 * Run after `seed-demo.ts`.
 */
async function main() {
  // The FHEVM plugin auto-initializes for `hardhat test` / built-in tasks but
  // NOT for `hardhat run`. Without this call, both `fhevm.createEncryptedInput`
  // and the provider extender's error formatter trip a "not initialized" throw.
  await fhevm.initializeCLIApi();

  const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments.json"), "utf8"),
  );
  const { contracts } = deployments;
  const [borrower] = await ethers.getSigners();

  const advance = await ethers.getContractAt("ConfidentialAdvance", contracts.ConfidentialAdvance);
  const cUSDT = await ethers.getContractAt("ConfidentialUSDT", contracts.ConfidentialUSDT);
  const reputationRegistry = await ethers.getContractAt(
    "ConfidentialReputationRegistry",
    contracts.ConfidentialReputationRegistry,
  );

  // Borrower authorizes ConfidentialAdvance to read their score.
  await (await reputationRegistry.authorizeViewer(contracts.ConfidentialAdvance)).wait();

  // Encrypt requested amount = $1,200.00 (cents = 120_000).
  const requestedCents = 120_000n;
  const input = await fhevm
    .createEncryptedInput(contracts.ConfidentialAdvance, borrower.address)
    .add64(requestedCents)
    .encrypt();

  const tx = await advance.requestAdvance(input.handles[0], input.inputProof);
  const receipt = await tx.wait();
  console.log("Advance requested. Tx:", receipt?.hash);

  // Decrypt the borrower's cUSDT balance to see if the advance was approved.
  const balanceHandle = await cUSDT.confidentialBalanceOf(borrower.address);
  const clear = await fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, contracts.ConfidentialUSDT, borrower);
  console.log("Decrypted cUSDT balance (cents):", clear.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
