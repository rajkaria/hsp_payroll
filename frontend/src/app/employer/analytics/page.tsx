"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/connect-button";
import { SummaryCards } from "@/components/analytics/summary-cards";
import { PaymentVolumeChart } from "@/components/analytics/payment-volume-chart";
import { BurnRateChart } from "@/components/analytics/burn-rate-chart";
import { CostBreakdownChart } from "@/components/analytics/cost-breakdown-chart";
import { AIIntelligencePanel } from "@/components/ai-intelligence";
import {
  generatePaymentVolume,
  generateBurnRate,
  generateCostBreakdown,
  generateSummaryStats,
} from "@/lib/mock-analytics";
import { useLiveAnalytics } from "@/hooks/useLiveAnalytics";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, RefreshCw, Radio, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

type Mode = "live" | "demo";

export default function AnalyticsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("live");

  const mockVolume = useMemo(() => generatePaymentVolume(), []);
  const mockBurn = useMemo(() => generateBurnRate(), []);
  const mockCost = useMemo(() => generateCostBreakdown(), []);
  const mockStats = useMemo(() => generateSummaryStats(), []);

  const live = useLiveAnalytics();

  const useLive = mode === "live" && live.hasData;
  const stats = useLive ? live.stats : mockStats;
  const volumeData = useLive ? live.volume : mockVolume;
  const burnData = useLive ? live.burn : mockBurn;
  const costData = useLive && live.costs.length > 0 ? live.costs : mockCost;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-10 text-center relative">
          <Wallet className="w-10 h-10 text-[#8B5CF6] mx-auto mb-4" />
          <p className="text-[#8B95A9] mb-6">Connect your wallet to view analytics</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-8 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => router.push("/employer")} className="flex items-center gap-1.5 text-sm text-[#525E75] hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
                Payroll <span className="gradient-text">Analytics</span>
              </h1>
              {mode === "live" && live.hasData ? (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20 font-medium flex items-center gap-1.5">
                  <Radio className="w-3 h-3" />
                  Live on-chain
                </span>
              ) : mode === "live" && live.loading ? (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 text-[#C084FC] border border-[#8B5CF6]/20 font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Scanning
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 font-medium">
                  Demo data
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 glass rounded-lg p-1">
                {(["live", "demo"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      mode === m
                        ? "bg-[#8B5CF6]/20 text-[#C084FC]"
                        : "text-[#8B95A9] hover:text-white"
                    }`}
                  >
                    {m === "live" ? "Live" : "Demo"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => live.refresh()}
                disabled={live.loading}
                className="p-2 rounded-lg glass text-[#8B95A9] hover:text-white disabled:opacity-50 transition-colors"
                title="Refresh on-chain data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${live.loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <p className="text-[#8B95A9] mt-1.5 text-sm">
            {mode === "live" && live.hasData
              ? `On-chain activity across your payrolls · updated ${live.lastUpdated ? new Date(live.lastUpdated * 1000).toLocaleTimeString() : "just now"}`
              : mode === "live" && !live.loading
              ? "No on-chain activity yet — showing demo numbers. Execute a cycle or fund a payroll and refresh."
              : "Track payment flows, runway, and team costs"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <SummaryCards stats={stats} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <AIIntelligencePanel payrollData={{
            payrollName: useLive ? "Live Portfolio" : "Team Alpha Monthly",
            token: "USDT",
            recipientCount: stats.totalEmployees,
            amountPerCycle: stats.avgCycleCost,
            frequency: "Monthly",
            escrowBalance: stats.totalPaid * 0.3,
            cyclesExecuted: stats.avgCycleCost > 0 ? Math.floor(stats.totalPaid / stats.avgCycleCost) : 0,
          }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid lg:grid-cols-2 gap-5 mb-5">
          <PaymentVolumeChart data={volumeData} />
          <BurnRateChart data={burnData} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <CostBreakdownChart data={costData} />
        </motion.div>
      </div>
    </div>
  );
}
