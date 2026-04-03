"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Check, X, ExternalLink } from "lucide-react";

interface HSPPaymentButtonProps {
  payrollId: bigint;
  cycleNumber: number;
  totalAmount: string;
  recipientCount: number;
}

export function HSPPaymentButton({ payrollId, cycleNumber, totalAmount, recipientCount }: HSPPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [orderData, setOrderData] = useState<{ hspOrderId: string; paymentUrl: string; isDemo: boolean } | null>(null);

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

  const handleDemoComplete = () => {
    setDemoCompleted(true);
    setTimeout(() => {
      setShowDemo(false);
      setDemoCompleted(false);
    }, 2000);
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

      {/* Demo Checkout Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDemo(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative glass-strong rounded-2xl p-8 max-w-md w-full"
            >
              <button onClick={() => setShowDemo(false)} className="absolute top-4 right-4 text-[#5A6178] hover:text-white">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <h3 className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
                  HSP <span className="gradient-text">Checkout</span>
                </h3>
                <span className="inline-block mt-2 text-[10px] px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20 font-medium">
                  Demo Mode
                </span>
              </div>

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
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5A6178]">Network</span>
                    <span className="font-medium">HashKey Chain</span>
                  </div>
                </div>
              </div>

              {demoCompleted ? (
                <div className="flex items-center justify-center gap-2 text-[#10B981] py-3">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Payment Confirmed!</span>
                </div>
              ) : (
                <button
                  onClick={handleDemoComplete}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all"
                >
                  Approve USDC Transfer
                </button>
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
