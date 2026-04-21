"use client";

import { useEffect, useMemo, useState } from "react";
import { usePayrollDetails, useReceipts } from "@/hooks/usePayrolls";
import { CSVExport } from "./csv-export";
import { FiatValueBadge } from "./fiat-value-badge";
import { formatAmount, formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";

type Receipt = {
  payrollId: bigint;
  cycleNumber: bigint;
  recipient: string;
  amount: bigint;
  timestamp: bigint;
  hspRequestId: string;
};

type Payment = Receipt & { payrollName: string };

function useCyclePayments(payrollId: bigint, cycleNumber: bigint, address: string): Receipt[] {
  const { data } = useReceipts(payrollId, cycleNumber);
  return useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const addr = address.toLowerCase();
    return (data as readonly Receipt[])
      .filter((r) => typeof r?.recipient === "string" && r.recipient.toLowerCase() === addr)
      .map((r) => ({
        payrollId: r.payrollId,
        cycleNumber: r.cycleNumber,
        recipient: r.recipient,
        amount: r.amount,
        timestamp: r.timestamp,
        hspRequestId: r.hspRequestId,
      }));
  }, [data, address]);
}

function PayrollRowsCollector({
  payrollId,
  address,
  publish,
}: {
  payrollId: bigint;
  address: string;
  publish: (id: string, name: string, payments: Receipt[]) => void;
}) {
  const { data: details } = usePayrollDetails(payrollId);
  const cycleCount = details ? Math.min(Number(details[8]), 10) : 0;
  const name = details ? (details[2] as string) : `Payroll #${payrollId.toString()}`;

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

  const payments = useMemo(() => {
    const cycles = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10];
    return cycles.slice(0, cycleCount).flat();
  }, [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, cycleCount]);

  const key = payments.map((p) => `${p.cycleNumber}:${p.hspRequestId}`).join("|");
  useEffect(() => {
    publish(payrollId.toString(), name, payments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name]);

  return null;
}

export function EmployeePayments({ payrollIds, address }: { payrollIds: bigint[]; address: string }) {
  const [byPayroll, setByPayroll] = useState<Record<string, { name: string; payments: Receipt[] }>>({});

  const publish = (id: string, name: string, payments: Receipt[]) => {
    setByPayroll((prev) => {
      const existing = prev[id];
      if (existing && existing.name === name && existing.payments.length === payments.length) {
        const sameKeys = existing.payments.every(
          (p, i) => p.hspRequestId === payments[i].hspRequestId && p.cycleNumber === payments[i].cycleNumber
        );
        if (sameKeys) return prev;
      }
      return { ...prev, [id]: { name, payments } };
    });
  };

  const merged: Payment[] = useMemo(() => {
    const out: Payment[] = [];
    for (const id of Object.keys(byPayroll)) {
      const { name, payments } = byPayroll[id];
      for (const p of payments) out.push({ ...p, payrollName: name });
    }
    out.sort((a, b) => Number(b.timestamp - a.timestamp));
    return out;
  }, [byPayroll]);

  return (
    <>
      {payrollIds.map((id) => (
        <PayrollRowsCollector key={id.toString()} payrollId={id} address={address} publish={publish} />
      ))}
      <PaymentsTable payments={merged} />
    </>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="glass rounded-2xl p-16 text-center border border-white/5">
        <FileText className="w-8 h-8 text-[#5A6178] mx-auto mb-3" />
        <p className="text-[#9BA3B7] text-sm">No payments yet</p>
        <p className="text-xs text-[#5A6178] mt-1">
          Payments will appear here after your employer executes a cycle
        </p>
      </div>
    );
  }

  const totalUsd = payments.reduce(
    (a, p) => a + Number(formatAmount(p.amount).replace(/,/g, "")),
    0
  );

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/5">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="text-xs text-[#9BA3B7]">
          <span className="text-white font-semibold">{payments.length}</span> payment{payments.length === 1 ? "" : "s"}
          <span className="mx-2 text-[#5A6178]">·</span>
          <span className="text-white font-semibold">${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> total
        </div>
        <CSVExport
          receipts={payments.map((p) => ({
            date: formatDate(Number(p.timestamp)),
            amount: formatAmount(p.amount),
            token: "USDT",
            payrollName: p.payrollName,
            cycle: Number(p.cycleNumber),
            txHash: p.hspRequestId,
          }))}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#5A6178] border-b border-white/5">
              <th className="text-left py-3 px-5 text-[10px] font-medium uppercase tracking-widest">Date</th>
              <th className="text-left py-3 px-5 text-[10px] font-medium uppercase tracking-widest">Payroll</th>
              <th className="text-left py-3 px-5 text-[10px] font-medium uppercase tracking-widest">Cycle</th>
              <th className="text-right py-3 px-5 text-[10px] font-medium uppercase tracking-widest">Amount</th>
              <th className="text-left py-3 px-5 text-[10px] font-medium uppercase tracking-widest">Receipt</th>
              <th className="text-right py-3 px-5 text-[10px] font-medium uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr
                key={`${p.payrollId.toString()}-${p.cycleNumber.toString()}-${i}`}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-3.5 px-5 text-[#9BA3B7] whitespace-nowrap">{formatDate(Number(p.timestamp))}</td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6] flex-shrink-0" />
                    <span className="text-white truncate max-w-[180px]" title={p.payrollName}>{p.payrollName}</span>
                    <span className="text-[10px] text-[#5A6178]">#{p.payrollId.toString()}</span>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-[#9BA3B7]">#{p.cycleNumber.toString()}</td>
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  <span className="font-semibold">{formatAmount(p.amount)} USDT</span>
                  <FiatValueBadge amount={p.amount} className="ml-1.5" />
                </td>
                <td className="py-3.5 px-5">
                  <span className="text-[#C084FC] text-[11px] font-mono bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-2 py-1 rounded-md">
                    {p.hspRequestId.slice(0, 10)}…
                  </span>
                </td>
                <td className="py-3.5 px-5 text-right">
                  <span className="inline-block text-[10px] px-2.5 py-1 bg-[#10B981]/15 text-[#34D399] rounded-full border border-[#10B981]/20 font-medium">
                    Settled
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
