"use client";

import { useAccount } from "wagmi";

export function NetworkBadge() {
  const { chain } = useAccount();

  const isMainnet = chain?.id === 177;
  const networkName = chain?.name || "Not Connected";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
      isMainnet
        ? "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20"
        : "bg-[#8B5CF6]/10 text-[#C084FC] border-[#8B5CF6]/20"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? "bg-[#10B981]" : "bg-[#8B5CF6]"} animate-pulse`} />
      {networkName}
    </div>
  );
}
