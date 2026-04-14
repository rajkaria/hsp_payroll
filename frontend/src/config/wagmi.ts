import { defineChain } from "viem";
import { sepolia } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://testnet-explorer.hsk.xyz" },
  },
  testnet: true,
});

export const hashkeyMainnet = defineChain({
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.hsk.xyz" },
  },
  testnet: false,
});

export const wagmiConfig = getDefaultConfig({
  appName: "HashPay",
  projectId: "hsp-payroll-demo",
  chains: [sepolia, hashkeyTestnet, hashkeyMainnet],
  ssr: true,
});

const EXPLORER_URLS: Record<number, string> = {
  84532: "https://sepolia.basescan.org",
  11155111: "https://sepolia.etherscan.io",
  133: "https://testnet-explorer.hsk.xyz",
  177: "https://explorer.hsk.xyz",
};

export function getExplorerUrl(chainId: number = 84532): string {
  return EXPLORER_URLS[chainId] ?? EXPLORER_URLS[84532];
}

export function getExplorerTxUrl(hash: string, chainId: number = 84532): string {
  return `${getExplorerUrl(chainId)}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number = 84532): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}

// Chain metadata for UI
export const CHAIN_META: Record<number, { color: string; dotColor: string; faucetUrl: string }> = {
  84532: {
    color: "bg-[#0052FF]/10 text-[#60A5FA] border-[#0052FF]/20",
    dotColor: "bg-[#0052FF]",
    faucetUrl: "https://www.coinbase.com/faucets/base-ethereum-goerli-faucet",
  },
  11155111: {
    color: "bg-[#627EEA]/10 text-[#A5B4FC] border-[#627EEA]/20",
    dotColor: "bg-[#627EEA]",
    faucetUrl: "https://www.alchemy.com/faucets/ethereum-sepolia",
  },
  133: {
    color: "bg-[#8B5CF6]/10 text-[#C084FC] border-[#8B5CF6]/20",
    dotColor: "bg-[#8B5CF6]",
    faucetUrl: "https://www.hashkeychain.net/faucet",
  },
  177: {
    color: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20",
    dotColor: "bg-[#10B981]",
    faucetUrl: "",
  },
};
