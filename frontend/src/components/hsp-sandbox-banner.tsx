"use client";

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";

export function HSPSandboxBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NEXT_PUBLIC_HSP_SANDBOX !== "true" || dismissed) return null;

  return (
    <div className="w-full bg-[#8B5CF6]/10 border-b border-[#8B5CF6]/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#C084FC]">
          <FlaskConical className="w-3.5 h-3.5" />
          <span className="font-medium">HSP Sandbox Mode</span>
          <span className="text-[#5A6178]">&mdash; Settlement flows are simulated. On-chain payroll is fully functional.</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-[#5A6178] hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
