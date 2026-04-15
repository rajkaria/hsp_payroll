"use client";

import { useReadContract, useWriteContract, useChainId } from "wagmi";
import { ADAPTIVE_CADENCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";
import { Zap, Package, Hand, Scissors } from "lucide-react";

const MODES = [
  { v: 0, name: "Batch", icon: Package, desc: "Full amount at execute" },
  { v: 1, name: "Stream", icon: Zap, desc: "Ticks per second, claim anytime" },
  { v: 2, name: "Pull", icon: Hand, desc: "Accumulates, claim on-demand" },
  { v: 3, name: "Hybrid", icon: Scissors, desc: "Split: part stream, part batch" },
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

  const { data: state } = useReadContract({
    address: cadenceAddr,
    abi: ADAPTIVE_CADENCE_ABI,
    functionName: "getCadenceState",
    args: [payrollId, recipient],
    query: { enabled: !!cadenceAddr },
  });

  const { data: accrued } = useReadContract({
    address: cadenceAddr,
    abi: ADAPTIVE_CADENCE_ABI,
    functionName: "accruedFor",
    args: [payrollId, recipient],
    query: { enabled: !!cadenceAddr, refetchInterval: 1500 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [localMode, setLocalMode] = useState<number>(0);

  useEffect(() => {
    if (state && typeof (state as any).mode !== "undefined") {
      setLocalMode(Number((state as any).mode));
    }
  }, [state]);

  async function switchMode(mode: number) {
    if (!cadenceAddr) return;
    setLocalMode(mode);
    await writeContractAsync({
      address: cadenceAddr,
      abi: ADAPTIVE_CADENCE_ABI,
      functionName: "setRecipientCadence",
      args: [payrollId, mode],
    });
  }

  async function claim() {
    if (!cadenceAddr) return;
    await writeContractAsync({
      address: cadenceAddr,
      abi: ADAPTIVE_CADENCE_ABI,
      functionName: "claim",
      args: [payrollId],
    });
  }

  if (!cadenceAddr) return null;

  const accruedUsd = accrued ? Number(formatUnits(accrued as bigint, 6)) : 0;
  const canSwitch = state ? (state as any).recipientCanSwitch : false;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Cadence</h3>
        {accruedUsd > 0 && (
          <button
            onClick={claim}
            disabled={isPending}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-full font-medium"
          >
            Claim ${accruedUsd.toFixed(4)}
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MODES.map((m) => (
          <button
            key={m.v}
            onClick={() => canSwitch && switchMode(m.v)}
            disabled={!canSwitch}
            className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1.5 transition ${
              localMode === m.v
                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
                : "border-gray-200 dark:border-slate-700"
            } ${canSwitch ? "hover:border-indigo-400 cursor-pointer" : "opacity-60"}`}
          >
            <m.icon className="w-4 h-4" />
            <span className="font-medium">{m.name}</span>
            <span className="text-[10px] text-gray-500 text-center">{m.desc}</span>
          </button>
        ))}
      </div>
      {!canSwitch && <p className="text-xs text-gray-500">Employer hasn't permitted mode switching.</p>}
    </div>
  );
}
