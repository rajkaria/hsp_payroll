"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Waves } from "lucide-react";

interface StreamingBalanceProps {
  totalEarned: number;
  ratePerSecond: number;
}

export function StreamingBalance({ totalEarned, ratePerSecond }: StreamingBalanceProps) {
  const [display, setDisplay] = useState(totalEarned);
  const startRef = useRef(Date.now());
  const baseRef = useRef(totalEarned);

  useEffect(() => {
    startRef.current = Date.now();
    baseRef.current = totalEarned;
    let raf: number;

    function tick() {
      const elapsed = (Date.now() - startRef.current) / 1000;
      setDisplay(baseRef.current + elapsed * ratePerSecond);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalEarned, ratePerSecond]);

  const formatted = display.toFixed(8);
  const [whole, decimals] = formatted.split(".");
  const stableDecimals = decimals.slice(0, 4);
  const tickingDecimals = decimals.slice(4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 relative overflow-hidden gradient-border"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/5 via-transparent to-[#06B6D4]/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <Waves className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-xs font-medium text-[#8B95A9] uppercase tracking-wider">
              Live Streaming
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 font-medium">
            Preview
          </span>
        </div>

        <div className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-white">{Number(whole).toLocaleString()}</span>
          <span className="text-[#8B95A9]">.</span>
          <span className="text-[#8B95A9]">{stableDecimals}</span>
          <span className="text-[#10B981] font-mono">{tickingDecimals}</span>
          <span className="text-sm text-[#525E75] font-normal ml-2">USDT</span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-[#525E75]">
          <span>Rate: {(ratePerSecond * 86400).toFixed(2)} USDT/day</span>
          <span className="w-1 h-1 rounded-full bg-[#525E75]" />
          <span>≈ {(ratePerSecond * 2592000).toFixed(0)} USDT/month</span>
        </div>
      </div>
    </motion.div>
  );
}
