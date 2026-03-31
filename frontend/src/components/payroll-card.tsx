"use client";

import { usePayrollDetails, useEscrowBalance, useRunway } from "@/hooks/usePayrolls";
import { useExecuteCycle } from "@/hooks/useExecuteCycle";
import { formatAmount, frequencyToLabel, formatDate } from "@/lib/utils";

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
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-[#1F2937] rounded w-1/3 mb-4" />
        <div className="h-4 bg-[#1F2937] rounded w-2/3" />
      </div>
    );
  }

  const [owner, token, name, recipients, amounts, frequency, startTime, lastExecuted, cycleCount, totalDeposited, totalPaid, active] = details;

  const totalPerCycle = amounts.reduce((a: bigint, b: bigint) => a + b, 0n);
  const nextCycleTime = lastExecuted > 0n
    ? Number(lastExecuted + frequency)
    : Number(startTime);

  const canExecute = active && Date.now() / 1000 >= nextCycleTime;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
            {name}
          </h3>
          <span className={`text-xs px-2 py-1 rounded ${active ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#EF4444]/20 text-[#EF4444]"}`}>
            {active ? "Active" : "Cancelled"}
          </span>
        </div>
        <div className="text-right text-sm text-[#9CA3AF]">
          {frequencyToLabel(Number(frequency))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-[#9CA3AF]">Recipients</div>
          <div className="font-medium">{recipients.length}</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Per Cycle</div>
          <div className="font-medium">{formatAmount(totalPerCycle)} USDT</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Escrow Balance</div>
          <div className="font-medium">{escrow !== undefined ? formatAmount(escrow) : "..."} USDT</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Runway</div>
          <div className="font-medium">{runway?.toString() ?? "..."} cycles</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Cycles Completed</div>
          <div className="font-medium">{cycleCount.toString()}</div>
        </div>
        <div>
          <div className="text-[#9CA3AF]">Total Paid</div>
          <div className="font-medium">{formatAmount(totalPaid)} USDT</div>
        </div>
      </div>

      {active && (
        <div className="flex gap-2">
          <button
            onClick={() => execute(payrollId)}
            disabled={!canExecute || isPending || isConfirming}
            className="flex-1 px-4 py-2 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Confirming..." : isConfirming ? "Executing..." : isSuccess ? "Executed!" : "Execute Cycle"}
          </button>
        </div>
      )}

      {lastExecuted > 0n && (
        <div className="mt-3 text-xs text-[#9CA3AF]">
          Last executed: {formatDate(Number(lastExecuted))}
        </div>
      )}
    </div>
  );
}
