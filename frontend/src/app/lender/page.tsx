"use client";

import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PAYROLL_ADVANCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { getContracts, MOCK_ERC20_ABI } from "@/config/contracts";
import { formatUnits, parseUnits } from "viem";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, Wallet, Plus, Minus, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { toast } from "sonner";

export default function LenderPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const contracts = getContracts(chainId);
  const advanceAddr = protocol.PAYROLL_ADVANCE as `0x${string}` | undefined;
  const token = contracts.MOCK_USDT as `0x${string}`;
  const [amount, setAmount] = useState("");

  const { data: poolBalance, refetch: refetchPool } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "lenderPoolBalance",
    args: [token],
    query: { enabled: !!advanceAddr, refetchInterval: 10000 },
  });

  const { data: shares, refetch: refetchShares } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "lenderShares",
    args: address ? [token, address] : undefined,
    query: { enabled: !!advanceAddr && !!address, refetchInterval: 10000 },
  });

  const { data: usdtBalance, refetch: refetchUsdt } = useReadContract({
    address: token,
    abi: MOCK_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (isSuccess) {
      refetchPool();
      refetchShares();
      refetchUsdt();
      setTxHash(null);
      setAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  async function fundPool() {
    if (!advanceAddr || !amount) return;
    try {
      const amt = parseUnits(amount, 6);
      await writeContractAsync({
        address: token,
        abi: MOCK_ERC20_ABI,
        functionName: "approve",
        args: [advanceAddr, amt],
      });
      const h = await writeContractAsync({
        address: advanceAddr,
        abi: PAYROLL_ADVANCE_ABI,
        functionName: "fundLenderPool",
        args: [token, amt],
      });
      setTxHash(h);
      toast.success("Deposited into lender pool", { description: `$${amount} earning interest on every cycle.` });
    } catch (e: unknown) {
      toast.error("Deposit failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  async function withdrawAll() {
    if (!advanceAddr || !shares) return;
    try {
      const h = await writeContractAsync({
        address: advanceAddr,
        abi: PAYROLL_ADVANCE_ABI,
        functionName: "withdrawFromPool",
        args: [token, shares as bigint],
      });
      setTxHash(h);
      toast.success("Withdraw submitted");
    } catch (e: unknown) {
      toast.error("Withdraw failed", { description: (e instanceof Error ? e.message : "").slice(0, 160) });
    }
  }

  const pool = poolBalance ? Number(formatUnits(poolBalance as bigint, 6)) : 0;
  const userShares = shares ? (shares as bigint) : 0n;
  const walletUsd = usdtBalance ? Number(formatUnits(usdtBalance as bigint, 6)) : 0;
  const busy = isPending || isConfirming;

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/[0.05] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 py-10 relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <Link href="/" className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" /> HashPay
          </Link>
          <ConnectButton />
        </motion.div>

        {!advanceAddr ? (
          <div className="glass rounded-2xl p-10 text-center">
            <h1 className="text-xl font-bold mb-2">Lender pool not live on this chain</h1>
            <Link href="/protocol" className="text-[#8B5CF6] text-sm hover:underline">See the protocol →</Link>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#06B6D4] font-medium bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full px-3 py-1 mb-4">
                <Sparkles className="w-3 h-3" />
                Receipt-Backed Lending
              </div>
              <h1 className="text-4xl font-bold font-[family-name:var(--font-space-grotesk)]">
                Lender <span className="gradient-text">Pool</span>
              </h1>
              <p className="text-[#9BA3B7] mt-3 max-w-2xl text-sm">
                Fund income advances against verified payroll receipts. Interest auto-repays on every cycle execute — no collateral to liquidate, no off-chain underwriting.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
            >
              <Stat icon={<Wallet className="w-3.5 h-3.5" />} label="Pool TVL" value={`$${pool.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} accent="#06B6D4" />
              <Stat icon={<TrendingUp className="w-3.5 h-3.5" />} label="Your shares" value={userShares.toString()} />
              <Stat icon={<Sparkles className="w-3.5 h-3.5" />} label="Base APR" value="1% / cycle" accent="#10B981" />
              <Stat icon={<Wallet className="w-3.5 h-3.5" />} label="Wallet" value={`$${walletUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 border border-white/5"
            >
              <h2 className="font-semibold mb-4">Deposit USDT</h2>
              {!isConnected ? (
                <div className="text-center py-6 text-sm text-[#9BA3B7]">Connect wallet to deposit</div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0.00"
                      inputMode="decimal"
                      className="flex-1 px-4 py-3 rounded-xl bg-[#0A0B14]/80 border border-white/10 text-sm font-medium focus:outline-none focus:border-[#06B6D4]/50"
                    />
                    <button
                      onClick={() => setAmount(walletUsd.toFixed(2))}
                      className="px-3 py-3 rounded-xl glass text-xs text-[#9BA3B7] hover:text-white transition"
                    >
                      Max
                    </button>
                    <button
                      onClick={fundPool}
                      disabled={busy || !amount || Number(amount) <= 0 || Number(amount) > walletUsd}
                      className="px-5 py-3 bg-gradient-to-r from-[#06B6D4] to-[#0EA5E9] text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition flex items-center gap-1.5"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {busy ? "Confirming…" : "Deposit"}
                    </button>
                  </div>
                  {userShares > 0n && (
                    <button
                      onClick={withdrawAll}
                      disabled={busy}
                      className="w-full px-4 py-2.5 glass text-[#9BA3B7] hover:text-white rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-1.5 transition"
                    >
                      <Minus className="w-3.5 h-3.5" /> Withdraw all shares
                    </button>
                  )}
                </>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-8 glass rounded-2xl p-5 border border-white/5"
            >
              <h3 className="text-xs uppercase tracking-widest text-[#5A6178] mb-3">How it works</h3>
              <div className="grid sm:grid-cols-3 gap-4 text-xs text-[#9BA3B7]">
                <Step n="1" title="You deposit USDT" body="Receive pool shares proportional to your stake." />
                <Step n="2" title="Employees borrow" body="Against verified payroll history — 30-70% LTV, 1-2% APR by reputation tier." />
                <Step n="3" title="Auto-repay on cycle" body="Principal + interest deducted from next payout, routed back to the pool." />
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className="text-[10px] uppercase tracking-wide text-[#5A6178] flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </div>
      <div className="font-semibold text-lg" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[10px] font-bold text-[#C084FC]">{n}</div>
        <div className="text-sm font-medium text-white">{title}</div>
      </div>
      <p className="text-[11px] leading-relaxed">{body}</p>
    </div>
  );
}
