// Safety layer — mode gate, spend cap, chain allowlist, dry-run simulator.
export function getMode() {
    const m = (process.env.HASHPAY_MODE ?? "read").toLowerCase();
    if (!["read", "dry-run", "write"].includes(m)) {
        throw new Error(`Invalid HASHPAY_MODE=${m}. Use "read", "dry-run", or "write".`);
    }
    return m;
}
export function requireWrite() {
    const m = getMode();
    if (m === "read") {
        throw new Error("Write operation attempted in HASHPAY_MODE=read. " +
            "Set HASHPAY_MODE=write (or dry-run to simulate).");
    }
}
// Session-lifetime spend tracker. Caps apply across all write tools combined.
// Cap is expressed in base units of the token (typically 6-dec USDC); the
// caller converts token-denominated amounts before checking.
class SpendTracker {
    spent = 0n;
    cap;
    constructor() {
        const capStr = process.env.HASHPAY_MAX_SPEND_PER_SESSION ?? "";
        // Empty string = no cap. Value is in token base units (e.g. "1000000000" = 1000 USDC).
        this.cap = capStr ? BigInt(capStr) : -1n;
    }
    check(amount, label) {
        if (this.cap < 0n)
            return;
        if (this.spent + amount > this.cap) {
            throw new Error(`Spend cap exceeded: ${label} would push session spend to ` +
                `${this.spent + amount} (cap: ${this.cap}). ` +
                `Raise HASHPAY_MAX_SPEND_PER_SESSION or start a new session.`);
        }
    }
    record(amount) {
        this.spent += amount;
    }
    snapshot() {
        return { spent: this.spent.toString(), cap: this.cap.toString() };
    }
}
export const spend = new SpendTracker();
export async function simulateOrSend(opts) {
    const mode = getMode();
    // Simulate for both dry-run and write — guarantees we never send a tx
    // that would revert.
    // @ts-expect-error viem's simulateContract is generic over abi
    const sim = await opts.publicClient.simulateContract({
        address: opts.address,
        abi: opts.abi,
        functionName: opts.functionName,
        args: opts.args,
        account: opts.account,
    });
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
        chain: opts.chain,
    });
    return {
        mode,
        simulated: true,
        returnValue: serializeBigints(sim.result),
        txHash: hash,
        explorerUrl: opts.explorerTxUrl(hash),
    };
}
// Recursively convert bigints to strings so responses JSON-serialize cleanly
// for the MCP transport.
export function serializeBigints(x) {
    if (typeof x === "bigint")
        return x.toString();
    if (Array.isArray(x))
        return x.map(serializeBigints);
    if (x && typeof x === "object") {
        const out = {};
        for (const [k, v] of Object.entries(x))
            out[k] = serializeBigints(v);
        return out;
    }
    return x;
}
