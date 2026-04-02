"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, ArrowRight, Banknote } from "lucide-react";
import { EXCHANGE_RATES } from "@/lib/fiat";

export function WithdrawToBankModal({ onClose }: { onClose: () => void }) {
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

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10B981]/20 to-[#06B6D4]/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-[#10B981]" />
            </div>
            <h3 className="text-xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Withdraw to <span className="gradient-text">Bank</span>
            </h3>
            <span className="inline-block mt-2 text-[10px] px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20 font-medium">
              Coming Soon
            </span>
          </div>

          {/* Mock form */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-xs text-[#525E75] mb-1">Bank Name</label>
              <div className="px-3 py-2.5 bg-[#0A0E1A]/50 border border-[#1A2340] rounded-xl text-[#525E75] text-sm">
                HSBC Hong Kong
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#525E75] mb-1">Account</label>
              <div className="px-3 py-2.5 bg-[#0A0E1A]/50 border border-[#1A2340] rounded-xl text-[#525E75] text-sm font-mono">
                ****-****-****-8291
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#525E75] mb-1">Amount</label>
              <div className="px-3 py-2.5 bg-[#0A0E1A]/50 border border-[#1A2340] rounded-xl text-[#525E75] text-sm">
                1,000.00 USDT
              </div>
            </div>
          </div>

          {/* Exchange rate */}
          <div className="glass rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8B95A9]">Exchange Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">1 USDT</span>
                <ArrowRight className="w-3 h-3 text-[#525E75]" />
                <span className="text-[#10B981] font-medium">HK${EXCHANGE_RATES.HKD}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-[#8B95A9]">You receive</span>
              <span className="text-white font-semibold">HK$7,820.00</span>
            </div>
          </div>

          <div className="text-center text-xs text-[#525E75] leading-relaxed">
            <Banknote className="w-4 h-4 inline mr-1 text-[#525E75]" />
            Fiat off-ramp integration with licensed partners is in development.
            Withdraw directly to your bank account soon.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
