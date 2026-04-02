"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/connect-button";
import { SummaryCards } from "@/components/analytics/summary-cards";
import { PaymentVolumeChart } from "@/components/analytics/payment-volume-chart";
import { BurnRateChart } from "@/components/analytics/burn-rate-chart";
import { CostBreakdownChart } from "@/components/analytics/cost-breakdown-chart";
import { generatePaymentVolume, generateBurnRate, generateCostBreakdown, generateSummaryStats } from "@/lib/mock-analytics";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet } from "lucide-react";
import { useMemo } from "react";

export default function AnalyticsPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  const volumeData = useMemo(() => generatePaymentVolume(), []);
  const burnData = useMemo(() => generateBurnRate(), []);
  const costData = useMemo(() => generateCostBreakdown(), []);
  const stats = useMemo(() => generateSummaryStats(), []);

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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Payroll <span className="gradient-text">Analytics</span>
            </h1>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 font-medium">
              Preview
            </span>
          </div>
          <p className="text-[#8B95A9] mt-1.5 text-sm">Track payment flows, runway, and team costs</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <SummaryCards stats={stats} />
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
