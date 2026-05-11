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
  initSDK: (opts?: { thread?: number }) => Promise<void>;
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

/**
 * Subscribe to FHE init progress. The Zama SDK doesn't expose progress
 * events, so we surface the four phases we can observe: script load,
 * initSDK (WASM compile + worker pool), createInstance (Sepolia public
 * key + CRS download), ready.
 */
export type FhevmInitPhase =
  | { phase: "loading-script"; elapsedMs: number }
  | { phase: "init-sdk"; elapsedMs: number; threads: number | "single" }
  | { phase: "create-instance"; elapsedMs: number }
  | { phase: "ready"; totalMs: number; threads: number | "single" }
  | { phase: "error"; elapsedMs: number; message: string };

const initListeners = new Set<(p: FhevmInitPhase) => void>();
export function onFhevmInit(cb: (p: FhevmInitPhase) => void) {
  initListeners.add(cb);
  return () => initListeners.delete(cb);
}
function emit(p: FhevmInitPhase) {
  for (const l of initListeners) {
    try {
      l(p);
    } catch {
      // listener errors are non-fatal
    }
  }
}

export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (typeof window === "undefined") {
    throw new Error("getFhevmInstance can only run in the browser");
  }
  if (instancePromise) return instancePromise;

  instancePromise = (async () => {
    const t0 = performance.now();
    try {
      emit({ phase: "loading-script", elapsedMs: 0 });
      const sdk = await loadRelayerSDK();
      const tScript = performance.now();
      console.info(
        `[fhevm] SDK script loaded in ${Math.round(tScript - t0)}ms`,
      );

      const isolated =
        typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
      const hasSAB = typeof SharedArrayBuffer !== "undefined";
      const threads =
        isolated && hasSAB
          ? Math.min(navigator.hardwareConcurrency || 4, 8)
          : undefined;
      console.info(
        `[fhevm] crossOriginIsolated=${isolated} SAB=${hasSAB} threads=${threads ?? "single"}`,
      );

      emit({
        phase: "init-sdk",
        elapsedMs: Math.round(tScript - t0),
        threads: threads ?? "single",
      });
      await sdk.initSDK(threads ? { thread: threads } : undefined);
      const tInit = performance.now();
      console.info(`[fhevm] initSDK done in ${Math.round(tInit - tScript)}ms`);

      emit({ phase: "create-instance", elapsedMs: Math.round(tInit - t0) });
      const instance = await sdk.createInstance({
        ...sdk.SepoliaConfig,
        network: window.ethereum,
      });
      const tInstance = performance.now();
      console.info(
        `[fhevm] createInstance (Sepolia key + CRS fetch) done in ${Math.round(tInstance - tInit)}ms · total cold-start ${Math.round(tInstance - t0)}ms`,
      );

      emit({
        phase: "ready",
        totalMs: Math.round(tInstance - t0),
        threads: threads ?? "single",
      });
      return instance;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emit({
        phase: "error",
        elapsedMs: Math.round(performance.now() - t0),
        message: msg,
      });
      instancePromise = null;
      throw e;
    }
  })();

  return instancePromise;
}

/**
 * Per-call encrypt progress for the UI. The Zama SDK's `buffer.encrypt()`
 * does ZK proof computation locally then POSTs to the relayer — the
 * relayer round-trip is usually the dominant cost on Sepolia testnet.
 */
export type EncryptPhase =
  | "awaiting-sdk"
  | "building-proof"
  | "submitting-to-relayer"
  | "done";

/**
 * Encrypts a single uint64 value as input for a contract call. Returns
 * the handle + proof in the shape the contract expects.
 */
export async function encryptUint64(
  contractAddress: `0x${string}`,
  userAddress: `0x${string}`,
  value: bigint,
  onPhase?: (p: EncryptPhase) => void,
): Promise<{ handle: `0x${string}`; proof: `0x${string}` }> {
  const t0 = performance.now();
  onPhase?.("awaiting-sdk");
  const fhe = await getFhevmInstance();
  const tSdk = performance.now();
  console.info(
    `[fhevm/encrypt] SDK ready in ${Math.round(tSdk - t0)}ms (cached if <50ms)`,
  );

  onPhase?.("building-proof");
  const buffer = fhe.createEncryptedInput(contractAddress, userAddress);
  buffer.add64(value);

  // The SDK doesn't expose a separate "compute proof" vs "POST to relayer"
  // boundary — buffer.encrypt() does both. We can't subdivide further
  // without forking the SDK. The relayer round-trip dominates this on
  // Sepolia; multi-threading only speeds up the local TFHE/ZK math.
  onPhase?.("submitting-to-relayer");
  const tProof = performance.now();
  const enc = await buffer.encrypt();
  const tDone = performance.now();
  console.info(
    `[fhevm/encrypt] encrypt() done in ${Math.round(tDone - tProof)}ms · total ${Math.round(tDone - t0)}ms`,
  );

  onPhase?.("done");
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
