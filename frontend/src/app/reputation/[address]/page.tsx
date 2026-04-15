"use client";

import { useParams } from "next/navigation";
import { useReadContract, useChainId } from "wagmi";
import { REPUTATION_REGISTRY_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { formatUnits, isAddress } from "viem";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award, TrendingUp, Users, CheckCircle2, ExternalLink, Share2 } from "lucide-react";

const MILESTONES = [
  { usd: 1_000, label: "Verified Earner", color: "from-gray-500 to-gray-700" },
  { usd: 10_000, label: "Established", color: "from-blue-500 to-indigo-700" },
  { usd: 50_000, label: "Professional", color: "from-emerald-500 to-teal-700" },
  { usd: 100_000, label: "Veteran", color: "from-purple-500 to-fuchsia-700" },
  { usd: 500_000, label: "Elite", color: "from-amber-500 to-orange-700" },
  { usd: 1_000_000, label: "Legend", color: "from-pink-500 to-rose-700" },
];

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

  if (!valid) return <div className="p-12 text-center text-red-500">Invalid address</div>;
  if (!registry) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Reputation not available on this chain</h1>
          <p className="text-sm text-gray-500">Switch to a chain with the protocol deployed.</p>
        </div>
      </div>
    );
  }

  const incomeUsd = income ? Number(formatUnits(income as bigint, 6)) : 0;
  const onTimePct = onTime ? Number(onTime as bigint) / 100 : 0;
  const milestoneUsd = milestone ? Number(formatUnits(milestone as bigint, 6)) : 0;
  const milestoneBadge = MILESTONES.filter((m) => m.usd <= milestoneUsd).pop();
  const totalCycles = Array.isArray(history) ? (history as any[]).length : 0;

  const historyPoints: { t: number; cum: number; amount: number }[] = [];
  if (Array.isArray(history)) {
    let cum = 0;
    for (const pt of history as any[]) {
      cum += Number(formatUnits(pt.amount as bigint, 6));
      historyPoints.push({ t: Number(pt.timestamp), cum, amount: Number(formatUnits(pt.amount as bigint, 6)) });
    }
  }

  const maxCum = historyPoints.length ? historyPoints[historyPoints.length - 1].cum : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-black dark:via-slate-950 dark:to-indigo-950">
      <div className="max-w-4xl mx-auto p-6 py-16 space-y-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">&larr; HashPay</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Income Identity
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            ${incomeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-gray-400 text-2xl ml-3">lifetime verified</span>
          </h1>
          <p className="text-sm font-mono text-gray-500 break-all">{address}</p>
          {milestoneBadge && (
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white bg-gradient-to-r ${milestoneBadge.color}`}>
              <Award className="w-4 h-4" />
              <span className="text-sm font-semibold">{milestoneBadge.label}</span>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<TrendingUp className="w-4 h-4" />} label="Total Income" value={`$${incomeUsd.toLocaleString()}`} />
          <Stat icon={<Users className="w-4 h-4" />} label="Employers" value={`${employers ?? 0}`} />
          <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="On-Time Rate" value={`${onTimePct.toFixed(1)}%`} />
          <Stat icon={<Award className="w-4 h-4" />} label="Cycles" value={`${totalCycles}`} />
        </div>

        {historyPoints.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">
              Cumulative Income
            </h2>
            <svg viewBox="0 0 400 120" className="w-full h-32">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
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
                    <path d={`M ${line}`} fill="none" stroke="#6366f1" strokeWidth="2" />
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">
            Composability
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Any DeFi or PayFi protocol can verify this income permissionlessly:
          </p>
          <pre className="text-xs bg-slate-100 dark:bg-slate-950 p-4 rounded-lg overflow-x-auto">
            <code>{`// Chainlink-compatible oracle call\nIReputation(${registry}).verifyMinimumIncome(\n  ${address},\n  50_000 * 1e6,  // $50k min\n  90 days         // window\n);`}</code>
          </pre>
        </div>

        <div className="flex items-center justify-center pt-8">
          <button
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              navigator.clipboard?.writeText(url);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
          >
            <Share2 className="w-4 h-4" />
            Share this identity
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800">
      <div className="text-xs text-gray-500 flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
