// Per-chain viem client cache.
import { createPublicClient, http } from "viem";
import { getChainEntry, rpcUrl } from "./chains.js";
const cache = new Map();
export function publicClient(chainId) {
    const hit = cache.get(chainId);
    if (hit)
        return hit;
    const entry = getChainEntry(chainId);
    const client = createPublicClient({
        chain: entry.chain,
        transport: http(rpcUrl(chainId)),
    });
    cache.set(chainId, client);
    return client;
}
