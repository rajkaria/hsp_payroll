"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/connect-button";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet } from "lucide-react";

export default function ProfilePage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-10 text-center relative">
          <Wallet className="w-10 h-10 text-[#1E5EFF] mx-auto mb-4" />
          <p className="text-[#8B95A9] mb-6">Connect your wallet to manage your profile</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#1E5EFF]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 py-8 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <button onClick={() => router.push("/employer")} className="flex items-center gap-1.5 text-sm text-[#525E75] hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Business <span className="gradient-text">Profile</span>
          </h1>
          <p className="text-[#8B95A9] mt-1.5 text-sm">Your company details for compliance reports</p>
        </motion.div>
        <BusinessProfileForm />
      </div>
    </div>
  );
}
