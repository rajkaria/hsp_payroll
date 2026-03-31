"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/connect-button";
import { PayrollCard } from "@/components/payroll-card";
import { usePayrollCount } from "@/hooks/usePayrolls";

export default function EmployerDashboard() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { data: payrollCount } = usePayrollCount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-[#9CA3AF]">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  const count = payrollCount ? Number(payrollCount) : 0;
  const payrollIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Employer Dashboard
          </h1>
          <p className="text-[#9CA3AF] mt-1">Manage your on-chain payrolls</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => router.push("/employer/create")}
            className="px-4 py-2 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition"
          >
            + Create Payroll
          </button>
          <ConnectButton />
        </div>
      </div>

      {count === 0 ? (
        <div className="text-center py-20">
          <div className="text-[#9CA3AF] text-lg mb-4">No payrolls yet</div>
          <button
            onClick={() => router.push("/employer/create")}
            className="px-6 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition"
          >
            Create Your First Payroll
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {payrollIds.map((id) => (
            <PayrollCard key={id.toString()} payrollId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
