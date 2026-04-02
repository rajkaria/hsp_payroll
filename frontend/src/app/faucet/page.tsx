"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { ConnectButton } from "@/components/connect-button";
import { CONTRACTS, MOCK_ERC20_ABI } from "@/config/contracts";
import { getExplorerTxUrl } from "@/config/wagmi";
import { NetworkBadge } from "@/components/network-badge";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Wallet, ExternalLink, Check, Loader2, Coins } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatAmount } from "@/lib/utils";

const MINT_AMOUNTS = [
  { label: "1,000 USDT", value: "1000" },
  { label: "10,000 USDT", value: "10000" },
  { label: "100,000 USDT", value: "100000" },
];

export default function FaucetPage() {
  const { address, isConnected, chain } = useAccount();
  const router = useRouter();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance } = useReadContract({
    address: CONTRACTS.MOCK_USDT as `0x${string}`,
    abi: MOCK_ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const handleMint = (amount: string) => {
    if (!address) return;
    writeContract({
      address: CONTRACTS.MOCK_USDT as `0x${string}`,
      abi: MOCK_ERC20_ABI,
      functionName: "mint",
      args: [address, parseUnits(amount, 6)],
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-10 text-center relative">
          <Wallet className="w-10 h-10 text-[#8B5CF6] mx-auto mb-4" />
          <p className="text-[#9BA3B7] mb-6">Connect your wallet to use the faucet</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-lg mx-auto px-6 py-8 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Token <span className="gradient-text">Faucet</span>
            </h1>
            <NetworkBadge />
          </div>
          <p className="text-[#9BA3B7] text-sm">Get free testnet USDT to try HashPay</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-5">
          {/* Current balance */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-xs text-[#5A6178] uppercase tracking-wider mb-2">Your Balance</div>
            <div className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
              <span className="gradient-text">
                {balance !== undefined ? formatAmount(balance as bigint) : "0"}
              </span>
              <span className="text-sm text-[#5A6178] font-normal ml-2">USDT</span>
            </div>
          </div>

          {/* Mint buttons */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-4 h-4 text-[#8B5CF6]" />
              <span className="text-sm font-medium">Select Amount to Mint</span>
            </div>
            <div className="grid gap-3">
              {MINT_AMOUNTS.map((amt) => (
                <button
                  key={amt.value}
                  onClick={() => handleMint(amt.value)}
                  disabled={isPending || isConfirming}
                  className="w-full px-4 py-3.5 bg-[#0E1025] border border-[#1C1E3A] rounded-xl font-medium hover:border-[#8B5CF6]/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.08)] transition-all duration-300 disabled:opacity-40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-[#8B5CF6]" />
                    <span>{amt.label}</span>
                  </div>
                  <span className="text-xs text-[#5A6178]">Free</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {(isPending || isConfirming || isSuccess || error) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
              {isPending && (
                <div className="flex items-center gap-3 text-[#9BA3B7]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                  <span className="text-sm">Confirm in your wallet...</span>
                </div>
              )}
              {isConfirming && (
                <div className="flex items-center gap-3 text-[#9BA3B7]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#F59E0B]" />
                  <span className="text-sm">Minting tokens...</span>
                </div>
              )}
              {isSuccess && hash && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#34D399]">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Tokens minted successfully!</span>
                  </div>
                  <a
                    href={getExplorerTxUrl(hash, chain?.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#8B5CF6] hover:text-[#C084FC] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View transaction on explorer
                  </a>
                </div>
              )}
              {error && (
                <div className="text-sm text-[#EF4444]">
                  Error: {error.message.slice(0, 100)}
                </div>
              )}
            </motion.div>
          )}

          {/* Info */}
          <div className="text-center text-xs text-[#5A6178] space-y-1">
            <p>Mock USDT is a testnet token with no real value.</p>
            <p>Need HSK for gas? Visit the <a href="https://www.hashkeychain.net/faucet" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#C084FC]">HashKey Chain Faucet</a></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
