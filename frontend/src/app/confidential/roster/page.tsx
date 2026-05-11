"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectGate } from "@/components/connect-gate";
import { ConnectButton } from "@/components/connect-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Users, ArrowLeft } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  ConfidentialPayrollRosterAbi,
} from "@/lib/fhevm/contracts";
import { encryptUint64 } from "@/lib/fhevm/client";
import { useWriteContract } from "wagmi";

export default function ConfidentialRosterPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const [rosterId, setRosterId] = useState<string>("");
  const [employee, setEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const { writeContractAsync } = useWriteContract();

  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;
  const append = (s: string) => setLog((l) => [...l, s]);

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Confidential"
        highlight="Roster"
        message="Pay every employee in one transaction without revealing per-employee amounts or the total."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function createRoster() {
    setBusy(true);
    try {
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        abi: ConfidentialPayrollRosterAbi,
        functionName: "createRoster",
        args: [],
      });
      append(`createRoster: ${tx}`);
    } finally {
      setBusy(false);
    }
  }

  async function addEmployee() {
    if (!address) return;
    setBusy(true);
    try {
      const cents = BigInt(Math.round(parseFloat(amount) * 100));
      const enc = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        address,
        cents,
      );
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        abi: ConfidentialPayrollRosterAbi,
        functionName: "addEmployee",
        args: [BigInt(rosterId), employee as `0x${string}`, enc.handle, enc.proof],
      });
      append(`addEmployee ${employee}: ${tx}`);
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    setBusy(true);
    try {
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        abi: ConfidentialPayrollRosterAbi,
        functionName: "executeRoster",
        args: [BigInt(rosterId)],
      });
      append(`executeRoster: ${tx}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#C084FC]/[0.04] rounded-full blur-[140px] pointer-events-none" />

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
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full px-3 py-1 mb-3">
              <Lock className="w-3 h-3" /> Encrypted batch payroll
            </div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)] tracking-tight">
              Confidential <span className="gradient-text">Roster</span>
            </h1>
            <p className="text-[#9BA3B7] mt-2 text-sm max-w-2xl leading-relaxed">
              Pay every employee in one transaction without revealing
              per-employee amounts or the total. Each amount encrypted
              client-side before submission.
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
          className="glass rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6]/15 to-[#C084FC]/5 border border-[#8B5CF6]/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-[#C084FC]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Build a roster
              </h3>
              <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
                Create → add encrypted entries → execute
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
              Step 1 · Create roster
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={createRoster}
                disabled={busy}
                className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0"
              >
                Create new roster
              </Button>
              <Input
                placeholder="Roster ID (after create)"
                value={rosterId}
                onChange={(e) => setRosterId(e.target.value)}
                className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
              Step 2 · Add encrypted entry
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              <Input
                placeholder="Employee 0x…"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
              />
              <Input
                placeholder="Amount (USD)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={addEmployee}
                disabled={busy || !rosterId}
                variant="outline"
                className="bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-[#8B5CF6]/30"
              >
                Add employee (encrypted)
              </Button>
              <Button
                onClick={execute}
                disabled={busy || !rosterId}
                className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0"
              >
                Execute roster
              </Button>
            </div>
          </div>

          <pre className="text-xs bg-black/30 border border-white/5 text-[#9BA3B7] p-3 rounded-lg overflow-x-auto font-mono">
            {log.join("\n") || "Activity will appear here."}
          </pre>
        </motion.div>
      </div>
    </div>
  );
}
