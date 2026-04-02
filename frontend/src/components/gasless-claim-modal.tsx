"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, PenTool, Radio, Coins } from "lucide-react";

const steps = [
  {
    icon: PenTool,
    title: "Sign Message",
    description: "Sign a gasless meta-transaction with your wallet",
    color: "#1E5EFF",
  },
  {
    icon: Radio,
    title: "Relayer Submits",
    description: "A relayer pays gas and submits your transaction on-chain",
    color: "#8B5CF6",
  },
  {
    icon: Coins,
    title: "Receive Tokens",
    description: "Tokens arrive in your wallet — zero gas spent",
    color: "#10B981",
  },
];

export function GaslessClaimModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative glass-strong rounded-2xl p-8 max-w-md w-full"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-[#525E75] hover:text-white">
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-8">
            <h3 className="text-xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Gasless <span className="gradient-text">Claims</span>
            </h3>
            <p className="text-sm text-[#8B95A9] mt-2">
              Claim payments without paying any gas fees
            </p>
            <span className="inline-block mt-3 text-[10px] px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20 font-medium">
              Coming Soon
            </span>
          </div>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 + 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${step.color}15` }}
                  >
                    <step.icon className="w-5 h-5" style={{ color: step.color }} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-1/2 top-12 w-px h-4 bg-[#1A2340] -translate-x-1/2" />
                  )}
                </div>
                <div className="pt-1">
                  <div className="text-sm font-semibold mb-0.5">{step.title}</div>
                  <div className="text-xs text-[#8B95A9]">{step.description}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center text-xs text-[#525E75]">
            Powered by ERC-2771 meta-transactions
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
