/**
 * Zama relayer-SDK client for HashPay Confidential.
 *
 * Lazily injects the Zama UMD bundle from jsDelivr (rather than
 * importing `@zama-fhe/relayer-sdk/web`, which pulls 5MB+ of WASM
 * through Turbopack and stalls the production build). The UMD ships
 * its own WASM loader and exposes `window.relayerSDK` once loaded.
 */
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";

const SDK_VERSION = "0.4.1";
const SDK_URL = `https://cdn.jsdelivr.net/npm/@zama-fhe/relayer-sdk@${SDK_VERSION}/bundle/relayer-sdk-js.umd.cjs`;

type RelayerSDK = {
  initSDK: () => Promise<void>;
  createInstance: (config: Record<string, unknown>) => Promise<FhevmInstance>;
  SepoliaConfig: Record<string, unknown>;
};

declare global {
  interface Window {
    relayerSDK?: RelayerSDK;
  }
}

let scriptPromise: Promise<RelayerSDK> | null = null;

function loadRelayerSDK(): Promise<RelayerSDK> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<RelayerSDK>((resolve, reject) => {
    if (window.relayerSDK) return resolve(window.relayerSDK);

    const finish = () => {
      if (window.relayerSDK) resolve(window.relayerSDK);
      else reject(new Error("Zama relayer SDK loaded but window.relayerSDK is undefined"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-zama-relayer-sdk]`,
    );
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Zama relayer SDK")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.dataset.zamaRelayerSdk = "true";
    s.onload = finish;
    s.onerror = () => reject(new Error(`Failed to load Zama relayer SDK from ${SDK_URL}`));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let instancePromise: Promise<FhevmInstance> | null = null;

export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (typeof window === "undefined") {
    throw new Error("getFhevmInstance can only run in the browser");
  }
  if (instancePromise) return instancePromise;

  instancePromise = (async () => {
    const sdk = await loadRelayerSDK();
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
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const contractAddresses = [contractAddress];

  const eip712 = fhe.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimestamp,
    durationDays,
  );

  const signature = await signer.signTypedData({
    domain: eip712.domain,
    types: {
      UserDecryptRequestVerification: [
        ...eip712.types.UserDecryptRequestVerification,
      ],
    },
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
    startTimestamp,
    durationDays,
  );

  return BigInt(result[handle] ?? 0);
}
