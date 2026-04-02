"use client";

import { formatAmount, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";

interface Payment {
  payrollId: bigint;
  cycleNumber: bigint;
  recipient: string;
  amount: bigint;
  timestamp: bigint;
  hspRequestId: string;
}

interface PaymentHistoryProps {
  payments: Payment[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-8 h-8 text-[#525E75] mx-auto mb-3" />
        <p className="text-[#8B95A9]">No payments yet</p>
        <p className="text-xs text-[#525E75] mt-1">Payments will appear here after cycles are executed</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1A2340] text-[#525E75]">
            <th className="text-left py-3.5 px-5 text-xs font-medium uppercase tracking-wider">Date</th>
            <th className="text-left py-3.5 px-5 text-xs font-medium uppercase tracking-wider">Amount</th>
            <th className="text-left py-3.5 px-5 text-xs font-medium uppercase tracking-wider">Cycle</th>
            <th className="text-left py-3.5 px-5 text-xs font-medium uppercase tracking-wider">HSP Receipt</th>
            <th className="text-left py-3.5 px-5 text-xs font-medium uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, i) => (
            <tr
              key={i}
              className="border-b border-[#1A2340]/50 hover:bg-[#0F1629]/50 transition-colors"
            >
              <td className="py-3.5 px-5 text-[#8B95A9]">{formatDate(Number(payment.timestamp))}</td>
              <td className="py-3.5 px-5 font-semibold">{formatAmount(payment.amount)} USDT</td>
              <td className="py-3.5 px-5 text-[#8B95A9]">#{payment.cycleNumber.toString()}</td>
              <td className="py-3.5 px-5">
                <span className="text-[#8B5CF6] text-xs font-mono bg-[#8B5CF6]/10 px-2 py-1 rounded-md">
                  {payment.hspRequestId.slice(0, 10)}...
                </span>
              </td>
              <td className="py-3.5 px-5">
                <span className="text-xs px-2.5 py-1 bg-[#10B981]/15 text-[#34D399] rounded-full border border-[#10B981]/20 font-medium">
                  Settled
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
