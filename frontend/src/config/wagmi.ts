import { defineChain } from "viem";
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
  chains: [hashkeyTestnet, hashkeyMainnet],
  ssr: true,
});

export function getExplorerUrl(chainId: number = 133): string {
  return chainId === 177
    ? "https://explorer.hsk.xyz"
    : "https://testnet-explorer.hsk.xyz";
}

export function getExplorerTxUrl(hash: string, chainId: number = 133): string {
  return `${getExplorerUrl(chainId)}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number = 133): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}
