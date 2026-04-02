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
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  Timer,
  Coins,
  TrendingUp,
} from "lucide-react";
import { MeshBackground } from "@/components/mesh-background";

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
  {
    icon: Zap,
    title: "Gasless Claims",
    description: "Employees claim payments without gas fees via ERC-2771 meta-transactions.",
  },
  {
    icon: Timer,
    title: "Payment Streaming",
    description: "Real-time salary streaming. Employees earn every second continuously.",
  },
  {
    icon: Coins,
    title: "Multi-Token & Custom",
    description: "USDT, USDC, HSK, WETH, and custom ERC-20 tokens on HashKey Chain.",
  },
];

const STATS = [
  { icon: Zap, value: "2s", label: "Settlement Time" },
  { icon: Shield, value: "100%", label: "On-Chain" },
  { icon: Coins, value: "$0.01", label: "Avg Gas Cost" },
  { icon: Clock, value: "24/7", label: "Availability" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create Payroll",
    description: "Set up a payroll with recipients, amounts, and payment frequency.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Fund Escrow",
    description: "Deposit USDT into the smart contract escrow with one approval.",
    icon: Lock,
  },
  {
    step: "03",
    title: "Execute Cycles",
    description: "Trigger payments when due. Each cycle distributes to all recipients.",
    icon: Repeat,
  },
  {
    step: "04",
    title: "Verify & Export",
    description: "Every payment has an HSP receipt. Export history as CSV anytime.",
    icon: CheckCircle2,
  },
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
            <span className="hidden sm:block text-sm text-[#5A6178] cursor-default">
              Pricing
            </span>
            <span className="hidden md:block text-sm text-[#5A6178] cursor-default">
              Documentation
            </span>
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
            Live on HashKey Chain Testnet
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-[family-name:var(--font-space-grotesk)] text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] mb-7 tracking-tight"
          >
            On-Chain Payroll
            <br />
            <span className="gradient-text">Made Simple</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-[#9BA3B7] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Recurring payment rails for DAOs, crypto-native teams, and freelancers.
            Powered by HashKey Settlement Protocol with full audit trails.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            {!isConnected ? (
              <ConnectButton />
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
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                variants={fadeUp}
                className="group glass-card rounded-2xl p-6 card-hover cursor-default"
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

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="relative px-6 py-32 z-10">
        <div className="max-w-3xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="text-xs font-semibold text-[#8B5CF6] tracking-[0.2em] uppercase">
                How it Works
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl md:text-5xl font-bold mt-4 tracking-tight"
            >
              Four Steps to
              <br />
              <span className="gradient-text">Automated Payroll</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="relative"
          >
            {/* Vertical timeline line */}
            <div className="absolute left-7 top-8 bottom-8 w-px bg-gradient-to-b from-[#8B5CF6]/40 via-[#8B5CF6]/20 to-transparent hidden sm:block" />

            <div className="space-y-5">
              {HOW_IT_WORKS.map((item, i) => (
                <motion.div
                  key={item.step}
                  custom={i}
                  variants={fadeUp}
                  className="group glass-card rounded-2xl p-6 flex items-start gap-5 card-hover relative"
                >
                  {/* Step number */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#0E1025] border border-[#1C1E3A] flex items-center justify-center relative z-10 group-hover:border-[#8B5CF6]/30 transition-all">
                    <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold gradient-text">
                      {item.step}
                    </span>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold mb-1.5 flex items-center gap-3">
                      {item.title}
                      <item.icon className="w-4 h-4 text-[#5A6178] group-hover:text-[#C084FC] transition-colors" />
                    </h3>
                    <p className="text-sm text-[#5A6178] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
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
                <ConnectButton />
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
