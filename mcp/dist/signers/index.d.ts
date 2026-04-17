import { type Chain, type WalletClient } from "viem";
export type SignerKind = "privateKey" | "ledger" | "walletconnect";
export type Signer = {
    kind: SignerKind;
    account: `0x${string}`;
    walletClientFor: (chain: Chain) => WalletClient;
};
export declare function getSignerKind(): SignerKind;
export declare function getSigner(): Promise<Signer>;
