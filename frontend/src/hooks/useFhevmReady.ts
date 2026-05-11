"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { FHEVM_CHAIN_ID } from "@/lib/fhevm/contracts";
import { getFhevmInstance } from "@/lib/fhevm/client";

export type FhevmStatus =
  | "idle"
  | "loading-sdk"
  | "loading-keys"
  | "ready"
  | "error";

/**
 * Eagerly warms the FHEVM instance once a wallet is connected on the
 * Sepolia FHEVM chain. Loads the relayer SDK + WASM + Sepolia public
 * key in the background so the first encrypted action doesn't pay the
 * full ~30-60s cold-start cost behind an opaque "Encrypting…" label.
 */
export function useFhevmReady() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [status, setStatus] = useState<FhevmStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isConnected || chainId !== FHEVM_CHAIN_ID) {
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    setStatus("loading-sdk");
    const keysTimer = setTimeout(() => {
      setStatus((s) => (s === "loading-sdk" ? "loading-keys" : s));
    }, 2500);

    getFhevmInstance()
      .then(() => {
        clearTimeout(keysTimer);
        setStatus("ready");
      })
      .catch((e) => {
        clearTimeout(keysTimer);
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
        startedRef.current = false;
      });

    return () => clearTimeout(keysTimer);
  }, [isConnected, chainId]);

  return { status, error };
}
