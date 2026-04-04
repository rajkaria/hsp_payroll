"use client";

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

function PayrollCycleReceipts({ payrollId, cycleNumber, onPayments }: {
  payrollId: bigint;
  cycleNumber: bigint;
  onPayments: (payments: Payment[]) => void;
}) {
  const { data } = useReceipts(payrollId, cycleNumber);

  if (data && Array.isArray(data) && data.length > 0) {
    const payments: Payment[] = data.map((r: readonly [bigint, bigint, string, bigint, bigint, string]) => ({
      payrollId: r[0],
      cycleNumber: r[1],
      recipient: r[2],
      amount: r[3],
      timestamp: r[4],
      hspRequestId: r[5],
    }));
    // Use a ref-safe callback pattern
    if (payments.length > 0) {
      setTimeout(() => onPayments(payments), 0);
    }
  }

  return null;
}

function SinglePayrollPayments({ payrollId, address }: { payrollId: bigint; address: string }) {
  const { data: details } = usePayrollDetails(payrollId);
  const cycleCount = details ? Number(details[8]) : 0; // cycleCount is index 8

  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const seenRef = useRef(new Set<string>());

  const handlePayments = (payments: Payment[]) => {
    const newPayments = payments.filter((p) => {
      const key = `${p.payrollId}-${p.cycleNumber}-${p.recipient}`;
      if (seenRef.current.has(key)) return false;
      seenRef.current.add(key);
      return true;
    });
    if (newPayments.length > 0) {
      setAllPayments((prev) => [...prev, ...newPayments]);
    }
  };

  // Only show payments where user is recipient
  const myPayments = allPayments.filter(
    (p) => p.recipient.toLowerCase() === address.toLowerCase()
  );

  return (
    <>
      {Array.from({ length: cycleCount }, (_, i) => (
        <PayrollCycleReceipts
          key={`${payrollId}-${i + 1}`}
          payrollId={payrollId}
          cycleNumber={BigInt(i + 1)}
          onPayments={handlePayments}
        />
      ))}
      {myPayments.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
              Payment History
            </h2>
            <CSVExport receipts={myPayments.map((p) => ({
              date: formatDate(Number(p.timestamp)),
              amount: formatAmount(p.amount),
              token: "USDT",
              payrollName: `Payroll #${p.payrollId.toString()}`,
              cycle: Number(p.cycleNumber),
              txHash: p.hspRequestId,
            }))} />
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <PaymentHistory payments={myPayments} />
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useRef } from "react";

export function EmployeePayments({ payrollIds, address }: { payrollIds: bigint[]; address: string }) {
  return (
    <div className="space-y-6">
      {payrollIds.map((id) => (
        <SinglePayrollPayments key={id.toString()} payrollId={id} address={address} />
      ))}
    </div>
  );
}
