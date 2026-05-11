/**
 * Zama relayer-SDK client for HashPay Confidential.
 *
 * Loads the UMD bundle as a script tag (rather than importing
 * `@zama-fhe/relayer-sdk/web`, which pulls 5MB+ of WASM through
 * Turbopack and stalls the production build). The UMD ships its own
 * WASM loader and exposes `window.relayerSDK` once loaded.
 *
 * Self-hosted under /zama/. The UMD locates its WASM via
 * `new URL("/tfhe_bg.wasm", scriptSrc)` — an absolute path against the
 * script's host — so tfhe_bg.wasm and kms_lib_bg.wasm sit at the
 * public root. unpkg is a defense-in-depth fallback if the self-hosted
 * copy ever 404s; jsDelivr is excluded because it serves the .cjs as
 * application/node + nosniff, which browsers refuse to execute.
 */
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";

const SDK_SOURCES = [
  "/zama/relayer-sdk-js.umd.cjs",
  "https://unpkg.com/@zama-fhe/relayer-sdk@0.4.1/bundle/relayer-sdk-js.umd.cjs",
];

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

function injectScript(url: string): Promise<RelayerSDK> {
  return new Promise<RelayerSDK>((resolve, reject) => {
    if (window.relayerSDK) return resolve(window.relayerSDK);

    const finish = () => {
      if (window.relayerSDK) resolve(window.relayerSDK);
      else reject(new Error("Zama relayer SDK loaded but window.relayerSDK is undefined"));
    };

    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.dataset.zamaRelayerSdk = url;
    s.onload = finish;
    s.onerror = () => reject(new Error(`Failed to load Zama relayer SDK from ${url}`));
    document.head.appendChild(s);
  });
}

function loadRelayerSDK(): Promise<RelayerSDK> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = (async () => {
    if (window.relayerSDK) return window.relayerSDK;

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-zama-relayer-sdk]`,
    );
    if (existing) {
      await new Promise<void>((res, rej) => {
        existing.addEventListener("load", () => res(), { once: true });
        existing.addEventListener("error", () => rej(new Error("Existing Zama SDK script failed")), { once: true });
      });
      if (window.relayerSDK) return window.relayerSDK;
    }

    let lastError: unknown;
    for (const url of SDK_SOURCES) {
      try {
        return await injectScript(url);
      } catch (e) {
        lastError = e;
        console.warn(`[fhevm] SDK source failed (${url}):`, e);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("All Zama relayer SDK sources failed");
  })();
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
