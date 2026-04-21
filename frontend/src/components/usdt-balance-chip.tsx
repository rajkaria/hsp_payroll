"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { MOCK_ERC20_ABI } from "@/config/contracts";
import { formatAmount } from "@/lib/utils";

export function USDTBalanceChip() {
  const { address } = useAccount();
  const contracts = useContracts();
  const [mintHash, setMintHash] = useState<`0x${string}` | undefined>();

  const { data: balance, refetch } = useReadContract({
    address: contracts.MOCK_USDT as `0x${string}`,
    abi: MOCK_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, isPending, error: mintError } = useWriteContract({
    mutation: {
      onSuccess: (hash) => setMintHash(hash),
    },
  });
  const { isLoading: mintConfirming, isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  useEffect(() => {
    if (mintError) toast.error("Mint failed", { description: mintError.message.slice(0, 160) });
  }, [mintError]);

  useEffect(() => {
    if (mintSuccess) {
      toast.success("Minted 10,000 USDT");
      refetch();
      setMintHash(undefined);
    }
  }, [mintSuccess, refetch]);

  const mint = () => {
    if (!address) return;
    writeContract({
      address: contracts.MOCK_USDT as `0x${string}`,
      abi: MOCK_ERC20_ABI,
      functionName: "mint",
      args: [address, parseUnits("10000", 6)],
    });
  };

  if (!address) return null;

  const busy = isPending || mintConfirming;

  return (
    <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
      <Coins className="w-4 h-4 text-[#10B981]" />
      <div className="leading-tight">
        <div className="text-[10px] text-[#5A6178] uppercase tracking-wide">USDT Balance</div>
        <div className="text-sm font-semibold">
          {balance !== undefined ? formatAmount(balance as bigint) : "…"} USDT
        </div>
      </div>
      <button
        onClick={mint}
        disabled={busy}
        className="ml-2 px-2.5 py-1 text-[11px] rounded-lg bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20 hover:bg-[#10B981]/25 transition-all flex items-center gap-1 disabled:opacity-50"
        title="Mint 10,000 test USDT"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        Mint 10k
      </button>
    </div>
  );
}
