"use client";

import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { PAYROLL_ADVANCE_ABI } from "@/config/protocol-abis";
import { getProtocol } from "@/config/protocol-contracts";
import { getContracts } from "@/config/contracts";
import { MOCK_ERC20_ABI } from "@/config/contracts";
import { formatUnits, parseUnits } from "viem";
import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Wallet, Plus, Minus } from "lucide-react";

export default function LenderPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const protocol = getProtocol(chainId);
  const contracts = getContracts(chainId);
  const advanceAddr = protocol.PAYROLL_ADVANCE as `0x${string}` | undefined;
  const token = contracts.MOCK_USDT as `0x${string}`;
  const [amount, setAmount] = useState("");

  const { data: poolBalance } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "lenderPoolBalance",
    args: [token],
    query: { enabled: !!advanceAddr },
  });

  const { data: shares } = useReadContract({
    address: advanceAddr,
    abi: PAYROLL_ADVANCE_ABI,
    functionName: "lenderShares",
    args: address ? [token, address] : undefined,
    query: { enabled: !!advanceAddr && !!address },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  async function fundPool() {
    if (!advanceAddr || !amount) return;
    const amt = parseUnits(amount, 6);
    // approve then fund
    await writeContractAsync({
      address: token,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [advanceAddr, amt],
    });
    await writeContractAsync({
      address: advanceAddr,
      abi: PAYROLL_ADVANCE_ABI,
      functionName: "fundLenderPool",
      args: [token, amt],
    });
    setAmount("");
  }

  async function withdrawAll() {
    if (!advanceAddr || !shares) return;
    await writeContractAsync({
      address: advanceAddr,
      abi: PAYROLL_ADVANCE_ABI,
      functionName: "withdrawFromPool",
      args: [token, shares as bigint],
    });
  }

  if (!advanceAddr) {
    return (
      <div className="p-12 text-center space-y-3">
        <h1 className="text-xl font-bold">Lender pool not live on this chain</h1>
        <Link href="/protocol" className="text-indigo-600 text-sm">See the protocol</Link>
      </div>
    );
  }

  const pool = poolBalance ? Number(formatUnits(poolBalance as bigint, 6)) : 0;

  return (
    <div className="min-h-screen max-w-3xl mx-auto p-6 py-16 space-y-8">
      <Link href="/" className="text-sm text-gray-500">&larr; HashPay</Link>
      <div>
        <div className="text-xs font-medium text-indigo-600 uppercase tracking-widest">Receipt-Backed Lending</div>
        <h1 className="text-4xl font-bold mt-2">Lender Pool</h1>
        <p className="text-gray-600 mt-3">Fund advances against verified payroll receipts. Earn interest auto-repaid on cycle execute.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card label="Pool TVL" value={`$${pool.toLocaleString()}`} icon={<Wallet className="w-4 h-4" />} />
        <Card label="Your Shares" value={`${shares ?? 0}`} icon={<TrendingUp className="w-4 h-4" />} />
        <Card label="Base APR" value="1% / cycle" icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 space-y-4">
        <h2 className="font-semibold">Fund the pool</h2>
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="USDT amount"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-transparent"
          />
          <button
            onClick={fundPool}
            disabled={isPending || !amount}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Deposit
          </button>
        </div>
        {shares && (shares as bigint) > 0n && (
          <button
            onClick={withdrawAll}
            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
          >
            <Minus className="w-4 h-4" /> Withdraw all shares
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800">
      <div className="text-xs text-gray-500 flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
