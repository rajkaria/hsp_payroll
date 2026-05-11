import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Signer } from "ethers";

describe("ConfidentialAdvancePositionNFT — encrypted position transfer", function () {
  let owner: Signer;
  let alice: Signer;
  let bob: Signer;
  let nft: any;
  let nftAddr: string;
  let cUSDT: any;
  let cUSDTAddr: string;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    cUSDT = await ethers.deployContract("ConfidentialUSDT");
    await cUSDT.waitForDeployment();
    cUSDTAddr = await cUSDT.getAddress();

    nft = await ethers.deployContract("ConfidentialAdvancePositionNFT");
    await nft.waitForDeployment();
    nftAddr = await nft.getAddress();
  });

  it("mints a position with encrypted metadata", async () => {
    const principalInp = await fhevm.createEncryptedInput(cUSDTAddr, await owner.getAddress()).add64(123_456n).encrypt();
    // Mint cUSDT first to give us a real handle, but we'll use a fresh externalEuint via fromExternal in mint() — for test simplicity mint directly through the NFT's plain constructor accepts already-encrypted handles.
    // Easier: use FHE.asEuint64 via cUSDT.confidentialMint to get a fresh handle that has ACL on owner.
    await (
      await cUSDT
        .connect(owner)
        .confidentialMintFromExternal(await owner.getAddress(), principalInp.handles[0], principalInp.inputProof)
    ).wait();
    const principalH = await cUSDT.confidentialBalanceOf(await owner.getAddress());

    const rateInp = await fhevm.createEncryptedInput(cUSDTAddr, await owner.getAddress()).add64(500n).encrypt();
    await (
      await cUSDT
        .connect(owner)
        .confidentialMintFromExternal(await alice.getAddress(), rateInp.handles[0], rateInp.inputProof)
    ).wait();
    const rateH = await cUSDT.confidentialBalanceOf(await alice.getAddress());

    // Status euint32 — easiest path is to seed from the reputation registry's allowed asEuint32. We'll just take a random handle.
    // For demo, deploy a tiny helper: use ConfidentialReputationRegistry.scoreOf as an euint32 source.
    const repu = await ethers.deployContract("ConfidentialReputationRegistry");
    await repu.waitForDeployment();
    const repuAddr = await repu.getAddress();

    const mirror = await ethers.deployContract("PayrollAttestorMirror", [
      ethers.keccak256(ethers.toUtf8Bytes("hashpay-scoring-v1")),
    ]);
    await mirror.waitForDeployment();
    const mirrorAddr = await mirror.getAddress();
    await (await repu.setOracle(mirrorAddr)).wait();
    await (await mirror.setReputationRegistry(repuAddr)).wait();
    await (await mirror.setRelayer(await owner.getAddress())).wait();

    const statusInp = await fhevm.createEncryptedInput(repuAddr, mirrorAddr).add32(0n).encrypt();
    await (await mirror.connect(owner).forwardScore(await alice.getAddress(), statusInp.handles[0], statusInp.inputProof)).wait();
    const statusH = await repu.scoreOf(await alice.getAddress());

    // Authorize NFT to use these handles.
    await (await repu.connect(alice).authorizeViewer(nftAddr)).wait();
    await (await cUSDT.connect(owner).authorizeBalanceViewer(nftAddr)).wait();
    await (await cUSDT.connect(alice).authorizeBalanceViewer(nftAddr)).wait();

    // Mint position to alice. Owner of NFT is the deployer + minter.
    const tx = await nft.connect(owner).mint(await alice.getAddress(), principalH, rateH, statusH);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
    expect(await nft.ownerOf(1)).to.equal(await alice.getAddress());

    // Alice can decrypt principal.
    const principalReadH = await nft.principalOf(1);
    const principalVal = await fhevm.userDecryptEuint(FhevmType.euint64, principalReadH, nftAddr, alice);
    expect(principalVal).to.equal(123_456n);

    // Transfer to bob.
    await (await nft.connect(alice).transferFrom(await alice.getAddress(), await bob.getAddress(), 1)).wait();
    expect(await nft.ownerOf(1)).to.equal(await bob.getAddress());

    // Bob now has ACL.
    const principalAfterH = await nft.principalOf(1);
    const principalAfter = await fhevm.userDecryptEuint(FhevmType.euint64, principalAfterH, nftAddr, bob);
    expect(principalAfter).to.equal(123_456n);
  });
});
