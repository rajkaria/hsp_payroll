"use client";

import { useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from "wagmi";
import { ADAPTIVE_CADENCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";
import { Zap, Package, Hand, Scissors, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const MODES = [
  { v: 0, name: "Batch", icon: Package, desc: "Full amount at execute" },
  { v: 1, name: "Stream", icon: Zap, desc: "Ticks per second" },
  { v: 2, name: "Pull", icon: Hand, desc: "Claim on demand" },
  { v: 3, name: "Hybrid", icon: Scissors, desc: "Part stream, part batch" },
];

export function CadenceSelector({
  payrollId,
  recipient,
}: {
  payrollId: bigint;
  recipient: `0x${string}`;
}) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const cadenceAddr = protocol.ADAPTIVE_CADENCE as `0x${string}` | undefined;

  const { data: state, refetch: refetchState } = useReadContract({
    address: cadenceAddr,
    abi: ADAPTIVE_CADENCE_ABI,
    functionName: "getCadenceState",
    args: [payrollId, recipient],
    query: { enabled: !!cadenceAddr, refetchInterval: 5000 },
  });

  const { data: accrued, refetch: refetchAccrued } = useReadContract({
    address: cadenceAddr,
    abi: ADAPTIVE_CADENCE_ABI,
    functionName: "accruedFor",
    args: [payrollId, recipient],
    query: { enabled: !!cadenceAddr, refetchInterval: 1500 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });
  const [localMode, setLocalMode] = useState<number>(0);

  useEffect(() => {
    if (state && typeof (state as { mode?: number }).mode !== "undefined") {
      setLocalMode(Number((state as { mode: number }).mode));
    }
  }, [state]);

  useEffect(() => {
    if (isSuccess) {
      refetchState();
      refetchAccrued();
      setTxHash(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  async function switchMode(mode: number) {
    if (!cadenceAddr) return;
    setLocalMode(mode);
    try {
      const hash = await writeContractAsync({
        address: cadenceAddr,
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "setRecipientCadence",
        args: [payrollId, mode],
      });
      setTxHash(hash);
      toast.success(`Switched to ${MODES[mode].name}`);
    } catch (e: unknown) {
      toast.error("Switch failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  async function claim() {
    if (!cadenceAddr) return;
    try {
      const hash = await writeContractAsync({
        address: cadenceAddr,
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "claim",
        args: [payrollId],
      });
      setTxHash(hash);
      toast.success("Claim submitted");
    } catch (e: unknown) {
      toast.error("Claim failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  if (!cadenceAddr) return null;

  const accruedUsd = accrued ? Number(formatUnits(accrued as bigint, 6)) : 0;
  const canSwitch = state ? (state as { recipientCanSwitch: boolean }).recipientCanSwitch : false;
  const configured = state ? (state as { configured: boolean }).configured : false;
  const busy = isPending || isConfirming;

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#8B5CF6]" />
          <h3 className="font-semibold text-sm">Payout Cadence · Payroll #{payrollId.toString()}</h3>
        </div>
        {accruedUsd > 0 && (
          <button
            onClick={claim}
            disabled={busy}
            className="px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white text-xs rounded-full font-medium disabled:opacity-40 flex items-center gap-1.5 hover:shadow-[0_0_18px_rgba(139,92,246,0.25)] transition"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Claim ${accruedUsd.toFixed(4)}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MODES.map((m) => {
          const active = localMode === m.v && configured;
          const disabled = !canSwitch || busy;
          return (
            <button
              key={m.v}
              onClick={() => canSwitch && !busy && switchMode(m.v)}
              disabled={disabled}
              className={`relative p-3 rounded-xl border text-xs flex flex-col items-center gap-1.5 transition ${
                active
                  ? "border-[#8B5CF6]/60 bg-[#8B5CF6]/10 shadow-[inset_0_0_20px_rgba(139,92,246,0.08)]"
                  : "border-white/10 bg-[#0A0B14]/50"
              } ${canSwitch && !busy ? "hover:border-[#8B5CF6]/40 cursor-pointer" : "cursor-not-allowed opacity-70"}`}
            >
              <m.icon className={`w-4 h-4 ${active ? "text-[#C084FC]" : "text-[#9BA3B7]"}`} />
              <span className={`font-medium ${active ? "text-white" : "text-[#9BA3B7]"}`}>{m.name}</span>
              <span className="text-[10px] text-[#5A6178] text-center leading-tight">{m.desc}</span>
            </button>
          );
        })}
      </div>

      {!configured && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#5A6178]">
          <Lock className="w-3 h-3" />
          Default: Batch. Employer hasn't configured a cadence policy yet.
        </div>
      )}
      {configured && !canSwitch && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#5A6178]">
          <Lock className="w-3 h-3" />
          Employer has locked mode switching.
        </div>
      )}
    </div>
  );
}
