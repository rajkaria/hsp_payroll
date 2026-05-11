"use client";

import { useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectGate } from "@/components/connect-gate";
import { ConnectButton } from "@/components/connect-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileBadge2, ArrowLeft } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  ConfidentialAdvancePositionNFTAbi,
} from "@/lib/fhevm/contracts";

export default function ConfidentialPositionsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const [tokenId, setTokenId] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  const { data: tokenOwner } = useReadContract({
    address: FHEVM_ADDRESSES.ConfidentialAdvancePositionNFT,
    abi: ConfidentialAdvancePositionNFTAbi,
    functionName: "ownerOf",
    args: [BigInt(tokenId || "1")],
    query: { enabled: isConnected },
  });

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Encrypted"
        highlight="positions"
        message="Each advance is represented as an NFT with encrypted metadata. Transfer to hand off the position privately."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function transfer() {
    if (!address) return;
    setBusy(true);
    try {
      await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialAdvancePositionNFT,
        abi: ConfidentialAdvancePositionNFTAbi,
        functionName: "transferFrom",
        args: [address, recipient as `0x${string}`, BigInt(tokenId)],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-6 py-8 relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10"
        >
          <div>
            <button
              onClick={() => router.push("/confidential")}
              className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Confidential
            </button>
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#06B6D4] font-medium bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full px-3 py-1 mb-3">
              <FileBadge2 className="w-3 h-3" /> Position NFTs
            </div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)] tracking-tight">
              Encrypted <span className="gradient-text">positions</span>
            </h1>
            <p className="text-[#9BA3B7] mt-2 text-sm max-w-2xl leading-relaxed">
              Each advance is represented as an NFT with encrypted metadata
              (principal, rate, status). Transfer the NFT to hand off the
              position — and the ACL — privately.
            </p>
          </div>
          <ConnectButton />
        </motion.div>

        {onWrongChain && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 mb-8 border-l-2 border-l-amber-500/60"
          >
            <p className="text-sm text-[#E7C97F]">
              Connect to <strong>Sepolia (chainId 11155111)</strong>.
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06B6D4]/15 to-[#8B5CF6]/5 border border-[#06B6D4]/20 flex items-center justify-center">
              <FileBadge2 className="w-3.5 h-3.5 text-[#06B6D4]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Position lookup
              </h3>
              <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
                Transfer hands off ACL
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
              Token ID
            </label>
            <Input
              placeholder="1"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
            />
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-[#5A6178] font-semibold mb-1">
              Current holder
            </div>
            <code className="text-xs text-[#9BA3B7] font-mono break-all">
              {tokenOwner?.toString() ?? "—"}
            </code>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
              Recipient
            </label>
            <Input
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
            />
            <Button
              onClick={transfer}
              disabled={busy || !recipient}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0 w-full sm:w-auto"
            >
              {busy ? "Transferring…" : "Transfer (hands off ACL)"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
