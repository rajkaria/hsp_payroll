"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/connect-button";
import { PaymentHistory } from "@/components/payment-history";
import { CSVExport } from "@/components/csv-export";
import { useRecipientPayrolls } from "@/hooks/usePayrolls";

export default function EmployeeDashboard() {
  const { address, isConnected } = useAccount();
  const { data: payrollIds } = useRecipientPayrolls(address as `0x${string}` | undefined);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-[#9CA3AF]">Connect your wallet to view your payments</p>
        <ConnectButton />
      </div>
    );
  }

  const hasPayrolls = payrollIds && payrollIds.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
            My Payments
          </h1>
          <p className="text-[#9CA3AF] mt-1">View your payment history and receipts</p>
        </div>
        <ConnectButton />
      </div>

      {!hasPayrolls ? (
        <div className="text-center py-20">
          <div className="text-[#9CA3AF] text-lg mb-2">No payments found</div>
          <div className="text-[#9CA3AF] text-sm">
            Your wallet address is not a recipient of any active payroll
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Payment History</h2>
            <CSVExport receipts={[]} />
          </div>

          <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
            <PaymentHistory payments={[]} />
          </div>

          <div className="text-xs text-[#9CA3AF] text-center">
            All payments settled via HashKey Settlement Protocol on HashKey Chain
          </div>
        </div>
      )}
    </div>
  );
}
