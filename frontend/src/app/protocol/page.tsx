"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Award, CreditCard, Shield, Globe, ArrowRight, ArrowLeft } from "lucide-react";

const PRIMITIVES = [
  {
    icon: Zap,
    name: "Cadence",
    tagline: "How money flows",
    desc: "Recipients pick their payout mode per-payroll: batch, stream, pull, or a hybrid split. One payroll, every cadence.",
    tech: "AdaptiveCadence.sol",
    link: "/docs/cadence",
    accent: "#8B5CF6",
  },
  {
    icon: TrendingUp,
    name: "Yield",
    tagline: "What idle money does",
    desc: "Escrow deposits into ERC-4626 vaults automatically. A 6-month runway becomes 7.2 months.",
    tech: "YieldEscrow.sol",
    link: "/docs/yield",
    accent: "#10B981",
  },
  {
    icon: Award,
    name: "Reputation",
    tagline: "What receipts compose into",
    desc: "Every attestation aggregates into a permissionless proof-of-income primitive. Any protocol can read it.",
    tech: "ReputationRegistry.sol",
    link: "/docs/reputation",
    accent: "#F59E0B",
  },
  {
    icon: CreditCard,
    name: "Advances",
    tagline: "Receipt-backed credit",
    desc: "Borrow against your next payout — reputation-tiered LTV (30/50/70%) and APR. Auto-repaid on cycle execute.",
    tech: "PayrollAdvance.sol",
    link: "/docs/advances",
    accent: "#06B6D4",
  },
  {
    icon: Shield,
    name: "Compliance",
    tagline: "Pluggable gating",
    desc: "KYC, jurisdiction, sanctions, rate limits, timelocks — configurable per-payroll. Compliance as composition.",
    tech: "ComplianceHookRegistry.sol",
    link: "/docs/hooks",
    accent: "#EF4444",
  },
  {
    icon: Globe,
    name: "Salary Index",
    tagline: "Fiat-denominated pay",
    desc: "Quote salaries in INR, USD, EUR. Chainlink oracle resolves to token amount at execute time.",
    tech: "SalaryIndex.sol",
    link: "/docs/salary-index",
    accent: "#0EA5E9",
  },
];

export default function ProtocolPage() {
  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-[#8B5CF6]/[0.06] rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#06B6D4]/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-10 relative">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" /> HashPay
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center space-y-5">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-full px-3 py-1">
            The Income Protocol
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight font-[family-name:var(--font-space-grotesk)]">
            Six primitives.<br />
            <span className="gradient-text">One protocol.</span>
          </h1>
          <p className="text-lg text-[#9BA3B7] max-w-2xl mx-auto">
            HashPay is a stack of composable building blocks that compose into a new category — <em>income protocol</em>.
            Build payroll. Build credit. Build reputation markets. Build whatever&apos;s next.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 py-8">
          {PRIMITIVES.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-7 border border-white/5 hover:border-white/10 transition group"
            >
              <div
                className="inline-flex w-11 h-11 rounded-2xl items-center justify-center mb-4 border"
                style={{ background: `${p.accent}15`, borderColor: `${p.accent}30` }}
              >
                <p.icon className="w-5 h-5" style={{ color: p.accent }} />
              </div>
              <h3 className="text-xl font-bold font-[family-name:var(--font-space-grotesk)]">{p.name}</h3>
              <div className="text-sm text-[#5A6178] mb-3">{p.tagline}</div>
              <p className="text-sm text-[#9BA3B7] mb-4 leading-relaxed">{p.desc}</p>
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <code className="text-[11px] font-mono text-[#5A6178]">{p.tech}</code>
                <Link href={p.link} className="inline-flex items-center gap-1 text-sm font-medium text-[#9BA3B7] group-hover:text-white transition">
                  Docs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-10 border border-white/10 mt-6"
        >
          <div className="text-[10px] uppercase tracking-widest text-[#10B981] font-medium mb-3">Composable</div>
          <h2 className="text-2xl font-bold mb-3 font-[family-name:var(--font-space-grotesk)]">Permissionless by default</h2>
          <p className="text-[#9BA3B7] mb-6 max-w-3xl text-sm">
            Every read function on every primitive is public. Any contract, any wallet, any protocol can compose on top without asking for keys.
          </p>
          <pre className="bg-black/60 border border-white/5 rounded-xl p-5 text-xs overflow-x-auto font-mono">
            <code className="text-[#C084FC]">{`// From any lending protocol, anywhere:
bool eligible = IReputation(HASHPAY_REG).verifyMinimumIncome(
  applicant,
  50_000 * 1e6,  // $50k
  90 days
);
if (eligible) approve(applicant);`}</code>
          </pre>
        </motion.div>
      </div>
    </div>
  );
}
