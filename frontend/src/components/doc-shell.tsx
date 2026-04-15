"use client";
import Link from "next/link";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-black dark:via-slate-950 dark:to-indigo-950">
      <div className="max-w-3xl mx-auto p-6 py-16">
        <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-900">&larr; Docs</Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-6 pb-10 space-y-2"
        >
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{tagline}</div>
          <h1 className="text-4xl font-bold">{title}</h1>
          <code className="text-xs text-gray-500">{contract}</code>
        </motion.div>
        <article className="doc-body space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          {children}
        </article>
        <style jsx global>{`
          .doc-body h2 { font-size: 1.25rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.5rem; color: #111; }
          .dark .doc-body h2 { color: #fff; }
          .doc-body ul { list-style: disc; padding-left: 1.25rem; }
          .doc-body li { margin: 0.25rem 0; }
          .doc-body pre { background: #0f172a; color: #f1f5f9; padding: 1rem; border-radius: 0.75rem; overflow-x: auto; font-size: 0.8rem; margin: 0.75rem 0; }
          .doc-body code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
          .doc-body table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.85rem; }
          .doc-body th, .doc-body td { padding: 0.5rem; border: 1px solid rgba(0,0,0,0.1); text-align: left; }
          .dark .doc-body th, .dark .doc-body td { border-color: rgba(255,255,255,0.1); }
          .doc-body a { color: #6366f1; }
        `}</style>
      </div>
    </div>
  );
}
