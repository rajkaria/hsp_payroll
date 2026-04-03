"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, Activity } from "lucide-react";

interface AIAnalysis {
  summary: string;
  runway: { cyclesRemaining: number; estimatedDate: string; recommendation: string };
  anomalies: Array<{ type: string; description: string; severity: "low" | "medium" | "high" }>;
  optimizations: Array<{ title: string; description: string; impact: string }>;
  healthScore: number;
  _meta: { mode: "demo" | "live" };
}

interface Props {
  payrollData: {
    payrollName: string;
    token: string;
    recipientCount: number;
    amountPerCycle: number;
    frequency: string;
    escrowBalance: number;
    cyclesExecuted: number;
  };
}

export function AIIntelligencePanel({ payrollData }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollData),
      });
      const data = await res.json();
      if (data.success) setAnalysis(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/5 via-transparent to-[#C084FC]/3 pointer-events-none" />

      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-space-grotesk)] font-semibold text-sm">AI Payroll Intelligence</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                analysis?._meta.mode === "live"
                  ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20"
                  : "bg-[#8B5CF6]/15 text-[#C084FC] border border-[#8B5CF6]/20"
              }`}>
                {analysis?._meta.mode === "live" ? "AI-Powered" : "Demo"}
              </span>
            </div>
          </div>
          <button onClick={runAnalysis} disabled={loading} className="p-2 text-[#5A6178] hover:text-[#C084FC] transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading && !analysis ? (
          <div className="flex items-center gap-2 py-4 text-[#9BA3B7] text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-[#8B5CF6]" />
            Analyzing payroll data...
          </div>
        ) : analysis ? (
          <>
            {/* Health Score */}
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1C1E3A" strokeWidth="3" />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={analysis.healthScore >= 70 ? "#10B981" : analysis.healthScore >= 40 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="3"
                    strokeDasharray={`${analysis.healthScore}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold">{analysis.healthScore}</span>
                </div>
              </div>
              <p className="text-sm text-[#9BA3B7] flex-1 leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Runway */}
            <div className="flex items-start gap-3 bg-[#0A0B14]/50 rounded-xl p-3.5">
              <TrendingUp className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">
                  {analysis.runway.cyclesRemaining} cycles remaining
                  <span className="text-[#5A6178] font-normal ml-1">
                    (est. {analysis.runway.estimatedDate})
                  </span>
                </p>
                <p className="text-xs text-[#5A6178] mt-0.5">{analysis.runway.recommendation}</p>
              </div>
            </div>

            {/* Anomalies */}
            {analysis.anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#0A0B14]/50 rounded-xl p-3.5">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  a.severity === "high" ? "text-[#EF4444]" : a.severity === "medium" ? "text-[#F59E0B]" : "text-[#06B6D4]"
                }`} />
                <div>
                  <p className="text-sm text-white">{a.description}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${
                    a.severity === "high" ? "bg-[#EF4444]/15 text-[#EF4444]" :
                    a.severity === "medium" ? "bg-[#F59E0B]/15 text-[#F59E0B]" :
                    "bg-[#06B6D4]/15 text-[#06B6D4]"
                  }`}>{a.severity}</span>
                </div>
              </div>
            ))}

            {/* Optimizations */}
            {analysis.optimizations.map((o, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#0A0B14]/50 rounded-xl p-3.5">
                <Lightbulb className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">{o.title}</p>
                  <p className="text-xs text-[#5A6178] mt-0.5">{o.description}</p>
                  <span className="text-[10px] text-[#8B5CF6]">Impact: {o.impact}</span>
                </div>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
