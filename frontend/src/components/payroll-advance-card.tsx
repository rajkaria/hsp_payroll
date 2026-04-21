"use client";

import { useState, useMemo, useEffect } from "react";
import { useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt } from "wagmi";
import { PAYROLL_ADVANCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { formatUnits, parseUnits } from "viem";
import { Banknote, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export function PayrollAdvanceCard({
  address,
  payrollIds,
}: {
  address: `0x${string}`;
  payrollIds: bigint[];
}) {
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const advanceAddr = protocol.PAYROLL_ADVANCE as `0x${string}` | undefined;

  const [selectedId, setSelectedId] = useState<bigint | null>(payrollIds[0] ?? null);
  useEffect(() => {
    if (!selectedId && payrollIds[0]) setSelectedId(payrollIds[0]);
  }, [payrollIds, selectedId]);

  const [amount, setAmount] = useState("");

  const { data: tier, refetch: refetchTier } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "tierFor",
    args: [address],
    query: { enabled: !!advanceAddr },
  });

  const { data: debt, refetch: refetchDebt } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "outstandingDebt",
    args: [address],
    query: { enabled: !!advanceAddr, refetchInterval: 10000 },
  });

  const { data: maxAdvance, refetch: refetchMax } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "maxAdvanceFor",
    args: selectedId !== null ? [address, selectedId] : undefined,
    query: { enabled: !!advanceAddr && selectedId !== null, refetchInterval: 10000 },
  });

  const { data: poolBalance } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "lenderPoolBalance",
    args: protocol && selectedId !== null ? [getUSDT(chainId)] : undefined,
    query: { enabled: !!advanceAddr && selectedId !== null, refetchInterval: 15000 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Advance funded", { description: `$${amount} sent to your wallet. Auto-repay on next cycle.` });
      setAmount("");
      setTxHash(null);
      refetchMax();
      refetchDebt();
      refetchTier();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (!advanceAddr) return null;

  const ltvBps = tier ? Number((tier as readonly [bigint, bigint])[0]) : 0;
  const interestBps = tier ? Number((tier as readonly [bigint, bigint])[1]) : 0;
  const ltvPct = ltvBps / 100;
  const interestPct = interestBps / 100;
  const maxUsd = maxAdvance ? Number(formatUnits(maxAdvance as bigint, 6)) : 0;
  const debtUsd = debt ? Number(formatUnits(debt as bigint, 6)) : 0;
  const poolUsd = poolBalance ? Number(formatUnits(poolBalance as bigint, 6)) : 0;

  const parsedAmount = useMemo(() => {
    const n = Number(amount);
    if (!amount || isNaN(n) || n <= 0) return null;
    return n;
  }, [amount]);

  const amountExceedsMax = parsedAmount !== null && parsedAmount > maxUsd;
  const amountExceedsPool = parsedAmount !== null && parsedAmount > poolUsd;
  const disabled =
    !parsedAmount || amountExceedsMax || amountExceedsPool || isPending || isConfirming || selectedId === null || ltvBps === 0;

  async function borrow() {
    if (!advanceAddr || selectedId === null || !parsedAmount) return;
    try {
      const hash = await writeContractAsync({
        address: advanceAddr,
        abi: PAYROLL_ADVANCE_ABI,
        functionName: "requestAdvance",
        args: [selectedId, parseUnits(parsedAmount.toString(), 6)],
      });
      setTxHash(hash);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      toast.error("Advance denied", { description: msg.slice(0, 160) });
    }
  }

  const ineligible = ltvBps === 0;

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#06B6D4]" />
          <h3 className="font-semibold text-sm">Payroll-Backed Advance</h3>
        </div>
        <div className="text-[10px] text-[#5A6178] uppercase tracking-wide">
          Pool: ${poolUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      {ineligible ? (
        <div className="bg-[#0A0B14]/50 rounded-xl p-4 text-sm text-[#9BA3B7] flex gap-2">
          <Info className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-white text-sm mb-1">Not yet eligible</div>
            <p className="text-xs text-[#9BA3B7]">
              Build verified on-chain income (≥ $100) to unlock credit. Ask your employer to run
              <span className="text-white"> Create EAS Attestations</span> after each cycle to grow your reputation score.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Max available" value={`$${maxUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent="#10B981" />
            <Stat label="LTV / APR" value={`${ltvPct.toFixed(0)}% · ${interestPct.toFixed(1)}%`} />
            <Stat label="Outstanding" value={`$${debtUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent={debtUsd > 0 ? "#F59E0B" : undefined} />
          </div>

          {payrollIds.length > 1 && (
            <div className="mb-3">
              <label className="text-[10px] uppercase tracking-wide text-[#5A6178] block mb-1">Against payroll</label>
              <select
                value={selectedId?.toString() ?? ""}
                onChange={(e) => setSelectedId(BigInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0A0B14]/80 border border-white/10 text-sm"
              >
                {payrollIds.map((id) => (
                  <option key={id.toString()} value={id.toString()}>
                    Payroll #{id.toString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              inputMode="decimal"
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#0A0B14]/80 border border-white/10 text-sm font-medium focus:outline-none focus:border-[#8B5CF6]/50"
            />
            <button
              onClick={() => setAmount(maxUsd.toFixed(2))}
              className="px-3 py-2.5 rounded-lg glass text-xs text-[#9BA3B7] hover:text-white transition-colors"
              type="button"
            >
              Max
            </button>
            <button
              onClick={borrow}
              disabled={disabled}
              className="px-5 py-2.5 bg-gradient-to-r from-[#06B6D4] to-[#0EA5E9] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_18px_rgba(6,182,212,0.25)] transition flex items-center gap-1.5"
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirm…</>
              ) : isConfirming ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Borrowing…</>
              ) : (
                "Borrow"
              )}
            </button>
          </div>

          {amountExceedsMax && <div className="mt-2 text-xs text-[#EF4444]">Exceeds max advance (${maxUsd.toFixed(2)})</div>}
          {!amountExceedsMax && amountExceedsPool && <div className="mt-2 text-xs text-[#F59E0B]">Pool doesn't have enough liquidity. <Link href="/lender" className="underline">Add liquidity →</Link></div>}

          {debtUsd > 0 && (
            <div className="mt-4 text-xs text-[#5A6178] border-t border-white/5 pt-3">
              <Info className="w-3 h-3 inline-block mr-1" />
              Outstanding debt auto-repays (principal + {interestPct.toFixed(1)}% interest) on your next payroll cycle.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[#0A0B14]/50 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-[#5A6178] mb-1">{label}</div>
      <div className="font-semibold text-sm" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function getUSDT(chainId: number | undefined): `0x${string}` {
  if (chainId === 133) return "0x85466F956A7d29650042846C916da2ae9eB84d5c";
  return "0xCa52178fa3bE627fa51378Be5ef11C8015D1ec23"; // sepolia
}
