"use client";

import { usePayrollDetails, useEscrowBalance, useRunway } from "@/hooks/usePayrolls";
import { useExecuteCycle } from "@/hooks/useExecuteCycle";
import { formatAmount, frequencyToLabel, formatDate } from "@/lib/utils";
import { Users, Clock, Wallet, BarChart3, CheckCircle2, DollarSign, Zap } from "lucide-react";
import { FiatValueBadge } from "./fiat-value-badge";
import { GenerateReportButton } from "./generate-report-button";

interface PayrollCardProps {
  payrollId: bigint;
}

export function PayrollCard({ payrollId }: PayrollCardProps) {
  const { data: details, isLoading } = usePayrollDetails(payrollId);
  const { data: escrow } = useEscrowBalance(payrollId);
  const { data: runway } = useRunway(payrollId);
  const { execute, isPending, isConfirming, isSuccess } = useExecuteCycle();

  if (isLoading || !details) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="h-6 w-40 shimmer rounded-lg mb-3" />
            <div className="h-5 w-16 shimmer rounded-full" />
          </div>
          <div className="h-5 w-20 shimmer rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-16 shimmer rounded mb-2" />
              <div className="h-5 w-24 shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const [owner, token, name, recipients, amounts, frequency, startTime, lastExecuted, cycleCount, totalDeposited, totalPaid, active] = details;

  const totalPerCycle = amounts.reduce((a: bigint, b: bigint) => a + b, 0n);
  const nextCycleTime = lastExecuted > 0n
    ? Number(lastExecuted + frequency)
    : Number(startTime);

  const canExecute = active && Date.now() / 1000 >= nextCycleTime;

  const stats = [
    { icon: Users, label: "Recipients", value: recipients.length.toString(), color: "#1E5EFF" },
    { icon: DollarSign, label: "Per Cycle", value: `${formatAmount(totalPerCycle)} USDT`, color: "#8B5CF6", fiatAmount: totalPerCycle },
    { icon: Wallet, label: "Escrow", value: `${escrow !== undefined ? formatAmount(escrow) : "..."} USDT`, color: "#10B981", fiatAmount: escrow },
    { icon: BarChart3, label: "Runway", value: `${runway?.toString() ?? "..."} cycles`, color: "#06B6D4" },
    { icon: CheckCircle2, label: "Completed", value: cycleCount.toString(), color: "#F59E0B" },
    { icon: Clock, label: "Total Paid", value: `${formatAmount(totalPaid)} USDT`, color: "#EF4444", fiatAmount: totalPaid },
  ];

  return (
    <div className="glass rounded-2xl p-6 card-hover">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)] mb-2">
            {name}
          </h3>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              active
                ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20"
                : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20"
            }`}
          >
            {active ? "Active" : "Cancelled"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GenerateReportButton
            payrollName={name}
            cycleCount={Number(cycleCount)}
            frequency={frequencyToLabel(Number(frequency))}
            recipients={recipients.map((r: string, idx: number) => ({
              address: r,
              amount: formatAmount(amounts[idx]),
            }))}
            totalAmount={formatAmount(totalPerCycle)}
          />
          <div className="text-sm text-[#8B95A9] glass px-3 py-1.5 rounded-lg">
            {frequencyToLabel(Number(frequency))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0A0E1A]/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <span className="text-xs text-[#525E75]">{stat.label}</span>
            </div>
            <div className="font-semibold text-sm">{stat.value}</div>
            {"fiatAmount" in stat && stat.fiatAmount !== undefined && (
              <FiatValueBadge amount={stat.fiatAmount as bigint} />
            )}
          </div>
        ))}
      </div>

      {active && (
        <button
          onClick={() => execute(payrollId)}
          disabled={!canExecute || isPending || isConfirming}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-[#1E5EFF] to-[#4B7FFF] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(30,94,255,0.25)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm"
        >
          <Zap className="w-4 h-4" />
          {isPending ? "Confirming..." : isConfirming ? "Executing..." : isSuccess ? "Executed!" : "Execute Cycle"}
        </button>
      )}

      {lastExecuted > 0n && (
        <div className="mt-3 text-xs text-[#525E75] text-center">
          Last executed: {formatDate(Number(lastExecuted))}
        </div>
      )}
    </div>
  );
}
