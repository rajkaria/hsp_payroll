"use client";

import { Zap } from "lucide-react";

export function GaslessBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#10B981]/15 to-[#06B6D4]/10 border border-[#10B981]/20 text-[#34D399] text-xs font-medium">
      <Zap className="w-3 h-3 animate-pulse" />
      Gasless
    </span>
  );
}
