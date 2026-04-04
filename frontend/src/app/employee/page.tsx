"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { EmployeePayments } from "@/components/employee-payments";
import { useRecipientPayrolls } from "@/hooks/usePayrolls";
import { motion } from "framer-motion";
import { Wallet, FileText, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EmployeeDashboard() {
  const { address, isConnected } = useAccount();
  const { data: payrollIds } = useRecipientPayrolls(address as `0x${string}` | undefined);
  const router = useRouter();

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
          <p className="text-[#9BA3B7] mb-6">Connect your wallet to view your payments</p>
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
              className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
              My <span className="gradient-text">Payments</span>
            </h1>
            <p className="text-[#9BA3B7] mt-1.5 text-sm">View your payment history and HSP receipts</p>
          </div>
          <ConnectButton />
        </motion.div>

        {!hasPayrolls ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#C084FC]/10 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-8 h-8 text-[#8B5CF6]" />
            </div>
            <div className="text-[#9BA3B7] text-lg mb-2">No payments found</div>
            <p className="text-sm text-[#5A6178] max-w-sm mx-auto">
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
            <EmployeePayments payrollIds={payrollIds.map((id) => BigInt(id.toString()))} address={address!} />

            <div className="text-xs text-[#5A6178] text-center">
              All payments settled via HashKey Settlement Protocol on HashKey Chain
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
