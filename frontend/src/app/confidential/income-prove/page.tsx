"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectGate } from "@/components/connect-gate";
import { ConnectButton } from "@/components/connect-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  IncomeProverAbi,
} from "@/lib/fhevm/contracts";

export default function IncomeProvePage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const [threshold, setThreshold] = useState("");
  const [verifier, setVerifier] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Prove your"
        highlight="income"
        message="Issue a 'salary ≥ threshold' attestation to a specific verifier — without revealing the underlying amount."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function prove() {
    setBusy(true);
    try {
      const cents = BigInt(Math.round(parseFloat(threshold) * 100));
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.IncomeProver,
        abi: IncomeProverAbi,
        functionName: "proveAtLeast",
        args: [cents, verifier as `0x${string}`],
      });
      setLog((l) => [...l, `proveAtLeast(${threshold}, ${verifier}) → ${tx}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#10B981]/[0.04] rounded-full blur-[140px] pointer-events-none" />

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
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#10B981] font-medium bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-3 py-1 mb-3">
              <ShieldCheck className="w-3 h-3" /> Selective disclosure
            </div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)] tracking-tight">
              Prove your <span className="gradient-text">income</span>
            </h1>
            <p className="text-[#9BA3B7] mt-2 text-sm max-w-2xl leading-relaxed">
              Issue an encrypted &ldquo;salary ≥ threshold&rdquo; attestation to
              a specific verifier — without revealing the underlying amount.
              The verifier decrypts only the boolean.
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981]/15 to-[#06B6D4]/5 border border-[#10B981]/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Generate proof
              </h3>
              <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
                Encrypted attestation
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
              Threshold (USD)
            </label>
            <Input
              placeholder="5000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
              Verifier address
            </label>
            <Input
              placeholder="0x…"
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
              className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
            />
          </div>
          <Button
            onClick={prove}
            disabled={busy || !verifier || !threshold}
            className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0"
          >
            {busy ? "Generating…" : "Generate encrypted proof"}
          </Button>
          <pre className="text-xs bg-black/30 border border-white/5 text-[#9BA3B7] p-3 rounded-lg overflow-x-auto font-mono">
            {log.join("\n") || "Proofs you generate will be listed here."}
          </pre>
        </motion.div>
      </div>
    </div>
  );
}
