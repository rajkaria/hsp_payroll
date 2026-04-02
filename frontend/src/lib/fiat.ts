export const EXCHANGE_RATES = {
  USD: 1.0,
  HKD: 7.82,
} as const;

export function formatFiatValue(
  usdtAmount: bigint,
  currency: keyof typeof EXCHANGE_RATES = "USD",
  decimals = 6
): string {
  const value = Number(usdtAmount) / Math.pow(10, decimals);
  const converted = value * EXCHANGE_RATES[currency];
  const symbol = currency === "USD" ? "$" : "HK$";

  if (converted >= 1_000_000) {
    return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
  }
  if (converted >= 1_000) {
    return `${symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return `${symbol}${converted.toFixed(2)}`;
}

export function formatUsdValue(usdtAmount: bigint, decimals = 6): string {
  return formatFiatValue(usdtAmount, "USD", decimals);
}

export function formatHkdValue(usdtAmount: bigint, decimals = 6): string {
  return formatFiatValue(usdtAmount, "HKD", decimals);
}
