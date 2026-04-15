"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Award, CreditCard, Shield, Globe, ArrowRight } from "lucide-react";

const PRIMITIVES = [
  {
    icon: Zap,
    name: "Cadence",
    tagline: "How money flows",
    desc: "Recipients pick their payout mode per-payroll: batch, stream, pull, or a hybrid split. One payroll, every cadence.",
    tech: "AdaptiveCadence.sol",
    link: "/docs/cadence",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    icon: TrendingUp,
    name: "Yield",
    tagline: "What idle money does",
    desc: "Escrow deposits into ERC-4626 vaults automatically. Your 6-month runway becomes 7.2 months.",
    tech: "YieldEscrow.sol",
    link: "/docs/yield",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Award,
    name: "Reputation",
    tagline: "What receipts compose into",
    desc: "Every attestation aggregates into a permissionless proof-of-income primitive. Any protocol can read it.",
    tech: "ReputationRegistry.sol",
    link: "/docs/reputation",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: CreditCard,
    name: "Advances",
    tagline: "Receipt-backed credit",
    desc: "Borrow against your next payout — reputation-tiered LTV (30/50/70%) and APR. Auto-repaid on cycle execute.",
    tech: "PayrollAdvance.sol",
    link: "/docs/advances",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    icon: Shield,
    name: "Compliance",
    tagline: "Pluggable gating",
    desc: "KYC, jurisdiction, sanctions, rate limits, timelocks — configurable per-payroll. Compliance as composition.",
    tech: "ComplianceHookRegistry.sol",
    link: "/docs/hooks",
    gradient: "from-slate-600 to-slate-800",
  },
  {
    icon: Globe,
    name: "Salary Index",
    tagline: "Fiat-denominated pay",
    desc: "Quote salaries in INR, USD, EUR. Chainlink oracle resolves to token amount at execute time.",
    tech: "SalaryIndex.sol",
    link: "/docs/salary-index",
    gradient: "from-sky-500 to-blue-700",
  },
];

export default function ProtocolPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-black dark:via-slate-950 dark:to-indigo-950">
      <div className="max-w-6xl mx-auto p-6 py-16">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">&larr; HashPay</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12 text-center space-y-4">
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            The Income Protocol
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Six primitives.<br />One protocol.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            HashPay is a stack of composable building blocks that compose into a new category — <em>income protocol</em>.
            Build payroll. Build credit. Build reputation markets. Build whatever's next.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 py-12">
          {PRIMITIVES.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-200 dark:border-slate-800 hover:shadow-xl transition"
            >
              <div className={`inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br ${p.gradient} items-center justify-center mb-4`}>
                <p.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">{p.tagline}</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{p.desc}</p>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-gray-500">{p.tech}</code>
                <Link href={p.link} className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                  Docs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-slate-900 dark:bg-black rounded-3xl p-10 text-white">
          <h2 className="text-2xl font-bold mb-4">Permissionless by default</h2>
          <p className="text-slate-300 mb-6">
            Every read function on every primitive is public. Any contract, any wallet, any protocol can compose on top without asking for keys.
          </p>
          <pre className="bg-black rounded-xl p-6 text-sm overflow-x-auto">
            <code>{`// From any lending protocol, anywhere:
bool eligible = IReputation(HASHPAY_REG).verifyMinimumIncome(
  applicant,
  50_000 * 1e6,  // $50k
  90 days
);
if (eligible) approve(applicant);`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
