"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useChainId,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ADAPTIVE_CADENCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { usePayrollDetails } from "@/hooks/usePayrolls";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { Loader2, Package, Zap, Hand, Scissors, Lock } from "lucide-react";

const MODES = [
  { v: 0, name: "Batch", icon: Package, desc: "Full amount at execute" },
  { v: 1, name: "Stream", icon: Zap, desc: "Ticks per second" },
  { v: 2, name: "Pull", icon: Hand, desc: "Claim on demand" },
  { v: 3, name: "Hybrid", icon: Scissors, desc: "Split: part stream, part batch" },
];

type RowState = {
  id: string;
  name: string;
  mode: number;
  canSwitch: boolean;
  configured: boolean;
  accrued: bigint;
};

export function CadencePanel({ payrollIds, recipient }: { payrollIds: bigint[]; recipient: `0x${string}` }) {
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const publish = (s: RowState) => {
    setRows((prev) => {
      const e = prev[s.id];
      if (e && e.mode === s.mode && e.canSwitch === s.canSwitch && e.configured === s.configured && e.accrued === s.accrued && e.name === s.name) return prev;
      return { ...prev, [s.id]: s };
    });
  };

  const ordered = useMemo(() => payrollIds.map((id) => rows[id.toString()]).filter(Boolean), [rows, payrollIds]);

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/5">
      {payrollIds.map((id) => (
        <CadenceRowFetcher key={id.toString()} payrollId={id} recipient={recipient} publish={publish} />
      ))}

      <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-3 border-b border-white/5 text-[10px] font-medium uppercase tracking-widest text-[#5A6178]">
        <div>Payroll</div>
        <div className="justify-self-center px-2">Mode</div>
        <div className="justify-self-end min-w-[140px] text-right">Accrued</div>
        <div className="justify-self-end min-w-[80px] text-right">Action</div>
      </div>

      {ordered.length === 0 && (
        <div className="px-5 py-8 text-center text-xs text-[#5A6178]">Loading cadence state…</div>
      )}

      {ordered.map((r) => (
        <CadenceRow key={r.id} row={r} recipient={recipient} />
      ))}

      <div className="px-5 py-3 border-t border-white/5 text-[10px] text-[#5A6178] flex items-center gap-1.5">
        <Lock className="w-3 h-3" />
        Modes can only be switched if employer permits it. Stream / Pull / Hybrid require claiming; Batch auto-pays.
      </div>
    </div>
  );
}

function CadenceRowFetcher({
  payrollId,
  recipient,
  publish,
}: {
  payrollId: bigint;
  recipient: `0x${string}`;
  publish: (s: RowState) => void;
}) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const cadenceAddr = protocol.ADAPTIVE_CADENCE as `0x${string}` | undefined;

  const { data: details } = usePayrollDetails(payrollId);
  const { data: state } = useReadContract({
    address: cadenceAddr,
    abi: ADAPTIVE_CADENCE_ABI,
    functionName: "getCadenceState",
    args: [payrollId, recipient],
    query: { enabled: !!cadenceAddr, refetchInterval: 5000 },
  });
  const { data: accrued } = useReadContract({
    address: cadenceAddr,
    abi: ADAPTIVE_CADENCE_ABI,
    functionName: "accruedFor",
    args: [payrollId, recipient],
    query: { enabled: !!cadenceAddr, refetchInterval: 1500 },
  });

  const s = state as { mode: number; recipientCanSwitch: boolean; configured: boolean } | undefined;
  const mode = s ? Number(s.mode) : 0;
  const canSwitch = s ? s.recipientCanSwitch : false;
  const configured = s ? s.configured : false;
  const name = details ? (details[2] as string) : `Payroll #${payrollId.toString()}`;
  const accruedVal = (accrued as bigint) ?? 0n;

  useEffect(() => {
    publish({ id: payrollId.toString(), name, mode, canSwitch, configured, accrued: accruedVal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canSwitch, configured, accruedVal, name]);

  return null;
}

function CadenceRow({ row, recipient: _recipient }: { row: RowState; recipient: `0x${string}` }) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const cadenceAddr = protocol.ADAPTIVE_CADENCE as `0x${string}` | undefined;
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });
  const busy = isPending || isConfirming;

  const accruedUsd = Number(formatUnits(row.accrued, 6));

  async function switchMode(newMode: number) {
    if (!cadenceAddr) return;
    try {
      const h = await writeContractAsync({
        address: cadenceAddr,
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "setRecipientCadence",
        args: [BigInt(row.id), newMode],
      });
      setTxHash(h);
      toast.success(`Switched ${row.name} → ${MODES[newMode].name}`);
    } catch (e: unknown) {
      toast.error("Switch failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  async function claim() {
    if (!cadenceAddr) return;
    try {
      const h = await writeContractAsync({
        address: cadenceAddr,
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "claim",
        args: [BigInt(row.id)],
      });
      setTxHash(h);
      toast.success("Claim submitted");
    } catch (e: unknown) {
      toast.error("Claim failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  const CurrentIcon = MODES[row.mode]?.icon ?? Package;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] md:items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition">
      {/* Payroll */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B5CF6] flex-shrink-0" />
          <span className="text-sm text-white truncate" title={row.name}>{row.name}</span>
          <span className="text-[10px] text-[#5A6178]">#{row.id}</span>
        </div>
        <div className="text-[10px] text-[#5A6178] mt-0.5 md:hidden flex items-center gap-1">
          <CurrentIcon className="w-3 h-3" />
          Current: {MODES[row.mode]?.name}{!row.configured && " (default)"}
        </div>
      </div>

      {/* Mode switcher */}
      <div className="flex items-center gap-1 bg-[#0A0B14]/60 border border-white/5 rounded-lg p-0.5">
        {MODES.map((m) => {
          const active = row.mode === m.v && row.configured;
          const disabled = !row.canSwitch || busy || active;
          return (
            <button
              key={m.v}
              onClick={() => row.canSwitch && !busy && !active && switchMode(m.v)}
              disabled={disabled && !active}
              title={row.canSwitch ? `${m.name} — ${m.desc}` : "Employer hasn't permitted switching"}
              className={`relative px-2.5 py-1.5 rounded-md flex items-center gap-1 text-[11px] transition ${
                active
                  ? "bg-[#8B5CF6]/15 text-[#C084FC] shadow-[inset_0_0_12px_rgba(139,92,246,0.12)]"
                  : row.canSwitch
                  ? "text-[#9BA3B7] hover:text-white hover:bg-white/5"
                  : "text-[#5A6178] cursor-not-allowed"
              }`}
            >
              <m.icon className="w-3 h-3" />
              <span className="font-medium">{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Accrued */}
      <div className="text-right text-sm font-semibold tabular-nums min-w-[120px]">
        {accruedUsd > 0 ? (
          <span className="text-[#10B981]">${accruedUsd.toFixed(4)}</span>
        ) : (
          <span className="text-[#5A6178]">—</span>
        )}
      </div>

      {/* Action */}
      <div className="md:min-w-[96px] flex md:justify-end">
        {accruedUsd > 0 ? (
          <button
            onClick={claim}
            disabled={busy}
            className="px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white text-xs rounded-full font-medium disabled:opacity-40 hover:shadow-[0_0_16px_rgba(139,92,246,0.25)] transition flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Claim
          </button>
        ) : (
          <div className="px-3 py-1.5 text-[10px] text-[#5A6178]">
            {row.configured ? (row.canSwitch ? "Switchable" : "Locked") : "Default"}
          </div>
        )}
      </div>
    </div>
  );
}
