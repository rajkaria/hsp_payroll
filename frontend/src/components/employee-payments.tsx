"use client";

import { useMemo } from "react";
import { usePayrollDetails, useReceipts } from "@/hooks/usePayrolls";
import { PaymentHistory } from "./payment-history";
import { CSVExport } from "./csv-export";
import { formatAmount, formatDate } from "@/lib/utils";

interface Payment {
  payrollId: bigint;
  cycleNumber: bigint;
  recipient: string;
  amount: bigint;
  timestamp: bigint;
  hspRequestId: string;
}

// Fetches receipts for a single cycle and filters to the target address
function useCyclePayments(payrollId: bigint, cycleNumber: bigint, address: string) {
  const { data } = useReceipts(payrollId, cycleNumber);

  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return (data as readonly (readonly [bigint, bigint, string, bigint, bigint, string])[])
      .filter((r) => r[2].toLowerCase() === address.toLowerCase())
      .map((r) => ({
        payrollId: r[0],
        cycleNumber: r[1],
        recipient: r[2],
        amount: r[3],
        timestamp: r[4],
        hspRequestId: r[5],
      }));
  }, [data, address]);
}

// Component for a single payroll — fetches details and all cycle receipts
// Note: hooks can't be called in loops, so we support up to 10 cycles max
function SinglePayrollPayments({ payrollId, address }: { payrollId: bigint; address: string }) {
  const { data: details } = usePayrollDetails(payrollId);
  const cycleCount = details ? Math.min(Number(details[8]), 10) : 0;

  // Call hooks unconditionally for up to 10 cycles (React rules of hooks)
  const c1 = useCyclePayments(payrollId, 1n, address);
  const c2 = useCyclePayments(payrollId, 2n, address);
  const c3 = useCyclePayments(payrollId, 3n, address);
  const c4 = useCyclePayments(payrollId, 4n, address);
  const c5 = useCyclePayments(payrollId, 5n, address);
  const c6 = useCyclePayments(payrollId, 6n, address);
  const c7 = useCyclePayments(payrollId, 7n, address);
  const c8 = useCyclePayments(payrollId, 8n, address);
  const c9 = useCyclePayments(payrollId, 9n, address);
  const c10 = useCyclePayments(payrollId, 10n, address);

  const allPayments = useMemo(() => {
    const cycles = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10];
    return cycles.slice(0, cycleCount).flat();
  }, [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, cycleCount]);

  if (allPayments.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
          Payment History
        </h2>
        <CSVExport
          receipts={allPayments.map((p) => ({
            date: formatDate(Number(p.timestamp)),
            amount: formatAmount(p.amount),
            token: "USDT",
            payrollName: `Payroll #${p.payrollId.toString()}`,
            cycle: Number(p.cycleNumber),
            txHash: p.hspRequestId,
          }))}
        />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <PaymentHistory payments={allPayments} />
      </div>
    </div>
  );
}

export function EmployeePayments({ payrollIds, address }: { payrollIds: bigint[]; address: string }) {
  return (
    <div className="space-y-6">
      {payrollIds.map((id) => (
        <SinglePayrollPayments key={id.toString()} payrollId={id} address={address} />
      ))}
    </div>
  );
}
