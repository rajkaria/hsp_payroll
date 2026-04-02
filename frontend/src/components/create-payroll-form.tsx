"use client";

import { useState } from "react";
import { useCreatePayroll } from "@/hooks/useCreatePayroll";
import { useApproveToken, useFundPayroll } from "@/hooks/useFundPayroll";
import { CONTRACTS } from "@/config/contracts";
import { parseUnits } from "viem";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2, Check, Loader2, Wallet, Lock, BarChart3, Waves } from "lucide-react";
import { TokenSelector } from "./token-selector";
import { DEFAULT_TOKENS, type TokenInfo } from "@/config/tokens";
import { toast } from "sonner";

const FREQUENCIES = [
  { label: "Weekly", value: 604800 },
  { label: "Biweekly", value: 1209600 },
  { label: "Monthly", value: 2592000 },
  { label: "Test (5 min)", value: 300 },
  { label: "Stream", value: 1, isStreaming: true },
];

interface Recipient {
  address: string;
  amount: string;
}

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function CreatePayrollForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(2592000);
  const [selectedToken, setSelectedToken] = useState<TokenInfo>(DEFAULT_TOKENS[0]);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: "", amount: "" },
  ]);
  const [fundAmount, setFundAmount] = useState("");

  const { create, isPending: isCreating, isConfirming: isCreatingConfirm, isSuccess: createSuccess } = useCreatePayroll();
  const { approve, isPending: isApproving, isConfirming: isApprovingConfirm, isSuccess: approveSuccess } = useApproveToken();
  const { fund, isPending: isFunding, isConfirming: isFundingConfirm, isSuccess: fundSuccess } = useFundPayroll();

  const addRecipient = () => setRecipients([...recipients, { address: "", amount: "" }]);
  const removeRecipient = (index: number) => setRecipients(recipients.filter((_, i) => i !== index));
  const updateRecipient = (index: number, field: "address" | "amount", value: string) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const totalPerCycle = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const handleCreate = () => {
    const addrs = recipients.map((r) => r.address as `0x${string}`);
    const amts = recipients.map((r) => parseUnits(r.amount, 6));
    create(name, CONTRACTS.MOCK_USDT as `0x${string}`, addrs, amts, BigInt(frequency));
  };

  const handleApprove = () => {
    approve(CONTRACTS.MOCK_USDT as `0x${string}`, parseUnits(fundAmount, 6));
  };

  const handleFund = () => {
    fund(1n, parseUnits(fundAmount, 6));
  };

  return (
    <div className="max-w-2xl mx-auto relative">
      {/* Progress bar */}
      <div className="flex gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#1A2340]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1E5EFF] to-[#8B5CF6]"
              initial={{ width: "0%" }}
              animate={{ width: s <= step ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between mb-8 text-xs text-[#525E75]">
        <span className={step >= 1 ? "text-[#8B95A9]" : ""}>Details</span>
        <span className={step >= 2 ? "text-[#8B95A9]" : ""}>Recipients</span>
        <span className={step >= 3 ? "text-[#8B95A9]" : ""}>Fund</span>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Payroll <span className="gradient-text">Details</span>
            </h2>

            <div>
              <label className="block text-sm text-[#8B95A9] mb-2">Payroll Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Team Alpha Monthly"
                className="w-full px-4 py-3 bg-[#0F1629] border border-[#1A2340] rounded-xl text-white placeholder-[#525E75] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#8B95A9] mb-2">Token</label>
              <TokenSelector selected={selectedToken} onSelect={setSelectedToken} />
            </div>

            <div>
              <label className="block text-sm text-[#8B95A9] mb-2">Frequency</label>
              <div className="grid grid-cols-5 gap-2">
                {FREQUENCIES.map((f) => {
                  const isStreaming = "isStreaming" in f && f.isStreaming;
                  return (
                    <button
                      key={f.value}
                      onClick={() => {
                        if (isStreaming) {
                          toast.info("Streaming payments preview", {
                            description: "Per-second salary streaming will be available soon.",
                          });
                        }
                        setFrequency(f.value);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        frequency === f.value
                          ? isStreaming
                            ? "bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            : "bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                          : isStreaming
                            ? "bg-[#0F1629] border border-[#8B5CF6]/30 text-[#8B5CF6] hover:border-[#8B5CF6]/60"
                            : "bg-[#0F1629] border border-[#1A2340] text-[#8B95A9] hover:border-[#8B5CF6]/40 hover:text-white"
                      }`}
                    >
                      {isStreaming && <Waves className="w-3 h-3 inline mr-1" />}
                      {f.label}
                    </button>
                  );
                })}
              </div>
              {frequency === 1 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-xs text-[#8B5CF6] flex items-center gap-1.5"
                >
                  <Waves className="w-3 h-3" />
                  Streaming delivers funds continuously every second. Preview only.
                </motion.p>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Next: Add Recipients
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Add <span className="gradient-text">Recipients</span>
            </h2>

            <div className="space-y-3">
              {recipients.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-center"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      value={r.address}
                      onChange={(e) => updateRecipient(i, "address", e.target.value)}
                      placeholder="0x... wallet address"
                      className="w-full px-4 py-3 bg-[#0F1629] border border-[#1A2340] rounded-xl text-white text-sm placeholder-[#525E75] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={r.amount}
                      onChange={(e) => updateRecipient(i, "amount", e.target.value)}
                      placeholder="Amount"
                      className="w-full px-4 py-3 bg-[#0F1629] border border-[#1A2340] rounded-xl text-white text-sm placeholder-[#525E75] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 focus:outline-none transition-colors"
                    />
                  </div>
                  {recipients.length > 1 && (
                    <button
                      onClick={() => removeRecipient(i)}
                      className="p-2.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            <button
              onClick={addRecipient}
              className="flex items-center gap-2 text-[#8B5CF6] text-sm font-medium hover:text-[#4B7FFF] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another recipient
            </button>

            <div className="glass rounded-xl p-4">
              <div className="text-sm text-[#8B95A9] mb-1">Total per cycle</div>
              <div className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
                <span className="gradient-text">{totalPerCycle.toLocaleString()}</span>
                <span className="text-sm text-[#8B95A9] ml-2 font-normal">{selectedToken.symbol}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 glass rounded-xl font-medium hover:border-[#8B5CF6]/30 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => { handleCreate(); setStep(3); }}
                disabled={recipients.some((r) => !r.address || !r.amount)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirm in wallet...
                  </>
                ) : (
                  <>
                    Create Payroll
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Fund <span className="gradient-text">Escrow</span>
            </h2>

            <div>
              <label className="block text-sm text-[#8B95A9] mb-2">Deposit Amount (USDT)</label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="e.g., 10000"
                className="w-full px-4 py-3 bg-[#0F1629] border border-[#1A2340] rounded-xl text-white placeholder-[#525E75] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 focus:outline-none transition-colors"
              />
              {totalPerCycle > 0 && fundAmount && (
                <div className="mt-2 text-sm text-[#8B95A9] flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#06B6D4]" />
                  Runway: ~{Math.floor(parseFloat(fundAmount) / totalPerCycle)} cycles
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleApprove}
                disabled={!fundAmount || isApproving || isApprovingConfirm}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  approveSuccess
                    ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20"
                    : "glass hover:border-[#8B5CF6]/40 text-[#8B5CF6] disabled:opacity-40"
                }`}
              >
                {isApproving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet...</>
                ) : isApprovingConfirm ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
                ) : approveSuccess ? (
                  <><Check className="w-4 h-4" /> Approved</>
                ) : (
                  <><Wallet className="w-4 h-4" /> Step 1: Approve USDT</>
                )}
              </button>
              <button
                onClick={handleFund}
                disabled={!approveSuccess || isFunding || isFundingConfirm}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isFunding ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in wallet...</>
                ) : isFundingConfirm ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Depositing...</>
                ) : fundSuccess ? (
                  <><Check className="w-4 h-4" /> Funded!</>
                ) : (
                  <><Lock className="w-4 h-4" /> Step 2: Fund Payroll</>
                )}
              </button>
            </div>

            {fundSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={() => router.push("/employer")}
                  className="w-full px-4 py-3 bg-[#10B981] text-white rounded-xl font-medium hover:bg-[#10B981]/90 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Go to Dashboard
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
