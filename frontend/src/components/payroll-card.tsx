"use client";

import { useState, useEffect } from "react";
import { usePayrollDetails, useEscrowBalance, useRunway } from "@/hooks/usePayrolls";
import { useExecuteCycle } from "@/hooks/useExecuteCycle";
import { useAttestCycle } from "@/hooks/useAttestation";
import { formatAmount, frequencyToLabel, formatDate } from "@/lib/utils";
import { Users, Clock, Wallet, BarChart3, CheckCircle2, DollarSign, Zap, ExternalLink, Shield, Loader2, Timer } from "lucide-react";
import { FiatValueBadge } from "./fiat-value-badge";
import { GenerateReportButton } from "./generate-report-button";
import { HSPPaymentButton } from "./hsp-payment-button";
import { getExplorerTxUrl } from "@/config/wagmi";
import { useAccount } from "wagmi";
import { toast } from "sonner";

interface PayrollCardProps {
  payrollId: bigint;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Ready";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PayrollCard({ payrollId }: PayrollCardProps) {
  const { data: details, isLoading } = usePayrollDetails(payrollId);
  const { data: escrow } = useEscrowBalance(payrollId);
  const { data: runway } = useRunway(payrollId);
  const { execute, hash, isPending, isConfirming, isSuccess, error: executeError } = useExecuteCycle();
  const { attest, hash: attestHash, isPending: attestPending, isConfirming: attestConfirming, isSuccess: attestSuccess, error: attestError } = useAttestCycle();
  const { chain, address } = useAccount();
  const [now, setNow] = useState(Date.now() / 1000);

  // Update countdown every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 30000);
    return () => clearInterval(timer);
  }, []);

  // Error toasts
  useEffect(() => {
    if (executeError) {
      toast.error("Transaction failed", {
        description: executeError.message.slice(0, 120),
      });
    }
  }, [executeError]);

  useEffect(() => {
    if (attestError) {
      toast.error("Attestation failed", {
        description: attestError.message.slice(0, 120),
      });
    }
  }, [attestError]);

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

  const canExecute = active && now >= nextCycleTime;
  const secondsUntilNext = nextCycleTime - now;

  const stats = [
    { icon: Users, label: "Recipients", value: recipients.length.toString(), color: "#8B5CF6" },
    { icon: DollarSign, label: "Per Cycle", value: `${formatAmount(totalPerCycle)} USDT`, color: "#8B5CF6", fiatAmount: totalPerCycle },
    { icon: Wallet, label: "Escrow", value: `${escrow !== undefined ? formatAmount(escrow) : "..."} USDT`, color: "#10B981", fiatAmount: escrow },
    { icon: BarChart3, label: "Runway", value: `${runway?.toString() ?? "..."} cycles`, color: "#06B6D4" },
    { icon: CheckCircle2, label: "Completed", value: cycleCount.toString(), color: "#F59E0B" },
    { icon: Clock, label: "Total Paid", value: `${formatAmount(totalPaid)} USDT`, color: "#EF4444", fiatAmount: totalPaid },
  ];

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 card-hover">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)] mb-2">
            {name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                active
                  ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20"
                  : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20"
              }`}
            >
              {active ? "Active" : "Cancelled"}
            </span>
            {/* Next cycle countdown */}
            {active && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                canExecute
                  ? "bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/15"
                  : "bg-[#8B5CF6]/10 text-[#C084FC] border border-[#8B5CF6]/15"
              }`}>
                <Timer className="w-3 h-3" />
                {canExecute ? "Cycle ready" : `Next: ${formatCountdown(secondsUntilNext)}`}
              </span>
            )}
          </div>
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
          <div className="text-sm text-[#9BA3B7] glass px-3 py-1.5 rounded-lg">
            {frequencyToLabel(Number(frequency))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0A0B14]/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <span className="text-xs text-[#5A6178]">{stat.label}</span>
            </div>
            <div className="font-semibold text-sm">{stat.value}</div>
            {"fiatAmount" in stat && stat.fiatAmount !== undefined && (
              <FiatValueBadge amount={stat.fiatAmount as bigint} />
            )}
          </div>
        ))}
      </div>

      {/* Execute Cycle */}
      {active && (
        <button
          onClick={() => execute(payrollId)}
          disabled={!canExecute || isPending || isConfirming}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm"
        >
          <Zap className="w-4 h-4" />
          {isPending ? "Confirming..." : isConfirming ? "Executing..." : isSuccess ? "Executed!" : "Execute Cycle"}
        </button>
      )}

      {/* Tx hash + explorer link */}
      {isSuccess && hash && (
        <a
          href={getExplorerTxUrl(hash, chain?.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#8B5CF6] hover:text-[#C084FC] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View on Explorer
        </a>
      )}

      {/* EAS Attestation — persistent: shows for ANY payroll with completed cycles */}
      {cycleCount > 0n && active && address && (
        <div className="mt-3">
          <button
            onClick={() => attest(payrollId, cycleCount, address as `0x${string}`, token as `0x${string}`, "USDT")}
            disabled={attestPending || attestConfirming || attestSuccess}
            className="w-full px-4 py-2.5 glass rounded-xl font-medium hover:border-[#8B5CF6]/30 transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2 text-sm text-[#9BA3B7] hover:text-white"
          >
            {attestPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Confirm attestation...</>
            ) : attestConfirming ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating attestations...</>
            ) : attestSuccess ? (
              <><CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Attested on-chain</>
            ) : (
              <><Shield className="w-4 h-4 text-[#06B6D4]" /> Create EAS Attestations</>
            )}
          </button>
          {attestSuccess && attestHash && (
            <a
              href={getExplorerTxUrl(attestHash, chain?.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#06B6D4] hover:text-[#22D3EE] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View attestations on Explorer
            </a>
          )}
        </div>
      )}

      {/* HSP Payment option */}
      {active && (
        <div className="mt-3">
          <HSPPaymentButton
            payrollId={payrollId}
            cycleNumber={Number(cycleCount) + 1}
            totalAmount={formatAmount(totalPerCycle)}
            recipientCount={recipients.length}
          />
        </div>
      )}

      {lastExecuted > 0n && !isSuccess && (
        <div className="mt-3 text-xs text-[#5A6178] text-center">
          Last executed: {formatDate(Number(lastExecuted))}
        </div>
      )}
    </div>
  );
}
