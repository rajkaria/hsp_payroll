"use client";

import { motion } from "framer-motion";
import { DollarSign, Briefcase, Users, Clock, TrendingUp, Calendar } from "lucide-react";

interface SummaryStats {
  totalPaid: number;
  activePayrolls: number;
  avgCycleCost: number;
  totalEmployees: number;
  runwayMonths: number;
  nextPayout: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  const cards = [
    { icon: DollarSign, label: "Total Paid", value: `$${stats.totalPaid.toLocaleString()}`, color: "#10B981" },
    { icon: Briefcase, label: "Active Payrolls", value: stats.activePayrolls.toString(), color: "#1E5EFF" },
    { icon: TrendingUp, label: "Avg Cycle Cost", value: `$${stats.avgCycleCost.toLocaleString()}`, color: "#8B5CF6" },
    { icon: Users, label: "Employees", value: stats.totalEmployees.toString(), color: "#06B6D4" },
    { icon: Clock, label: "Runway", value: `${stats.runwayMonths} months`, color: "#F59E0B" },
    { icon: Calendar, label: "Next Payout", value: stats.nextPayout, color: "#EF4444" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, i) => (
        <motion.div key={card.label} custom={i} variants={fadeUp} initial="hidden" animate="visible" className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
            <span className="text-[10px] text-[#525E75] uppercase tracking-wider">{card.label}</span>
          </div>
          <div className="font-semibold text-sm font-[family-name:var(--font-space-grotesk)]">{card.value}</div>
        </motion.div>
      ))}
    </div>
  );
}
