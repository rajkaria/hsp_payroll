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
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const FEATURES = [
  {
    icon: Shield,
    title: "HSP Settlement",
    description:
      "Every payment is routed through HashKey Settlement Protocol with cryptographic receipts for full auditability.",
    color: "#1E5EFF",
    gradient: "from-[#1E5EFF]/20 to-[#1E5EFF]/5",
  },
  {
    icon: Repeat,
    title: "Recurring Automation",
    description:
      "Set payment frequency — weekly, biweekly, or monthly. Execute cycles with a single click when due.",
    color: "#8B5CF6",
    gradient: "from-[#8B5CF6]/20 to-[#8B5CF6]/5",
  },
  {
    icon: Lock,
    title: "Escrow Security",
    description:
      "Funds held in on-chain escrow with transparent balances. Runway tracking shows exactly how long funds last.",
    color: "#10B981",
    gradient: "from-[#10B981]/20 to-[#10B981]/5",
  },
  {
    icon: FileText,
    title: "On-Chain Receipts",
    description:
      "Every payment generates an immutable HSP receipt ID — perfect for compliance, audits, and tax reporting.",
    color: "#06B6D4",
    gradient: "from-[#06B6D4]/20 to-[#06B6D4]/5",
  },
  {
    icon: Users,
    title: "Multi-Recipient",
    description:
      "Pay your entire team in one cycle. Add unlimited recipients with individual amounts per payroll.",
    color: "#F59E0B",
    gradient: "from-[#F59E0B]/20 to-[#F59E0B]/5",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Track payment volume, runway burn rate, and per-employee costs. Generate PDF compliance reports.",
    color: "#EF4444",
    gradient: "from-[#EF4444]/20 to-[#EF4444]/5",
  },
  {
    icon: Zap,
    title: "Gasless Claims",
    description:
      "Employees claim payments without gas fees. Meta-transaction relayers handle gas so your team never needs native tokens.",
    color: "#06B6D4",
    gradient: "from-[#06B6D4]/20 to-[#06B6D4]/5",
  },
  {
    icon: Clock,
    title: "Payment Streaming",
    description:
      "Real-time salary streaming. Employees earn every second with continuous on-chain payment flows.",
    color: "#8B5CF6",
    gradient: "from-[#8B5CF6]/20 to-[#8B5CF6]/5",
  },
  {
    icon: Wallet,
    title: "Multi-Token & Custom",
    description:
      "Support for USDT, USDC, HSK, WETH, and custom ERC-20 tokens. Add any token on HashKey Chain.",
    color: "#1E5EFF",
    gradient: "from-[#1E5EFF]/20 to-[#1E5EFF]/5",
  },
];

const STATS = [
  { value: "< 2s", label: "Settlement Time" },
  { value: "100%", label: "On-Chain" },
  { value: "$0.01", label: "Avg Gas Cost" },
  { value: "24/7", label: "Availability" },
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
    icon: Zap,
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
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#1E5EFF]/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.03] rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass-strong"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E5EFF] to-[#8B5CF6] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
              Hash<span className="gradient-text">Pay</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-[#8B95A9] hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-[#8B95A9] hover:text-white transition-colors">
              How it Works
            </a>
            <ConnectButton />
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-[#8B95A9] mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            Live on HashKey Chain Testnet
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-[family-name:var(--font-space-grotesk)] text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6"
          >
            On-Chain Payroll
            <br />
            <span className="gradient-text">Made Simple</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-[#8B95A9] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Recurring payment rails for DAOs, crypto-native teams, and freelancers.
            Powered by HashKey Settlement Protocol with full audit trails.
          </motion.p>

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
                  className="group px-8 py-3.5 bg-gradient-to-r from-[#1E5EFF] to-[#4B7FFF] text-white rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(30,94,255,0.3)] transition-all duration-300 flex items-center gap-2"
                >
                  Employer Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/employee")}
                  className="px-8 py-3.5 glass text-white rounded-xl font-semibold hover:border-[#1E5EFF]/50 transition-all duration-300"
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
              className="text-sm text-[#525E75]"
            >
              Connect your wallet to get started
            </motion.p>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6"
          >
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="glass rounded-xl p-5"
              >
                <div className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-space-grotesk)] gradient-text">
                  {stat.value}
                </div>
                <div className="text-sm text-[#8B95A9] mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="text-sm font-semibold text-[#1E5EFF] tracking-wider uppercase">
                Features
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold mt-3 mb-4"
            >
              Everything You Need for
              <br />
              <span className="gradient-text">On-Chain Payroll</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-[#8B95A9] max-w-xl mx-auto">
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
                className="group glass rounded-2xl p-6 card-hover cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#8B95A9] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative px-6 py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1E5EFF]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="text-sm font-semibold text-[#8B5CF6] tracking-wider uppercase">
                How it Works
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold mt-3"
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
            className="space-y-6"
          >
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                variants={fadeUp}
                className="group glass rounded-2xl p-6 flex items-start gap-6 card-hover"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#1E5EFF]/20 to-[#8B5CF6]/10 flex items-center justify-center">
                  <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold gradient-text">
                    {item.step}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold mb-1 flex items-center gap-3">
                    {item.title}
                    <item.icon className="w-4 h-4 text-[#8B95A9] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-[#8B95A9] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="glass rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E5EFF]/10 via-transparent to-[#8B5CF6]/10 pointer-events-none" />
            <div className="relative">
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold mb-4">
                Ready to Streamline
                <br />
                Your <span className="gradient-text">Payroll</span>?
              </h2>
              <p className="text-[#8B95A9] mb-8 max-w-md mx-auto">
                Connect your wallet and create your first on-chain payroll in under 2 minutes.
              </p>
              {!isConnected ? (
                <ConnectButton />
              ) : (
                <button
                  onClick={() => router.push("/employer")}
                  className="group px-8 py-3.5 bg-gradient-to-r from-[#1E5EFF] to-[#4B7FFF] text-white rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(30,94,255,0.3)] transition-all duration-300 flex items-center gap-2 mx-auto"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A2340] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#1E5EFF] to-[#8B5CF6] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-semibold">
              HashPay
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#525E75]">
            <span>Built on HashKey Chain</span>
            <span className="w-1 h-1 rounded-full bg-[#525E75]" />
            <span>Powered by HSP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
