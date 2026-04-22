"use client";

import { ConnectButton } from "@/components/connect-button";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  Repeat,
  FileText,
  Wallet,
  ArrowRight,
  Zap,
  Lock,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  Coins,
  TrendingUp,
} from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";
import { HowItWorksStepper } from "@/components/how-it-works-stepper";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const FEATURES = [
  {
    icon: Shield,
    title: "HSP Settlement",
    description: "Every payment routed through HashKey Settlement Protocol with cryptographic receipts.",
  },
  {
    icon: Repeat,
    title: "Recurring Automation",
    description: "Set weekly, biweekly, or monthly cycles. Execute with a single click when due.",
  },
  {
    icon: Lock,
    title: "Escrow Security",
    description: "Funds held in on-chain escrow with transparent runway tracking.",
  },
  {
    icon: FileText,
    title: "On-Chain Receipts",
    description: "Immutable HSP receipt IDs for compliance, audits, and tax reporting.",
  },
  {
    icon: Users,
    title: "Multi-Recipient",
    description: "Pay your entire team in one cycle with individual amounts per payroll.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Reports",
    description: "Track payment volume, burn rate, and per-employee costs. Download PDF reports.",
  },
];

const STATS = [
  { icon: Zap, value: "2s", label: "Settlement Time" },
  { icon: Shield, value: "100%", label: "On-Chain" },
  { icon: Coins, value: "$0.01", label: "Avg Gas Cost" },
  { icon: Clock, value: "24/7", label: "Availability" },
];


export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  return (
    <div className="relative overflow-hidden">
      {/* Mesh network background */}
      <MeshBackground />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass-strong"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.3)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold tracking-tight">
              Hash<span className="gradient-text">Pay</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hidden sm:block text-sm text-[#9BA3B7] hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hidden sm:block text-sm text-[#9BA3B7] hover:text-white transition-colors">
              How it Works
            </a>
            <a href="/faucet" className="hidden sm:block text-sm text-[#9BA3B7] hover:text-white transition-colors">
              Faucet
            </a>
            <a href="/protocol" className="hidden md:block text-sm text-[#9BA3B7] hover:text-white transition-colors">
              Protocol
            </a>
            <a href="/docs" className="hidden md:block text-sm text-[#9BA3B7] hover:text-white transition-colors">
              Docs
            </a>
            <ConnectButton />
          </div>
        </div>
      </motion.nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm text-[#9BA3B7] mb-10"
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            Live on Sepolia &amp; HashKey Chain
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-[family-name:var(--font-space-grotesk)] text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] mb-7 tracking-tight"
          >
            The Income
            <br />
            <span className="gradient-text">Protocol</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-[#9BA3B7] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Six composable primitives — <strong className="text-white">Cadence, Yield, Reputation, Advances, Compliance, Salary-Index</strong> — that transform payroll
            into a permissionless foundation for DeFi. Built for HashKey Chain.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            {!isConnected ? (
              <div className="flex justify-center w-full">
                <ConnectButton />
              </div>
            ) : (
              <>
                <button
                  onClick={() => router.push("/employer")}
                  className="group px-8 py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-300 flex items-center gap-2"
                >
                  Employer Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/employee")}
                  className="px-8 py-3.5 glass-card text-white rounded-xl font-semibold hover:border-[#8B5CF6]/30 transition-all duration-300"
                >
                  Employee Dashboard
                </button>
              </>
            )}
          </motion.div>

          {!isConnected && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-[#5A6178]"
            >
              Connect your wallet to get started
            </motion.p>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-5"
          >
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="glass-card rounded-2xl p-5 text-center"
              >
                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-space-grotesk)] text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-[#5A6178]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="relative px-6 py-32 z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="text-xs font-semibold text-[#8B5CF6] tracking-[0.2em] uppercase">
                Features
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl md:text-5xl font-bold mt-4 mb-5 tracking-tight"
            >
              Everything You Need for
              <br />
              <span className="gradient-text">On-Chain Payroll</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-[#9BA3B7] max-w-xl mx-auto">
              Built for teams who want transparent, verifiable, and automated payment infrastructure.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                className="group bg-[#0E1025] border border-[#1C1E3A] rounded-2xl p-6 card-hover cursor-default"
              >
                <div className="w-11 h-11 rounded-xl bg-[#0E1025] border border-[#1C1E3A] flex items-center justify-center mb-4 group-hover:border-[#8B5CF6]/30 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] transition-all duration-300">
                  <feature.icon className="w-5 h-5 text-[#9BA3B7] group-hover:text-[#C084FC] transition-colors" />
                </div>
                <h3 className="font-[family-name:var(--font-space-grotesk)] text-base font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#5A6178] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ PROTOCOL PRIMITIVES ═══════════════ */}
      <section id="protocol" className="relative px-6 py-32 z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-xs font-medium text-[#C084FC] tracking-widest uppercase mb-4">
              <Sparkles className="w-3 h-3" /> Six Primitives
            </div>
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
              Not a product. <span className="gradient-text">A protocol.</span>
            </h2>
            <p className="text-[#9BA3B7] max-w-2xl mx-auto">
              Every primitive is a standalone on-chain contract. Compose them into payroll — or into anything else.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Cadence", tag: "How money flows", desc: "Batch, stream, pull, or hybrid — recipient's choice.", href: "/docs/cadence" },
              { name: "Yield", tag: "What idle money does", desc: "ERC-4626 auto-deposit. Runway extends itself.", href: "/docs/yield" },
              { name: "Reputation", tag: "Receipts compose", desc: "Permissionless on-chain proof-of-income.", href: "/docs/reputation" },
              { name: "Advances", tag: "Receipt-backed credit", desc: "Borrow up to 70% of next payout, reputation-tiered APR.", href: "/docs/advances" },
              { name: "Compliance", tag: "Pluggable gating", desc: "KYC, jurisdiction, sanctions, timelock, rate limits.", href: "/docs/hooks" },
              { name: "Salary Index", tag: "Fiat-denominated pay", desc: "Quote salary in ₹, $, €. Oracle resolves at execute time.", href: "/docs/salary-index" },
            ].map((p, i) => (
              <motion.a
                key={p.name}
                href={p.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="glass-card p-6 rounded-2xl block hover:border-[#8B5CF6]/50 transition-all group"
              >
                <div className="text-xs font-medium text-[#C084FC] uppercase tracking-widest mb-2">{p.tag}</div>
                <div className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold mb-2">{p.name}</div>
                <div className="text-sm text-[#9BA3B7] mb-4">{p.desc}</div>
                <div className="text-xs text-[#8B5CF6] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read docs <ArrowRight className="w-3 h-3" />
                </div>
              </motion.a>
            ))}
          </div>
          <div className="text-center mt-12">
            <a href="/protocol" className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-card text-sm font-medium hover:border-[#8B5CF6]/50 transition-all">
              Explore the full protocol <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="relative px-6 py-32 z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold text-[#8B5CF6] tracking-[0.2em] uppercase">
              How it Works
            </span>
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl md:text-5xl font-bold mt-4 tracking-tight">
              Four Steps to
              <br />
              <span className="gradient-text">Automated Payroll</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <HowItWorksStepper />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="relative px-6 py-32 z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="glass-card rounded-3xl p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/8 via-transparent to-[#C084FC]/5 pointer-events-none" />
            <div className="relative">
              <Sparkles className="w-6 h-6 text-[#C084FC] mx-auto mb-5 animate-sparkle" />
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
                Ready to Streamline
                <br />
                Your <span className="gradient-text">Payroll</span>?
              </h2>
              <p className="text-[#9BA3B7] mb-8 max-w-md mx-auto">
                Connect your wallet and create your first on-chain payroll in under 2 minutes.
              </p>
              {!isConnected ? (
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              ) : (
                <button
                  onClick={() => router.push("/employer")}
                  className="group px-8 py-3.5 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-300 flex items-center gap-2 mx-auto"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="relative z-10 border-t border-[#1C1E3A] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-semibold">
              HashPay
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#5A6178]">
            <span>Built on HashKey Chain</span>
            <span className="w-1 h-1 rounded-full bg-[#5A6178]" />
            <span>Powered by HSP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
