/**
 * Zama relayer-SDK client for HashPay Confidential.
 *
 * Lazily initializes a singleton FhevmInstance bound to Sepolia (chain
 * 11155111). The SDK pulls public FHE keys + the network config, and
 * exposes:
 *   - createEncryptedInput(contract, user) — for encrypting user inputs
 *     before sending them to a contract.
 *   - userDecrypt(handle, contract, signer) — for decrypting a
 *     ciphertext the caller has ACL permission on.
 *
 * The SDK requires the dynamic import to keep it out of the SSR bundle.
 */
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";

let instancePromise: Promise<FhevmInstance> | null = null;

export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (typeof window === "undefined") {
    throw new Error("getFhevmInstance can only run in the browser");
  }
  if (instancePromise) return instancePromise;

  instancePromise = (async () => {
    const sdk = await import("@zama-fhe/relayer-sdk/web");
    await sdk.initSDK();
    const instance = await sdk.createInstance({
      ...sdk.SepoliaConfig,
      network: window.ethereum,
    });
    return instance;
  })();

  return instancePromise;
}

/**
 * Encrypts a single uint64 value as input for a contract call. Returns
 * the handle + proof in the shape the contract expects.
 */
export async function encryptUint64(
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  value: bigint,
): Promise<{ handle: `0x${string}`; proof: `0x${string}` }> {
  const fhe = await getFhevmInstance();
  const buffer = fhe.createEncryptedInput(contractAddress, userAddress);
  buffer.add64(value);
  const enc = await buffer.encrypt();
  return {
    handle: `0x${Buffer.from(enc.handles[0]).toString("hex")}` as `0x${string}`,
    proof: `0x${Buffer.from(enc.inputProof).toString("hex")}` as `0x${string}`,
  };
}

export async function encryptUint32(
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  value: number,
): Promise<{ handle: `0x${string}`; proof: `0x${string}` }> {
  const fhe = await getFhevmInstance();
  const buffer = fhe.createEncryptedInput(contractAddress, userAddress);
  buffer.add32(value);
  const enc = await buffer.encrypt();
  return {
    handle: `0x${Buffer.from(enc.handles[0]).toString("hex")}` as `0x${string}`,
    proof: `0x${Buffer.from(enc.inputProof).toString("hex")}` as `0x${string}`,
  };
}

/**
 * User-side decrypt: requests a decryption signature from the user, then
 * asks the relayer to decrypt the ciphertext under that signature. The
 * caller must hold ACL permission on the handle.
 */
export async function userDecryptUint(
  handle: `0x${string}`,
  contractAddress: `0x${string}`,
  signer: {
    address: `0x${string}`;
    signTypedData: (params: {
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<`0x${string}`>;
  },
): Promise<bigint> {
  const fhe = await getFhevmInstance();
  const keypair = fhe.generateKeypair();
  const handleContractPairs = [{ handle, contractAddress }];
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = "1";
  const contractAddresses = [contractAddress];

  const eip712 = fhe.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays,
  );

  const signature = await signer.signTypedData({
    domain: eip712.domain,
    types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message,
  });

  const result = await fhe.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    signer.address,
    startTimeStamp,
    durationDays,
  );

  return BigInt(result[handle] ?? 0);
}
