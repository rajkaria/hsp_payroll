"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { FHEVM_CHAIN_ID } from "@/lib/fhevm/contracts";
import { getFhevmInstance, onFhevmInit } from "@/lib/fhevm/client";

export type FhevmStatus =
  | "idle"
  | "loading-sdk"
  | "loading-keys"
  | "ready"
  | "error";

/**
 * Eagerly warms the FHEVM instance once a wallet is connected on the
 * Sepolia FHEVM chain. Subscribes to onFhevmInit so the status reflects
 * the real phase boundaries reported by client.ts — not a timer guess.
 */
export function useFhevmReady() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [status, setStatus] = useState<FhevmStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<number | "single" | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onFhevmInit((p) => {
      if (p.phase === "loading-script" || p.phase === "init-sdk") {
        setStatus("loading-sdk");
        if (p.phase === "init-sdk") setThreads(p.threads);
      } else if (p.phase === "create-instance") {
        setStatus("loading-keys");
      } else if (p.phase === "ready") {
        setStatus("ready");
        setThreads(p.threads);
      } else if (p.phase === "error") {
        setStatus("error");
        setError(p.message);
        startedRef.current = false;
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isConnected || chainId !== FHEVM_CHAIN_ID) return;
    if (startedRef.current) return;
    startedRef.current = true;

    getFhevmInstance().catch(() => {
      // error already surfaced through onFhevmInit; nothing to do here
    });
  }, [isConnected, chainId]);

  return { status, error, threads };
}
