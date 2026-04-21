"use client";

import { useEffect, useState } from "react";
import { useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from "wagmi";
import { YIELD_ESCROW_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { useContracts } from "@/hooks/useContracts";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { X, Sparkles, Loader2 } from "lucide-react";

export function YieldToggleDialog({
  payrollId,
  open,
  onClose,
  onChanged,
}: {
  payrollId: bigint;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const contracts = useContracts();
  const yieldAddr = protocol.YIELD_ESCROW as `0x${string}` | undefined;
  const vaultAddr = protocol.MOCK_YIELD_VAULT as `0x${string}` | undefined;

  const { data: available, refetch: refetchAvailable } = useReadContract({
    address: yieldAddr,
    abi: YIELD_ESCROW_ABI,
    functionName: "availableBalance",
    args: [payrollId],
    query: { enabled: !!yieldAddr && open, refetchInterval: open ? 5000 : false },
  });
  const { data: accrued, refetch: refetchAccrued } = useReadContract({
    address: yieldAddr,
    abi: YIELD_ESCROW_ABI,
    functionName: "accruedYield",
    args: [payrollId],
    query: { enabled: !!yieldAddr && open, refetchInterval: open ? 5000 : false },
  });

  // Enabled if availableBalance > 0 (means factory has routed funds through YieldEscrow)
  const enabled = available !== undefined && (available as bigint) > 0n;

  const [autoCompound, setAutoCompound] = useState(true);
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (isSuccess) {
      refetchAvailable();
      refetchAccrued();
      onChanged();
      setTxHash(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  async function enable() {
    if (!yieldAddr || !vaultAddr) return;
    try {
      // enableYield is onlyEmployer — check via factory owner happens on-chain.
      const hash = await writeContractAsync({
        address: yieldAddr,
        abi: YIELD_ESCROW_ABI,
        functionName: "enableYield",
        args: [payrollId, vaultAddr, autoCompound],
      });
      setTxHash(hash);
      toast.success("Yield vault enabled", {
        description: "Next fund will be routed through the ERC-4626 vault.",
      });
    } catch (e: unknown) {
      toast.error("Enable failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  async function disable() {
    if (!yieldAddr) return;
    try {
      const hash = await writeContractAsync({
        address: yieldAddr,
        abi: YIELD_ESCROW_ABI,
        functionName: "disableYield",
        args: [payrollId],
      });
      setTxHash(hash);
      toast.success("Yield vault disabled");
    } catch (e: unknown) {
      toast.error("Disable failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  async function claim() {
    if (!yieldAddr) return;
    try {
      const hash = await writeContractAsync({
        address: yieldAddr,
        abi: YIELD_ESCROW_ABI,
        functionName: "claimYield",
        args: [payrollId],
      });
      setTxHash(hash);
      toast.success("Yield claimed");
    } catch (e: unknown) {
      toast.error("Claim failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  if (!open) return null;

  if (!yieldAddr || !vaultAddr || !contracts.PAYROLL_FACTORY) {
    return (
      <Scrim onClose={onClose}>
        <div className="glass rounded-2xl p-6 max-w-md w-full">
          <Header title="Yield Vault" onClose={onClose} />
          <p className="text-sm text-[#9BA3B7]">Yield vault not deployed on this chain.</p>
        </div>
      </Scrim>
    );
  }

  const availUsd = available ? Number(formatUnits(available as bigint, 6)) : 0;
  const yieldUsd = accrued ? Number(formatUnits(accrued as bigint, 6)) : 0;
  const busy = isPending || isConfirming;

  return (
    <Scrim onClose={onClose}>
      <div className="glass rounded-2xl p-6 max-w-md w-full border border-white/10">
        <Header title="Yield Vault" onClose={onClose} />
        <p className="text-xs text-[#9BA3B7] mb-5">
          Route idle escrow through an ERC-4626 vault (MockYieldVault @ 4.5% APY). Auto-compound reinvests yield back into escrow each cycle.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0A0B14]/50 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wide text-[#5A6178] mb-1">In vault</div>
            <div className="font-semibold text-sm">${availUsd.toFixed(2)}</div>
          </div>
          <div className="bg-[#0A0B14]/50 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wide text-[#5A6178] mb-1">Yield accrued</div>
            <div className="font-semibold text-sm text-[#10B981]">${yieldUsd.toFixed(4)}</div>
          </div>
        </div>

        {!enabled ? (
          <>
            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" checked={autoCompound} onChange={(e) => setAutoCompound(e.target.checked)} className="accent-[#8B5CF6]" />
              Auto-compound yield into escrow each cycle
            </label>
            <button
              onClick={enable}
              disabled={busy}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "Enabling…" : "Enable yield"}
            </button>
            <p className="text-[10px] text-[#5A6178] mt-3">
              Next time you call <span className="text-white">Fund</span>, the deposit routes through the vault instead of sitting idle.
            </p>
          </>
        ) : (
          <div className="space-y-2">
            {yieldUsd > 0 && (
              <button
                onClick={claim}
                disabled={busy}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Claim ${yieldUsd.toFixed(4)} yield
              </button>
            )}
            <button
              onClick={disable}
              disabled={busy}
              className="w-full px-4 py-2.5 glass text-[#9BA3B7] rounded-xl text-sm disabled:opacity-40"
            >
              Disable yield vault
            </button>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
