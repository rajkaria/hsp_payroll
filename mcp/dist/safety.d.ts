import type { PublicClient } from "viem";
export type Mode = "read" | "dry-run" | "write";
export declare function getMode(): Mode;
export declare function requireWrite(): void;
declare class SpendTracker {
    private spent;
    private cap;
    constructor();
    check(amount: bigint, label: string): void;
    record(amount: bigint): void;
    snapshot(): {
        spent: string;
        cap: string;
    };
}
export declare const spend: SpendTracker;
export type SimResult = {
    mode: Mode;
    simulated: true;
    returnValue?: unknown;
    txHash?: `0x${string}`;
    explorerUrl?: string;
};
export declare function simulateOrSend<TAbi extends readonly unknown[], TFn extends string>(opts: {
    publicClient: PublicClient;
    wallet: {
        writeContract: (args: {
            address: `0x${string}`;
            abi: TAbi;
            functionName: TFn;
            args: readonly unknown[];
            account: `0x${string}`;
            chain: unknown;
        }) => Promise<`0x${string}`>;
    };
    account: `0x${string}`;
    chain: unknown;
    address: `0x${string}`;
    abi: TAbi;
    functionName: TFn;
    args: readonly unknown[];
    label: string;
    explorerTxUrl: (hash: string) => string;
}): Promise<SimResult>;
export declare function serializeBigints(x: unknown): unknown;
export {};
