"use client";

import { useAccount } from "wagmi";
import { CHAIN_META } from "@/config/wagmi";

export function NetworkBadge() {
  const { chain } = useAccount();

  const networkName = chain?.name || "Not Connected";
  const meta = chain?.id ? CHAIN_META[chain.id] : null;

  const colorClass = meta?.color ?? "bg-[#8B5CF6]/10 text-[#C084FC] border-[#8B5CF6]/20";
  const dotClass = meta?.dotColor ?? "bg-[#8B5CF6]";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
      {networkName}
    </div>
  );
}
