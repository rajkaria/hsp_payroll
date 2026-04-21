"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { useApproveToken, useFundPayroll } from "@/hooks/useFundPayroll";
import { useContracts } from "@/hooks/useContracts";
import { MOCK_ERC20_ABI } from "@/config/contracts";

interface Props {
  payrollId: bigint;
  token: `0x${string}`;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFunded?: () => void;
}

export function FundPayrollInline({ payrollId, token, open, onOpenChange, onFunded }: Props) {
  const contracts = useContracts();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<"idle" | "approving" | "funding">("idle");

  const { approve, hash: approveHash, isPending: approvePending, isConfirming: approveConfirming, isSuccess: approveSuccess, error: approveError } = useApproveToken();
  const { fund, hash: fundHash, isPending: fundPending, isConfirming: fundConfirming, isSuccess: fundSuccess, error: fundError } = useFundPayroll();

  useEffect(() => {
    if (approveError) {
      toast.error("Approve failed", { description: approveError.message.slice(0, 160) });
      setPhase("idle");
    }
  }, [approveError]);

  useEffect(() => {
    if (fundError) {
      toast.error("Fund failed", { description: fundError.message.slice(0, 160) });
      setPhase("idle");
    }
  }, [fundError]);

  useEffect(() => {
    if (approveSuccess && phase === "approving" && amount) {
      setPhase("funding");
      fund(payrollId, parseUnits(amount, 6));
    }
  }, [approveSuccess, phase, amount, fund, payrollId]);

  useEffect(() => {
    if (fundSuccess && phase === "funding") {
      toast.success("Escrow funded", { description: `+${amount} USDT added to payroll #${payrollId.toString()}` });
      setPhase("idle");
      setAmount("");
      onOpenChange(false);
      onFunded?.();
    }
  }, [fundSuccess, phase, amount, payrollId, onOpenChange, onFunded]);

  const busy =
    phase !== "idle" || approvePending || approveConfirming || fundPending || fundConfirming;

  const submit = async () => {
    if (!address || !publicClient) {
      toast.error("Wallet not ready");
      return;
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const amt = parseUnits(amount, 6);

    try {
      const allowance = (await publicClient.readContract({
        address: token,
        abi: MOCK_ERC20_ABI,
        functionName: "allowance",
        args: [address, contracts.PAYROLL_FACTORY as `0x${string}`],
      })) as bigint;

      if (allowance >= amt) {
        setPhase("funding");
        fund(payrollId, amt);
      } else {
        setPhase("approving");
        approve(token, amt);
      }
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      toast.error("Check failed", { description: (err.shortMessage || err.message || "").slice(0, 160) });
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        className="w-full px-4 py-2.5 glass rounded-xl font-medium hover:border-[#8B5CF6]/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm text-[#9BA3B7] hover:text-white"
      >
        <Plus className="w-4 h-4 text-[#10B981]" />
        Fund More
      </button>
    );
  }

  return (
    <div className="glass rounded-xl p-3 border border-[#10B981]/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-[#9BA3B7] flex-1">Deposit USDT into escrow</span>
        <button
          onClick={() => {
            onOpenChange(false);
            setAmount("");
          }}
          className="text-[#5A6178] hover:text-white transition-colors"
          disabled={busy}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="e.g. 10000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
          className="flex-1 bg-[#0A0B14]/60 border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#8B5CF6]/40 disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={busy || !amount}
          className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 min-w-[110px] justify-center"
        >
          {busy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {phase === "approving" ? "Approve…" : phase === "funding" ? "Fund…" : "…"}
            </>
          ) : (
            "Fund"
          )}
        </button>
      </div>
      {(approveHash || fundHash) && (
        <div className="mt-1.5 text-[10px] text-[#5A6178]">
          {phase === "approving" ? "Step 1/2: approving…" : "Step 2/2: depositing…"}
        </div>
      )}
    </div>
  );
}
