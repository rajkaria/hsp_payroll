"use client";

import { useState } from "react";
import { useWriteContract, useChainId } from "wagmi";
import { ADAPTIVE_CADENCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { X, Loader2, Package, Zap, Hand, Scissors } from "lucide-react";
import { toast } from "sonner";

const MODES = [
  { v: 0, name: "Batch", icon: Package, desc: "Full amount on cycle execute (default)" },
  { v: 1, name: "Stream", icon: Zap, desc: "Linearly accrues per second" },
  { v: 2, name: "Pull", icon: Hand, desc: "Accumulates; recipient claims on demand" },
  { v: 3, name: "Hybrid", icon: Scissors, desc: "Split: part streamed, part batched" },
];

export function CadencePolicyDialog({
  payrollId,
  recipients,
  open,
  onClose,
}: {
  payrollId: bigint;
  recipients: readonly string[];
  open: boolean;
  onClose: () => void;
}) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const cadenceAddr = protocol.ADAPTIVE_CADENCE as `0x${string}` | undefined;

  const [mode, setMode] = useState(0);
  const [canSwitch, setCanSwitch] = useState(true);
  const [hybridBps, setHybridBps] = useState(5000);
  const [recipientIdx, setRecipientIdx] = useState(0);
  const [applyAll, setApplyAll] = useState(true);

  const { writeContractAsync, isPending } = useWriteContract();

  async function apply() {
    if (!cadenceAddr) return;
    const targets = applyAll ? recipients : [recipients[recipientIdx]];
    try {
      for (const recipient of targets) {
        await writeContractAsync({
          address: cadenceAddr,
          abi: ADAPTIVE_CADENCE_ABI,
          functionName: "setCadencePolicy",
          args: [payrollId, recipient as `0x${string}`, mode, canSwitch, BigInt(mode === 3 ? hybridBps : 0)],
        });
      }
      toast.success("Cadence policy applied", {
        description: `${MODES[mode].name} mode${canSwitch ? " (recipient can switch)" : " (locked)"} set for ${targets.length} recipient(s).`,
      });
      onClose();
    } catch (e: unknown) {
      toast.error("Failed to apply policy", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  if (!open) return null;

  if (!cadenceAddr) {
    return (
      <Scrim onClose={onClose}>
        <div className="glass rounded-2xl p-6 max-w-md w-full">
          <Header title="Cadence Policy" onClose={onClose} />
          <p className="text-sm text-[#9BA3B7]">Cadence extension not deployed on this chain.</p>
        </div>
      </Scrim>
    );
  }

  return (
    <Scrim onClose={onClose}>
      <div className="glass rounded-2xl p-6 max-w-lg w-full border border-white/10">
        <Header title="Cadence Policy" onClose={onClose} />
        <p className="text-xs text-[#9BA3B7] mb-4">
          Pick how each cycle's payout reaches recipients: all-at-once (Batch), streamed by the second (Stream), on-demand pull, or a split (Hybrid).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {MODES.map((m) => (
            <button
              key={m.v}
              onClick={() => setMode(m.v)}
              className={`p-3 rounded-xl border text-xs flex flex-col items-center gap-1.5 transition ${
                mode === m.v
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <m.icon className="w-4 h-4" />
              <span className="font-medium">{m.name}</span>
              <span className="text-[10px] text-[#5A6178] text-center leading-tight">{m.desc}</span>
            </button>
          ))}
        </div>

        {mode === 3 && (
          <div className="mb-4 bg-[#0A0B14]/50 rounded-xl p-3">
            <label className="text-[10px] uppercase tracking-wide text-[#5A6178] block mb-1">
              Stream portion: {(hybridBps / 100).toFixed(0)}% · Batch portion: {(100 - hybridBps / 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={500}
              max={9500}
              step={500}
              value={hybridBps}
              onChange={(e) => setHybridBps(Number(e.target.value))}
              className="w-full accent-[#8B5CF6]"
            />
          </div>
        )}

        <label className="flex items-center gap-2 mb-4 text-sm">
          <input type="checkbox" checked={canSwitch} onChange={(e) => setCanSwitch(e.target.checked)} className="accent-[#8B5CF6]" />
          Let recipient switch mode themselves
        </label>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="accent-[#8B5CF6]" />
            Apply to all {recipients.length} recipients
          </label>
          {!applyAll && (
            <select
              value={recipientIdx}
              onChange={(e) => setRecipientIdx(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0A0B14]/80 border border-white/10 text-sm"
            >
              {recipients.map((r, i) => (
                <option key={r} value={i}>
                  {r.slice(0, 8)}…{r.slice(-6)}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={apply}
          disabled={isPending}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Applying…" : "Apply policy"}
        </button>
      </div>
    </Scrim>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold">{title}</h3>
      <button onClick={onClose} className="text-[#5A6178] hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Scrim({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
