"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Check, X, ExternalLink, FlaskConical, ArrowRight } from "lucide-react";

interface HSPPaymentButtonProps {
  payrollId: bigint;
  cycleNumber: number;
  totalAmount: string;
  recipientCount: number;
}

type DemoStep = "idle" | "initiating" | "processing" | "confirming" | "complete";

const STEP_DURATIONS: Record<DemoStep, number> = {
  idle: 0,
  initiating: 1500,
  processing: 2500,
  confirming: 1500,
  complete: 4000,
};

function generateFakeTxHash(): string {
  const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
  return "0x" + bytes.join("");
}

export function HSPPaymentButton({ payrollId, cycleNumber, totalAmount, recipientCount }: HSPPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep>("idle");
  const [confirmations, setConfirmations] = useState(0);
  const [orderData, setOrderData] = useState<{ hspOrderId: string; paymentUrl: string; isDemo: boolean } | null>(null);
  const [fakeTxHash, setFakeTxHash] = useState("");

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hsp/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollId: Number(payrollId),
          cycleNumber,
          totalAmount,
          recipientCount,
          token: "USDC",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrderData(data);
        if (data.isDemo) {
          setShowDemo(true);
          setDemoStep("idle");
          setConfirmations(0);
          setFakeTxHash(generateFakeTxHash());
        } else {
          window.open(data.paymentUrl, "_blank");
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const startDemoFlow = useCallback(() => {
    setDemoStep("initiating");
  }, []);

  // State machine for demo flow
  useEffect(() => {
    if (demoStep === "idle") return;

    if (demoStep === "initiating") {
      const timer = setTimeout(() => setDemoStep("processing"), STEP_DURATIONS.initiating);
      return () => clearTimeout(timer);
    }

    if (demoStep === "processing") {
      // Animate block confirmations
      const interval = setInterval(() => {
        setConfirmations((prev) => {
          if (prev >= 12) {
            clearInterval(interval);
            return 12;
          }
          return prev + 1;
        });
      }, 180);

      const timer = setTimeout(() => {
        clearInterval(interval);
        setConfirmations(12);
        setDemoStep("confirming");
      }, STEP_DURATIONS.processing);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    if (demoStep === "confirming") {
      const timer = setTimeout(() => setDemoStep("complete"), STEP_DURATIONS.confirming);
      return () => clearTimeout(timer);
    }

    if (demoStep === "complete") {
      const timer = setTimeout(() => {
        setShowDemo(false);
        setDemoStep("idle");
        setConfirmations(0);
      }, STEP_DURATIONS.complete);
      return () => clearTimeout(timer);
    }
  }, [demoStep]);

  const closeModal = () => {
    setShowDemo(false);
    setDemoStep("idle");
    setConfirmations(0);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full px-4 py-2.5 glass rounded-xl font-medium hover:border-[#8B5CF6]/30 transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2 text-sm text-[#9BA3B7] hover:text-white"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Creating HSP order...</>
        ) : (
          <><Shield className="w-4 h-4 text-[#8B5CF6]" /> Pay via HSP</>
        )}
      </button>

      {/* HSP Sandbox Checkout Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass-strong rounded-2xl p-8 max-w-md w-full"
            >
              <button onClick={closeModal} className="absolute top-4 right-4 text-[#5A6178] hover:text-white">
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <h3 className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
                  HSP <span className="gradient-text">Checkout</span>
                </h3>
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 text-[#C084FC] border border-[#8B5CF6]/20 font-medium">
                  <FlaskConical className="w-3 h-3" />
                  HSP Sandbox
                </span>
              </div>

              {/* Order Summary */}
              <div className="space-y-3 mb-6">
                <div className="glass rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5A6178]">Order ID</span>
                    <span className="font-mono text-xs text-[#8B5CF6]">{orderData?.hspOrderId?.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5A6178]">Amount</span>
                    <span className="font-medium">{totalAmount} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5A6178]">Recipients</span>
                    <span className="font-medium">{recipientCount}</span>
                  </div>
                </div>
              </div>

              {/* Step Progress */}
              {demoStep !== "idle" && demoStep !== "complete" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {(["initiating", "processing", "confirming"] as const).map((step, i) => (
                      <div key={step} className="flex items-center gap-2 flex-1">
                        <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                          demoStep === step ? "bg-[#8B5CF6] animate-pulse" :
                          (["initiating", "processing", "confirming"].indexOf(demoStep) > i) ? "bg-[#10B981]" :
                          "bg-[#1A2340]"
                        }`} />
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    {demoStep === "initiating" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 text-sm text-[#9BA3B7]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                        Creating HSP settlement request...
                      </motion.div>
                    )}
                    {demoStep === "processing" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm text-[#9BA3B7]">
                          <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                          Processing cross-chain settlement...
                        </div>
                        <div className="text-xs text-[#5A6178]">
                          Block confirmations: <span className="text-[#8B5CF6] font-mono">{confirmations}/12</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1 bg-[#1A2340] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(confirmations / 12) * 100}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                      </motion.div>
                    )}
                    {demoStep === "confirming" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 text-sm text-[#9BA3B7]">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Check className="w-4 h-4 text-[#10B981]" />
                        </motion.div>
                        Verifying on-chain receipt...
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Action / Result Area */}
              {demoStep === "idle" && (
                <button
                  onClick={startDemoFlow}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all flex items-center justify-center gap-2"
                >
                  Approve USDC Transfer
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {demoStep === "complete" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Confetti dots */}
                  <div className="relative">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        animate={{
                          opacity: 0,
                          y: -60 - Math.random() * 40,
                          x: (Math.random() - 0.5) * 120,
                          scale: 0,
                        }}
                        transition={{ duration: 1.2, delay: i * 0.05, ease: "easeOut" }}
                        className="absolute left-1/2 top-0 w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: ["#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"][i % 5],
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[#10B981] py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                      className="w-10 h-10 rounded-full bg-[#10B981]/15 flex items-center justify-center"
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-[#10B981]">Settlement Complete</p>
                    <p className="text-xs text-[#5A6178] mt-1">HSP Settlement Receipt generated</p>
                  </div>

                  <div className="glass rounded-xl p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5A6178]">Tx Hash</span>
                      <span className="font-mono text-[10px] text-[#8B5CF6]">{fakeTxHash.slice(0, 10)}...{fakeTxHash.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5A6178]">Amount</span>
                      <span className="font-medium text-white">{totalAmount} USDC</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5A6178]">Settled at</span>
                      <span className="font-medium text-white">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5A6178]">Confirmations</span>
                      <span className="font-medium text-[#10B981]">12/12</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 text-center text-xs text-[#5A6178]">
                <ExternalLink className="w-3 h-3 inline mr-1" />
                Powered by HashKey Settlement Protocol
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
