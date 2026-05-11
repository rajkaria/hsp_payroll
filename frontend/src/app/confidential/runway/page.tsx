"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectGate } from "@/components/connect-gate";
import { ConnectButton } from "@/components/connect-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gauge, ArrowLeft, AlertTriangle } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  ConfidentialEmployerRunwayAbi,
} from "@/lib/fhevm/contracts";
import { encryptUint64 } from "@/lib/fhevm/client";

export default function ConfidentialRunwayPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const [perCycle, setPerCycle] = useState("");
  const [cycles, setCycles] = useState("2");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Confidential"
        highlight="runway"
        message="Track payroll runway without publishing your burn rate. Balance and per-cycle total stay encrypted."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function setTotal() {
    if (!address) return;
    setBusy(true);
    try {
      const cents = BigInt(Math.round(parseFloat(perCycle) * 100));
      const enc = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialEmployerRunway,
        address,
        cents,
      );
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialEmployerRunway,
        abi: ConfidentialEmployerRunwayAbi,
        functionName: "setPerCycleTotal",
        args: [enc.handle, enc.proof],
      });
      setLog((l) => [...l, `setPerCycleTotal: ${tx}`]);
    } finally {
      setBusy(false);
    }
  }

  async function checkLow() {
    if (!address) return;
    setBusy(true);
    try {
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialEmployerRunway,
        abi: ConfidentialEmployerRunwayAbi,
        functionName: "hasLowRunway",
        args: [address, BigInt(cycles)],
      });
      setLog((l) => [
        ...l,
        `hasLowRunway(${cycles}): ${tx} — decrypt the returned ebool client-side`,
      ]);
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
              <Gauge className="w-3 h-3" /> Encrypted runway
            </div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)] tracking-tight">
              Confidential <span className="gradient-text">runway</span>
            </h1>
            <p className="text-[#9BA3B7] mt-2 text-sm max-w-2xl leading-relaxed">
              Track payroll runway without publishing your burn rate. Balance
              and per-cycle total are both encrypted; only the low-runway
              boolean is selectively revealed.
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

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10B981]/15 to-[#06B6D4]/5 border border-[#10B981]/20 flex items-center justify-center">
                <Gauge className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Encrypted per-cycle total
                </h3>
                <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
                  Sum of payroll obligations
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
                Per-cycle total (USD)
              </label>
              <Input
                placeholder="e.g. 50000"
                value={perCycle}
                onChange={(e) => setPerCycle(e.target.value)}
                className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
              />
            </div>
            <Button
              onClick={setTotal}
              disabled={busy || !perCycle}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0"
            >
              {busy ? "Encrypting…" : "Encrypt & set"}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E7C97F]/15 to-[#8B5CF6]/5 border border-[#E7C97F]/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-[#E7C97F]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Low-runway alert
                </h3>
                <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
                  Returns an encrypted boolean
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
                Cycles threshold
              </label>
              <Input
                placeholder="2"
                value={cycles}
                onChange={(e) => setCycles(e.target.value)}
                className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
              />
            </div>
            <Button
              onClick={checkLow}
              disabled={busy || !cycles}
              variant="outline"
              className="bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-[#8B5CF6]/30"
            >
              {busy ? "Checking…" : "Check (encrypted boolean)"}
            </Button>

            <pre className="text-xs bg-black/30 border border-white/5 text-[#9BA3B7] p-3 rounded-lg overflow-x-auto font-mono">
              {log.join("\n") || "Activity will appear here."}
            </pre>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
