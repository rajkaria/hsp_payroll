"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { ConnectButton } from "./connect-button";

export function ConnectGate({
  eyebrow,
  title,
  highlight,
  message,
  features,
  backHref = "/",
  backLabel = "Back to HashPay",
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  message: string;
  features?: { label: string; color: string }[];
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative px-6">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#8B5CF6]/[0.06] rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-[#06B6D4]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-10 text-center relative max-w-md w-full border border-white/5"
      >
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#C084FC]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-[#C084FC]" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full px-3 py-1 mb-4">
          {eyebrow}
        </div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)] mb-2">
          {title} {highlight && <span className="gradient-text">{highlight}</span>}
        </h1>
        <p className="text-sm text-[#9BA3B7] mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        {features && features.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-3 gap-3">
            {features.map((f) => (
              <div key={f.label} className="text-[10px] text-[#9BA3B7] flex items-center gap-1.5 justify-center">
                <span className="inline-block w-1 h-1 rounded-full" style={{ background: f.color }} />
                {f.label}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <button
        onClick={() => router.push(backHref)}
        className="mt-6 text-xs text-[#5A6178] hover:text-white transition flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3 h-3" /> {backLabel}
      </button>
    </div>
  );
}
