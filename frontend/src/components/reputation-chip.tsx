"use client";

import { useReadContract, useChainId } from "wagmi";
import { REPUTATION_REGISTRY_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { formatUnits } from "viem";
import Link from "next/link";
import { TrendingUp, Star, ExternalLink } from "lucide-react";

export function ReputationChip({ address }: { address: `0x${string}` }) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const regAddr = protocol.REPUTATION_REGISTRY as `0x${string}` | undefined;

  const { data: income } = useReadContract({
    address: regAddr,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "incomeOf",
    args: [address],
    query: { enabled: !!regAddr, refetchInterval: 15000 },
  });

  const { data: onTime } = useReadContract({
    address: regAddr,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "onTimeRate",
    args: [address],
    query: { enabled: !!regAddr, refetchInterval: 15000 },
  });

  const { data: employers } = useReadContract({
    address: regAddr,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "employersOf",
    args: [address],
    query: { enabled: !!regAddr, refetchInterval: 15000 },
  });

  if (!regAddr) return null;

  const incomeUsd = income ? Number(formatUnits(income as bigint, 6)) : 0;
  const onTimePct = onTime ? Number(onTime) / 100 : 0;
  const employerCount = employers ? Number(employers) : 0;

  const tier =
    incomeUsd >= 10_000 && onTimePct >= 80
      ? { name: "Prime", color: "#10B981", ltv: "70%", apr: "1%" }
      : incomeUsd >= 1_000
      ? { name: "Standard", color: "#06B6D4", ltv: "50%", apr: "1.5%" }
      : incomeUsd >= 100
      ? { name: "Starter", color: "#F59E0B", ltv: "30%", apr: "2%" }
      : { name: "Unranked", color: "#5A6178", ltv: "—", apr: "—" };

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="font-semibold text-sm">On-chain Reputation</h3>
        </div>
        <Link
          href={`/reputation/${address}`}
          className="text-xs text-[#9BA3B7] hover:text-white flex items-center gap-1 transition-colors"
        >
          Public page <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Verified Income" value={`$${incomeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<TrendingUp className="w-3 h-3" />} />
        <Metric label="On-Time Rate" value={`${onTimePct.toFixed(0)}%`} />
        <Metric label="Employers" value={`${employerCount}`} />
        <div className="bg-[#0A0B14]/50 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#5A6178] mb-1">Credit Tier</div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: tier.color }}
            />
            <span className="font-semibold text-sm" style={{ color: tier.color }}>
              {tier.name}
            </span>
          </div>
          <div className="text-[10px] text-[#5A6178] mt-0.5">
            {tier.ltv} LTV · {tier.apr} APR
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-[#0A0B14]/50 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-[#5A6178] mb-1 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
