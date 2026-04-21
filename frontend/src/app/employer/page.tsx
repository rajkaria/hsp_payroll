"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/connect-button";
import { PayrollCard } from "@/components/payroll-card";
import { usePayrollCount } from "@/hooks/usePayrolls";
import { motion } from "framer-motion";
import { Plus, Wallet, ArrowLeft, BarChart3, Building2, History } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function EmployerDashboard() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { data: payrollCount } = usePayrollCount();

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
          <p className="text-[#8B95A9] mb-6">Connect your wallet to manage payrolls</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  const count = payrollCount ? Number(payrollCount) : 0;
  const payrollIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

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
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Employer <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-[#8B95A9] mt-1.5 text-sm">Manage your on-chain payrolls</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => router.push("/employer/profile")}
              className="p-2.5 glass rounded-xl hover:border-[#8B5CF6]/30 transition-all"
              title="Business Profile"
            >
              <Building2 className="w-4 h-4 text-[#9BA3B7]" />
            </button>
            <button
              onClick={() => router.push("/employer/analytics")}
              className="p-2.5 glass rounded-xl hover:border-[#8B5CF6]/30 transition-all"
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4 text-[#9BA3B7]" />
            </button>
            <button
              onClick={() => router.push("/employer/history")}
              className="p-2.5 glass rounded-xl hover:border-[#8B5CF6]/30 transition-all"
              title="Transaction History"
            >
              <History className="w-4 h-4 text-[#9BA3B7]" />
            </button>
            <button
              onClick={() => router.push("/employer/create")}
              className="group px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Payroll</span>
              <span className="sm:hidden">Create</span>
            </button>
            <ConnectButton />
          </div>
        </motion.div>

        {count === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#C084FC]/10 flex items-center justify-center mx-auto mb-5">
              <Wallet className="w-8 h-8 text-[#8B5CF6]" />
            </div>
            <div className="text-[#8B95A9] text-lg mb-2">No payrolls yet</div>
            <p className="text-sm text-[#525E75] mb-6 max-w-sm mx-auto">
              Create your first payroll to start paying your team on-chain with HSP settlement receipts.
            </p>
            <button
              onClick={() => router.push("/employer/create")}
              className="group px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              Create Your First Payroll
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            className="grid gap-5"
          >
            {payrollIds.map((id, i) => (
              <motion.div key={id.toString()} custom={i} variants={fadeUp}>
                <PayrollCard payrollId={id} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
