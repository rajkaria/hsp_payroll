import { getContracts } from "./contracts";

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  color: string;
  icon: string;
  available: boolean;
  isCustom?: boolean;
}

export function getDefaultTokens(chainId?: number): TokenInfo[] {
  const contracts = getContracts(chainId);
  return [
    {
      symbol: "USDT",
      name: "Mock USDT (Testnet)",
      address: contracts.MOCK_USDT,
      decimals: 6,
      color: "#10B981",
      icon: "\u20AE",
      available: true,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 6,
      color: "#2775CA",
      icon: "$",
      available: false,
    },
    {
      symbol: "HSK",
      name: "HashKey Token",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      color: "#1E5EFF",
      icon: "H",
      available: false,
    },
    {
      symbol: "WETH",
      name: "Wrapped ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      color: "#627EEA",
      icon: "\u039E",
      available: false,
    },
  ];
}

// Backward compat — import getDefaultTokens(chainId) in new code
export const DEFAULT_TOKENS: TokenInfo[] = getDefaultTokens();

const CUSTOM_TOKENS_KEY = "hashpay_custom_tokens";

export function getCustomTokens(): TokenInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CUSTOM_TOKENS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCustomToken(token: TokenInfo): void {
  const existing = getCustomTokens();
  const updated = [...existing.filter((t) => t.address.toLowerCase() !== token.address.toLowerCase()), token];
  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(updated));
}

export function removeCustomToken(address: string): void {
  const existing = getCustomTokens();
  localStorage.setItem(
    CUSTOM_TOKENS_KEY,
    JSON.stringify(existing.filter((t) => t.address.toLowerCase() !== address.toLowerCase()))
  );
}

export function getAllTokens(chainId?: number): TokenInfo[] {
  return [...getDefaultTokens(chainId), ...getCustomTokens()];
}
