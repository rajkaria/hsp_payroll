// Per-chain viem client cache.

import { createPublicClient, http, type PublicClient } from "viem";
import { getChainEntry, rpcUrl } from "./chains.js";

const cache = new Map<number, PublicClient>();

export function publicClient(chainId: number): PublicClient {
  const hit = cache.get(chainId);
  if (hit) return hit;
  const entry = getChainEntry(chainId);
  const client = createPublicClient({
    chain: entry.chain,
    transport: http(rpcUrl(chainId)),
  });
  cache.set(chainId, client as PublicClient);
  return client as PublicClient;
}
