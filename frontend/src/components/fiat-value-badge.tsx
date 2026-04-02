"use client";

import { formatUsdValue } from "@/lib/fiat";

interface FiatValueBadgeProps {
  amount: bigint;
  decimals?: number;
  className?: string;
}

export function FiatValueBadge({ amount, decimals = 6, className = "" }: FiatValueBadgeProps) {
  if (amount === 0n) return null;
  return (
    <span className={`text-[#525E75] text-xs ${className}`}>
      ≈ {formatUsdValue(amount, decimals)}
    </span>
  );
}
