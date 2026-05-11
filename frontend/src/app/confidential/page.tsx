"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ConnectGate } from "@/components/connect-gate";
import { ConnectButton } from "@/components/connect-button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Shield,
  Eye,
  ArrowLeft,
  Users,
  FileBadge2,
  Gauge,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SalaryViewCard } from "@/components/confidential/SalaryViewCard";
import { RequestAdvanceCard } from "@/components/confidential/RequestAdvanceCard";
import { FHEVM_CHAIN_ID } from "@/lib/fhevm/contracts";
import { useFhevmReady } from "@/hooks/useFhevmReady";

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
        {title}
      </h2>
      {hint && (
        <span className="text-[10px] text-[#5A6178] hidden sm:block">{hint}</span>
      )}
    </div>
  );
}

const FLOWS = [
  {
    href: "/confidential/roster",
    icon: Users,
    title: "Confidential roster",
    description: "Pay every employee in one tx with encrypted amounts.",
  },
  {
    href: "/confidential/income-prove",
    icon: ShieldCheck,
    title: "Prove your income",
    description: "Issue a 'salary ≥ X' attestation without revealing the amount.",
  },
  {
    href: "/confidential/runway",
    icon: Gauge,
    title: "Encrypted runway",
    description: "Track payroll runway without publishing your burn rate.",
  },
  {
    href: "/confidential/positions",
    icon: FileBadge2,
    title: "Position NFTs",
    description: "View and transfer encrypted advance positions.",
  },
];

export default function ConfidentialPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const [mode, setMode] = useState<"employer" | "employee">("employee");
  const [counterparty, setCounterparty] = useState("");
  const fhevm = useFhevmReady();

  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="HashPay Confidential"
        title="Privacy-preserving"
        highlight="payroll credit"
        message="Connect your wallet to view encrypted salary, request a confidential advance, and use FHE-gated underwriting on Sepolia."
        features={[
          { label: "Encrypted on chain", color: "#8B5CF6" },
          { label: "User-controlled decryption", color: "#06B6D4" },
          { label: "ERC-7984 cUSDT", color: "#10B981" },
        ]}
      />
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-8 relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10"
        >
          <div>
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full px-3 py-1 mb-3">
              <Shield className="w-3 h-3" /> FHE-native rails
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-space-grotesk)] tracking-tight">
              HashPay <span className="gradient-text">Confidential</span>
            </h1>
            <p className="text-[#9BA3B7] mt-2 text-sm max-w-2xl leading-relaxed">
              Privacy-preserving payroll-backed credit. Salary, credit score, and
              advance amount are encrypted end to end. Underwriting happens entirely
              under FHE — no observer learns the values, nor whether you were
              approved.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9BA3B7] bg-white/[0.03] border border-white/5 rounded-full px-2.5 py-1">
                <Lock className="w-2.5 h-2.5 text-[#8B5CF6]" /> Encrypted on chain
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9BA3B7] bg-white/[0.03] border border-white/5 rounded-full px-2.5 py-1">
                <Eye className="w-2.5 h-2.5 text-[#06B6D4]" /> User-controlled decryption
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9BA3B7] bg-white/[0.03] border border-white/5 rounded-full px-2.5 py-1">
                <span className="w-1 h-1 rounded-full bg-[#10B981]" /> cUSDT (ERC-7984)
              </span>
            </div>
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
              Connect to <strong>Sepolia (chainId 11155111)</strong> to use the
              confidential dApp. Your HashKey Chain payroll continues to run on
              its own network — no bridging required.
            </p>
          </motion.div>
        )}

        {!onWrongChain &&
          (fhevm.status === "loading-sdk" ||
            fhevm.status === "loading-keys" ||
            fhevm.status === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass rounded-2xl p-4 mb-8 border-l-2 ${
                fhevm.status === "error"
                  ? "border-l-red-500/60"
                  : "border-l-[#8B5CF6]/60"
              }`}
            >
              <div className="flex items-center gap-3">
                {fhevm.status !== "error" && (
                  <div className="w-4 h-4 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#C084FC] animate-spin flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium">
                    {fhevm.status === "loading-sdk" &&
                      "Loading FHE relayer SDK…"}
                    {fhevm.status === "loading-keys" &&
                      "Fetching Sepolia FHE keys (one-time, ~10–30s)…"}
                    {fhevm.status === "error" && "FHE init failed"}
                  </div>
                  <div className="text-[11px] text-[#9BA3B7] mt-0.5">
                    {fhevm.status === "error"
                      ? fhevm.error ?? "Try reloading the page."
                      : "Warming the SDK in the background so your first encrypted action is fast."}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-8"
        >
          <section className="space-y-3">
            <SectionLabel
              title="Mode"
              hint="Switch between employer and employee flows"
            />
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("employee")}
                  className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${
                    mode === "employee"
                      ? "bg-gradient-to-r from-[#8B5CF6]/20 to-[#C084FC]/10 border border-[#8B5CF6]/40 text-white shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                      : "bg-white/[0.02] border border-white/5 text-[#9BA3B7] hover:text-white hover:border-white/10"
                  }`}
                >
                  <div className="font-semibold">I&apos;m an employee</div>
                  <div className="text-xs mt-0.5 opacity-80">
                    Request an encrypted advance
                  </div>
                </button>
                <button
                  onClick={() => setMode("employer")}
                  className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${
                    mode === "employer"
                      ? "bg-gradient-to-r from-[#8B5CF6]/20 to-[#C084FC]/10 border border-[#8B5CF6]/40 text-white shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                      : "bg-white/[0.02] border border-white/5 text-[#9BA3B7] hover:text-white hover:border-white/10"
                  }`}
                >
                  <div className="font-semibold">I&apos;m an employer</div>
                  <div className="text-xs mt-0.5 opacity-80">
                    Set encrypted salaries
                  </div>
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
                  {mode === "employer" ? "Employee address" : "Employer address"}
                </label>
                <Input
                  placeholder="0x…"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
                />
              </div>
            </div>
          </section>

          {address &&
            counterparty.startsWith("0x") &&
            counterparty.length === 42 && (
              <section className="space-y-3">
                <SectionLabel
                  title="Encrypted Operations"
                  hint="All values encrypted client-side · decryption requires your signature"
                />
                <div className="grid gap-6 md:grid-cols-2">
                  <SalaryViewCard
                    mode={mode}
                    counterpartyAddress={counterparty as `0x${string}`}
                  />
                  {mode === "employee" && <RequestAdvanceCard />}
                </div>
              </section>
            )}

          <section className="space-y-3">
            <SectionLabel
              title="More Confidential Flows"
              hint="Composable FHE primitives across the payroll lifecycle"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {FLOWS.map((flow, i) => {
                const Icon = flow.icon;
                return (
                  <motion.a
                    key={flow.href}
                    href={flow.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="glass rounded-2xl p-5 group hover:border-[#8B5CF6]/30 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6]/15 to-[#C084FC]/5 border border-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#C084FC]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-white">
                            {flow.title}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#5A6178] group-hover:text-[#C084FC] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div className="text-xs text-[#9BA3B7] mt-1 leading-relaxed">
                          {flow.description}
                        </div>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </section>

          <div className="text-xs text-[#5A6178] text-center pt-4">
            Confidential rails settle on Sepolia · HSP payroll on HashKey Chain
            continues untouched
          </div>
        </motion.div>
      </div>
    </div>
  );
}
