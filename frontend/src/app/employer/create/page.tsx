"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { CreatePayrollForm } from "@/components/create-payroll-form";

export default function CreatePayrollPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-[#9CA3AF]">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)] mb-8">
        Create New Payroll
      </h1>
      <CreatePayrollForm />
    </div>
  );
}
