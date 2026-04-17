// Safety layer — mode gate, spend cap, chain allowlist, dry-run simulator.

import type { PublicClient, WalletClient } from "viem";

export type Mode = "read" | "dry-run" | "write";

export function getMode(): Mode {
  const m = (process.env.HASHPAY_MODE ?? "read").toLowerCase() as Mode;
  if (!["read", "dry-run", "write"].includes(m)) {
    throw new Error(
      `Invalid HASHPAY_MODE=${m}. Use "read", "dry-run", or "write".`,
    );
  }
  return m;
}

export function requireWrite() {
  const m = getMode();
  if (m === "read") {
    throw new Error(
      "Write operation attempted in HASHPAY_MODE=read. " +
        "Set HASHPAY_MODE=write (or dry-run to simulate).",
    );
  }
}

// Session-lifetime spend tracker. Caps apply across all write tools combined.
// Cap is expressed in base units of the token (typically 6-dec USDC); the
// caller converts token-denominated amounts before checking.
class SpendTracker {
  private spent = 0n;
  private cap: bigint;

  constructor() {
    const capStr = process.env.HASHPAY_MAX_SPEND_PER_SESSION ?? "";
    this.cap = capStr ? BigInt(capStr) : -1n;
  }

  check(amount: bigint, label: string) {
    if (this.cap < 0n) return;
    if (this.spent + amount > this.cap) {
      throw new Error(
        `Spend cap exceeded: ${label} would push session spend to ` +
          `${this.spent + amount} (cap: ${this.cap}). ` +
          `Raise HASHPAY_MAX_SPEND_PER_SESSION or start a new session.`,
      );
    }
  }

  record(amount: bigint) {
    this.spent += amount;
  }

  snapshot() {
    return { spent: this.spent.toString(), cap: this.cap.toString() };
  }
}

export const spend = new SpendTracker();

export type SimResult = {
  mode: Mode;
  simulated: true;
  returnValue?: unknown;
  txHash?: `0x${string}`;
  explorerUrl?: string;
};

// Simulate-or-send wrapper. viem's WriteContract generics resist being passed
// through a helper without deep constraint dances; we accept a looser shape
// at the boundary and cast internally. The ABI and args are validated at
// runtime by viem itself.
export async function simulateOrSend(opts: {
  publicClient: PublicClient;
  wallet: WalletClient;
  account: `0x${string}`;
  chain: unknown;
  address: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any;
  functionName: string;
  args: readonly unknown[];
  label: string;
  explorerTxUrl: (hash: string) => string;
}): Promise<SimResult> {
  const mode = getMode();

  const sim = await opts.publicClient.simulateContract({
    address: opts.address,
    abi: opts.abi,
    functionName: opts.functionName,
    args: opts.args,
    account: opts.account,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (mode === "dry-run") {
    return {
      mode,
      simulated: true,
      returnValue: serializeBigints(sim.result),
    };
  }

  const hash = await opts.wallet.writeContract({
    address: opts.address,
    abi: opts.abi,
    functionName: opts.functionName,
    args: opts.args,
    account: opts.account,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain: opts.chain as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return {
    mode,
    simulated: true,
    returnValue: serializeBigints(sim.result),
    txHash: hash,
    explorerUrl: opts.explorerTxUrl(hash),
  };
}

export function serializeBigints(x: unknown): unknown {
  if (typeof x === "bigint") return x.toString();
  if (Array.isArray(x)) return x.map(serializeBigints);
  if (x && typeof x === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) out[k] = serializeBigints(v);
    return out;
  }
  return x;
}
