"use client";

import { useEffect, useState } from "react";
import { useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from "wagmi";
import { COMPLIANCE_REGISTRY_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { X, Loader2, Shield, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type HookMeta = { name: string; address: `0x${string}`; desc: string };

function hooksFor(chainId: number | undefined): HookMeta[] {
  const p = getProtocol(chainId);
  const hs: HookMeta[] = [];
  if (p.KYC_HOOK) hs.push({ name: "KYC (Soul-Bound Token)", address: p.KYC_HOOK as `0x${string}`, desc: "Blocks payout unless recipient holds KYC SBT" });
  if (p.JURISDICTION_HOOK) hs.push({ name: "Jurisdiction filter", address: p.JURISDICTION_HOOK as `0x${string}`, desc: "Restricts by country code allowlist" });
  if (p.SANCTIONS_HOOK) hs.push({ name: "Sanctions screen", address: p.SANCTIONS_HOOK as `0x${string}`, desc: "Blocks addresses on the on-chain sanctions list" });
  return hs;
}

export function ComplianceHooksDialog({
  payrollId,
  open,
  onClose,
}: {
  payrollId: bigint;
  open: boolean;
  onClose: () => void;
}) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const regAddr = protocol.COMPLIANCE_REGISTRY as `0x${string}` | undefined;
  const hooks = hooksFor(chainId);

  const { data: attached, refetch, isLoading } = useReadContract({
    address: regAddr,
    abi: COMPLIANCE_REGISTRY_ABI,
    functionName: "getHooks",
    args: [payrollId],
    query: { enabled: !!regAddr && open },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null);
  const { isSuccess } = useWaitForTransactionReceipt({ hash: pendingHash ?? undefined });

  useEffect(() => {
    if (isSuccess) {
      refetch();
      setPendingHash(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  async function attach(hook: `0x${string}`) {
    if (!regAddr) return;
    try {
      const hash = await writeContractAsync({
        address: regAddr,
        abi: COMPLIANCE_REGISTRY_ABI,
        functionName: "attachHook",
        args: [payrollId, hook],
      });
      setPendingHash(hash);
      toast.success("Compliance hook attached");
    } catch (e: unknown) {
      toast.error("Attach failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  async function detach(hook: `0x${string}`) {
    if (!regAddr) return;
    try {
      const hash = await writeContractAsync({
        address: regAddr,
        abi: COMPLIANCE_REGISTRY_ABI,
        functionName: "detachHook",
        args: [payrollId, hook],
      });
      setPendingHash(hash);
      toast.success("Compliance hook detached");
    } catch (e: unknown) {
      toast.error("Detach failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  if (!open) return null;

  if (!regAddr) {
    return (
      <Scrim onClose={onClose}>
        <div className="glass rounded-2xl p-6 max-w-md w-full">
          <Header title="Compliance Hooks" onClose={onClose} />
          <p className="text-sm text-[#9BA3B7]">Compliance registry not deployed on this chain.</p>
        </div>
      </Scrim>
    );
  }

  const attachedSet = new Set(((attached as readonly string[]) ?? []).map((a) => a.toLowerCase()));

  return (
    <Scrim onClose={onClose}>
      <div className="glass rounded-2xl p-6 max-w-lg w-full border border-white/10">
        <Header title="Compliance Hooks" onClose={onClose} />
        <p className="text-xs text-[#9BA3B7] mb-4">
          Attach pluggable hooks that run on every recipient before settlement. A failing hook skips that recipient only — others in the cycle still get paid.
        </p>

        <div className="space-y-2">
          {isLoading && <div className="text-sm text-[#5A6178]">Loading attached hooks…</div>}
          {hooks.length === 0 && <div className="text-sm text-[#5A6178]">No hook implementations deployed on this chain.</div>}
          {hooks.map((h) => {
            const isAttached = attachedSet.has(h.address.toLowerCase());
            return (
              <div key={h.address} className="bg-[#0A0B14]/50 rounded-xl p-3 flex items-start gap-3">
                <Shield className={`w-4 h-4 mt-0.5 ${isAttached ? "text-[#10B981]" : "text-[#5A6178]"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{h.name}</div>
                  <div className="text-[11px] text-[#9BA3B7]">{h.desc}</div>
                  <div className="text-[10px] text-[#5A6178] truncate">{h.address}</div>
                </div>
                {isAttached ? (
                  <button
                    onClick={() => detach(h.address)}
                    disabled={isPending}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20 hover:bg-[#EF4444]/25 disabled:opacity-40 flex items-center gap-1"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Detach
                  </button>
                ) : (
                  <button
                    onClick={() => attach(h.address)}
                    disabled={isPending}
                    className="px-2.5 py-1.5 rounded-lg text-xs bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20 hover:bg-[#10B981]/25 disabled:opacity-40 flex items-center gap-1"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Attach
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {attachedSet.size > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-[#10B981]">
            <Check className="w-3 h-3" /> {attachedSet.size} hook(s) will run before each payout.
          </div>
        )}
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
