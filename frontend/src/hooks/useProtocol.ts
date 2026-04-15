"use client";
import { useChainId } from "wagmi";
import { getProtocol, hasProtocol } from "@/config/protocol-contracts";

export function useProtocol() {
  const chainId = useChainId();
  return {
    chainId,
    protocol: getProtocol(chainId),
    hasProtocol: hasProtocol(chainId),
  };
}
