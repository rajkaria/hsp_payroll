"use client";

import { useParams } from "next/navigation";
import { useReadContract, useChainId } from "wagmi";
import { REPUTATION_REGISTRY_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { formatUnits, isAddress } from "viem";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Award, TrendingUp, Users, CheckCircle2, Share2, ArrowLeft } from "lucide-react";

const MILESTONES = [
  { usd: 1_000, label: "Verified Earner", color: "#5A6178", bg: "rgba(90,97,120,0.18)" },
  { usd: 10_000, label: "Established", color: "#06B6D4", bg: "rgba(6,182,212,0.18)" },
  { usd: 50_000, label: "Professional", color: "#10B981", bg: "rgba(16,185,129,0.18)" },
  { usd: 100_000, label: "Veteran", color: "#8B5CF6", bg: "rgba(139,92,246,0.18)" },
  { usd: 500_000, label: "Elite", color: "#F59E0B", bg: "rgba(245,158,11,0.18)" },
  { usd: 1_000_000, label: "Legend", color: "#EC4899", bg: "rgba(236,72,153,0.18)" },
];

type HistoryEntry = {
  employer: string;
  amount: bigint;
  timestamp: bigint;
  uid: string;
  onTime: boolean;
};

export default function ReputationPage() {
  const params = useParams<{ address: string }>();
  const address = params?.address as `0x${string}` | undefined;
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const registry = protocol.REPUTATION_REGISTRY as `0x${string}` | undefined;
  const valid = address && isAddress(address);

  const { data: income } = useReadContract({
    address: registry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "incomeOf",
    args: valid ? [address!] : undefined,
    query: { enabled: !!registry && !!valid },
  });
  const { data: employers } = useReadContract({
    address: registry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "employersOf",
    args: valid ? [address!] : undefined,
    query: { enabled: !!registry && !!valid },
  });
  const { data: onTime } = useReadContract({
    address: registry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "onTimeRate",
    args: valid ? [address!] : undefined,
    query: { enabled: !!registry && !!valid },
  });
  const { data: history } = useReadContract({
    address: registry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "historyOf",
    args: valid ? [address!] : undefined,
    query: { enabled: !!registry && !!valid },
  });
  const { data: milestone } = useReadContract({
    address: registry,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "highestMilestone",
    args: valid ? [address!] : undefined,
    query: { enabled: !!registry && !!valid },
  });

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-[#EF4444]">Invalid address</div>
        </div>
      </div>
    );
  }
  if (!registry) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <div className="glass rounded-2xl p-8 max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">Reputation not available on this chain</h1>
          <p className="text-sm text-[#9BA3B7]">Switch to a chain with the protocol deployed.</p>
        </div>
      </div>
    );
  }

  const incomeUsd = income ? Number(formatUnits(income as bigint, 6)) : 0;
  const onTimePct = onTime ? Number(onTime as bigint) / 100 : 0;
  const milestoneUsd = milestone ? Number(formatUnits(milestone as bigint, 6)) : 0;
  const milestoneBadge = MILESTONES.filter((m) => m.usd <= milestoneUsd).pop();
  const totalCycles = Array.isArray(history) ? (history as HistoryEntry[]).length : 0;

  const historyPoints: { t: number; cum: number; amount: number }[] = [];
  if (Array.isArray(history)) {
    let cum = 0;
    for (const pt of history as HistoryEntry[]) {
      cum += Number(formatUnits(pt.amount, 6));
      historyPoints.push({ t: Number(pt.timestamp), cum, amount: Number(formatUnits(pt.amount, 6)) });
    }
  }

  const maxCum = historyPoints.length ? historyPoints[historyPoints.length - 1].cum : 0;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#F59E0B]/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-[#8B5CF6]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 py-10 relative">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> HashPay
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#10B981] font-medium bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-3 py-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified Income Identity
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-[family-name:var(--font-space-grotesk)]">
            <span className="gradient-text">${incomeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span className="text-[#5A6178] text-xl ml-3 font-normal">lifetime verified</span>
          </h1>
          <p className="text-xs font-mono text-[#5A6178] break-all">{address}</p>
          {milestoneBadge && (
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
              style={{ background: milestoneBadge.bg, borderColor: `${milestoneBadge.color}40`, color: milestoneBadge.color }}
            >
              <Award className="w-4 h-4" />
              <span className="text-sm font-semibold">{milestoneBadge.label}</span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          <Stat icon={<TrendingUp className="w-3.5 h-3.5" />} label="Total Income" value={`$${incomeUsd.toLocaleString()}`} accent="#10B981" />
          <Stat icon={<Users className="w-3.5 h-3.5" />} label="Employers" value={`${employers ?? 0}`} />
          <Stat icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="On-Time Rate" value={`${onTimePct.toFixed(1)}%`} accent={onTimePct >= 80 ? "#10B981" : undefined} />
          <Stat icon={<Award className="w-3.5 h-3.5" />} label="Cycles" value={`${totalCycles}`} />
        </motion.div>

        {historyPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 border border-white/5 mb-6"
          >
            <h2 className="text-[10px] font-semibold text-[#5A6178] uppercase tracking-widest mb-4">
              Cumulative Income
            </h2>
            <svg viewBox="0 0 400 120" className="w-full h-36">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = historyPoints.map((p, i) => {
                  const x = (i / Math.max(1, historyPoints.length - 1)) * 400;
                  const y = 120 - (p.cum / maxCum) * 100 - 10;
                  return `${x},${y}`;
                });
                const line = pts.join(" L ");
                const area = `M 0,120 L ${line} L 400,120 Z`;
                return (
                  <>
                    <path d={area} fill="url(#g)" />
                    <path d={`M ${line}`} fill="none" stroke="url(#line)" strokeWidth="2" />
                  </>
                );
              })()}
            </svg>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-6 border border-white/5 mb-6"
        >
          <h2 className="text-[10px] font-semibold text-[#5A6178] uppercase tracking-widest mb-3">Composability</h2>
          <p className="text-sm text-[#9BA3B7] mb-4">
            Any DeFi or PayFi protocol can verify this income permissionlessly:
          </p>
          <pre className="text-xs bg-black/60 border border-white/5 p-5 rounded-xl overflow-x-auto font-mono">
<code className="text-[#C084FC]">{`// Chainlink-compatible oracle call
IReputation(${registry.slice(0, 10)}…).verifyMinimumIncome(
  ${address.slice(0, 10)}…,
  50_000 * 1e6,  // $50k minimum
  90 days         // window
);`}</code>
          </pre>
        </motion.div>

        <div className="flex items-center justify-center pt-4">
          <button
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              navigator.clipboard?.writeText(url);
              toast.success("Link copied");
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition"
          >
            <Share2 className="w-4 h-4" />
            Share this identity
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className="text-[10px] uppercase tracking-wide text-[#5A6178] flex items-center gap-1.5 mb-1.5">{icon} {label}</div>
      <div className="font-semibold text-lg" style={{ color: accent }}>{value}</div>
    </div>
  );
}
