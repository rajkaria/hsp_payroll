"use client";

import { ConnectButton } from "@/components/connect-button";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-2xl">
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-bold mb-4">
          HSP <span className="text-[#1E5EFF]">Payroll</span>
        </h1>
        <p className="text-[#9CA3AF] text-lg mb-2">
          On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers
        </p>
        <p className="text-[#9CA3AF] text-sm mb-8">
          Powered by HashKey Settlement Protocol on HashKey Chain
        </p>

        <div className="flex justify-center mb-8">
          <ConnectButton />
        </div>

        {isConnected && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/employer")}
              className="px-6 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition"
            >
              Employer Dashboard
            </button>
            <button
              onClick={() => router.push("/employee")}
              className="px-6 py-3 bg-[#111827] text-white rounded-lg font-medium border border-[#1F2937] hover:bg-[#1F2937] transition"
            >
              Employee Dashboard
            </button>
          </div>
        )}

        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-[#1E5EFF]">HSP</div>
            <div className="text-sm text-[#9CA3AF]">Settlement Protocol</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#10B981]">On-Chain</div>
            <div className="text-sm text-[#9CA3AF]">Receipts & Audit Trail</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F59E0B]">Automated</div>
            <div className="text-sm text-[#9CA3AF]">Recurring Payments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
