"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export function DocShell({
  title,
  tagline,
  contract,
  children,
}: {
  title: string;
  tagline: string;
  contract: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#8B5CF6]/[0.05] rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-6 py-12 relative">
        <Link href="/docs" className="inline-flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Docs
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8 pb-10 space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full px-3 py-1">
            {tagline}
          </div>
          <h1 className="text-4xl font-bold font-[family-name:var(--font-space-grotesk)]">{title}</h1>
          <code className="text-[11px] font-mono text-[#5A6178]">{contract}</code>
        </motion.div>

        <article className="doc-body space-y-4 text-[#9BA3B7] leading-relaxed text-sm">
          {children}
        </article>

        <style jsx global>{`
          .doc-body h2 { font-size: 1.25rem; font-weight: 700; margin-top: 2.25rem; margin-bottom: 0.6rem; color: #fff; font-family: var(--font-space-grotesk), system-ui, sans-serif; }
          .doc-body h3 { font-size: 1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.4rem; color: #E6E9F4; }
          .doc-body p { color: #9BA3B7; }
          .doc-body strong { color: #fff; font-weight: 600; }
          .doc-body em { color: #C084FC; font-style: normal; }
          .doc-body ul { list-style: disc; padding-left: 1.25rem; color: #9BA3B7; }
          .doc-body li { margin: 0.3rem 0; }
          .doc-body pre { background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.06); color: #C084FC; padding: 1.1rem 1.25rem; border-radius: 0.75rem; overflow-x: auto; font-size: 0.78rem; margin: 1rem 0; }
          .doc-body code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
          .doc-body :not(pre) > code { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: #C084FC; padding: 0.1rem 0.4rem; border-radius: 0.3rem; }
          .doc-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
          .doc-body th, .doc-body td { padding: 0.6rem 0.75rem; border: 1px solid rgba(255,255,255,0.08); text-align: left; }
          .doc-body th { background: rgba(255,255,255,0.02); color: #9BA3B7; font-weight: 600; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }
          .doc-body a { color: #C084FC; text-decoration: none; border-bottom: 1px solid rgba(192,132,252,0.3); }
          .doc-body a:hover { color: #DDB7FF; border-bottom-color: #DDB7FF; }
        `}</style>
      </div>
    </div>
  );
}
