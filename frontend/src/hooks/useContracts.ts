"use client";

import { useChainId } from "wagmi";
import { getContracts, type ContractAddresses } from "@/config/contracts";

export function useContracts(): ContractAddresses {
  const chainId = useChainId();
  return getContracts(chainId);
}
