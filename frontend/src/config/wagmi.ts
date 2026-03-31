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

export const wagmiConfig = getDefaultConfig({
  appName: "HSP Payroll",
  projectId: "hsp-payroll-demo",
  chains: [hashkeyTestnet],
  ssr: true,
});
