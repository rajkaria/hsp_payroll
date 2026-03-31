"use client";

import { formatAmount, formatDate } from "@/lib/utils";

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
      <div className="text-center py-12 text-[#9CA3AF]">
        No payments yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
            <th className="text-left py-3 px-4">Date</th>
            <th className="text-left py-3 px-4">Amount</th>
            <th className="text-left py-3 px-4">Cycle</th>
            <th className="text-left py-3 px-4">HSP Receipt</th>
            <th className="text-left py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, i) => (
            <tr key={i} className="border-b border-[#1F2937] hover:bg-[#111827]/50">
              <td className="py-3 px-4">{formatDate(Number(payment.timestamp))}</td>
              <td className="py-3 px-4 font-medium">{formatAmount(payment.amount)} USDT</td>
              <td className="py-3 px-4">#{payment.cycleNumber.toString()}</td>
              <td className="py-3 px-4">
                <span className="text-[#1E5EFF] text-xs font-mono">
                  {payment.hspRequestId.slice(0, 10)}...
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-xs px-2 py-1 bg-[#10B981]/20 text-[#10B981] rounded">
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
