"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { PaymentHistory } from "@/components/payment-history";
import { CSVExport } from "@/components/csv-export";
import { useRecipientPayrolls } from "@/hooks/usePayrolls";
import { motion } from "framer-motion";
import { Wallet, FileText, ArrowLeft, Building2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { GaslessBadge } from "@/components/gasless-badge";
import { GaslessClaimModal } from "@/components/gasless-claim-modal";
import { StreamingBalance } from "@/components/streaming-balance";
import { WithdrawToBankModal } from "@/components/withdraw-to-bank-modal";
import { EXCHANGE_RATES } from "@/lib/fiat";

export default function EmployeeDashboard() {
  const { address, isConnected } = useAccount();
  const { data: payrollIds } = useRecipientPayrolls(address as `0x${string}` | undefined);
  const router = useRouter();
  const [showGaslessModal, setShowGaslessModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-10 text-center relative"
        >
          <Wallet className="w-10 h-10 text-[#8B5CF6] mx-auto mb-4" />
          <p className="text-[#8B95A9] mb-6">Connect your wallet to view your payments</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  const hasPayrolls = payrollIds && payrollIds.length > 0;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-8 relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10"
        >
          <div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-[#525E75] hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
                My <span className="gradient-text">Payments</span>
              </h1>
              <GaslessBadge />
            </div>
            <p className="text-[#8B95A9] mt-1.5 text-sm">View your payment history and HSP receipts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGaslessModal(true)}
              className="p-2.5 glass rounded-xl hover:border-[#10B981]/30 transition-all"
              title="Gasless Claims"
            >
              <Zap className="w-4 h-4 text-[#10B981]" />
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="p-2.5 glass rounded-xl hover:border-[#1E5EFF]/30 transition-all"
              title="Withdraw to Bank"
            >
              <Building2 className="w-4 h-4 text-[#8B95A9]" />
            </button>
            <ConnectButton />
          </div>
        </motion.div>

        {/* Streaming Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <StreamingBalance totalEarned={1247.891234} ratePerSecond={0.000385} />
        </motion.div>

        {/* Exchange Rate Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-xl px-4 py-2.5 mb-6 flex items-center justify-between text-xs"
        >
          <span className="text-[#525E75]">Exchange Rates</span>
          <div className="flex items-center gap-4 text-[#8B95A9]">
            <span>1 USDT = <span className="text-white font-medium">$1.00 USD</span></span>
            <span className="w-1 h-1 rounded-full bg-[#1A2340]" />
            <span>1 USDT = <span className="text-white font-medium">HK${EXCHANGE_RATES.HKD} HKD</span></span>
          </div>
        </motion.div>

        {!hasPayrolls ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#1E5EFF]/10 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-8 h-8 text-[#8B5CF6]" />
            </div>
            <div className="text-[#8B95A9] text-lg mb-2">No payments found</div>
            <p className="text-sm text-[#525E75] max-w-sm mx-auto">
              Your wallet address is not a recipient of any active payroll yet.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
                Payment History
              </h2>
              <CSVExport receipts={[]} />
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <PaymentHistory payments={[]} />
            </div>

            <div className="text-xs text-[#525E75] text-center">
              All payments settled via HashKey Settlement Protocol on HashKey Chain
            </div>
          </motion.div>
        )}
      </div>

      {showGaslessModal && <GaslessClaimModal onClose={() => setShowGaslessModal(false)} />}
      {showWithdrawModal && <WithdrawToBankModal onClose={() => setShowWithdrawModal(false)} />}
    </div>
  );
}
