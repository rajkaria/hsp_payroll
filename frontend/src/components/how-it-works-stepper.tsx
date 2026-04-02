"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Lock, Repeat, CheckCircle2, ArrowRight, ChevronRight } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Create Payroll",
    description: "Set up a payroll with recipients, wallet addresses, payment amounts, and choose your frequency — weekly, biweekly, monthly, or streaming.",
    detail: "The smart contract stores your payroll configuration on-chain. Recipients are immediately registered and can view pending payments.",
    icon: Wallet,
    color: "#8B5CF6",
  },
  {
    step: "02",
    title: "Fund Escrow",
    description: "Deposit USDT (or any supported token) into the on-chain escrow smart contract with a single token approval.",
    detail: "Funds are held securely in the PayrollFactory contract. You can track your runway — how many cycles your balance covers — in real time.",
    icon: Lock,
    color: "#C084FC",
  },
  {
    step: "03",
    title: "Execute Cycles",
    description: "When a payment cycle is due, trigger it with one click. The contract distributes funds to every recipient simultaneously.",
    detail: "Each payment is routed through the HSP Adapter, generating a unique settlement receipt. Gas costs are minimal on HashKey Chain.",
    icon: Repeat,
    color: "#10B981",
  },
  {
    step: "04",
    title: "Verify & Export",
    description: "Every payment has an immutable HSP receipt ID on-chain. Employees can view their full payment history and export CSV reports.",
    detail: "Employers can generate PDF compliance reports with company headers. All data is verifiable on the HashKey Chain block explorer.",
    icon: CheckCircle2,
    color: "#06B6D4",
  },
];

export function HowItWorksStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setAutoPlay(false);
  };

  const current = STEPS[activeStep];

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8">
      {/* Step selector - left column */}
      <div className="flex lg:flex-col gap-2">
        {STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          return (
            <button
              key={step.step}
              onClick={() => handleStepClick(i)}
              className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-300 flex-1 lg:flex-none ${
                isActive
                  ? "glass-card border-[#8B5CF6]/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              {/* Progress fill */}
              {isActive && autoPlay && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#8B5CF6]/10 to-transparent"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 4, ease: "linear" }}
                  key={activeStep}
                />
              )}

              <div
                className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                    : isPast
                      ? "bg-[#8B5CF6]/20 border border-[#8B5CF6]/30"
                      : "bg-[#0E1025] border border-[#1C1E3A]"
                }`}
              >
                {isPast ? (
                  <CheckCircle2 className="w-4 h-4 text-[#C084FC]" />
                ) : (
                  <span className={`font-[family-name:var(--font-space-grotesk)] text-xs font-bold ${isActive ? "text-white" : "text-[#5A6178]"}`}>
                    {step.step}
                  </span>
                )}
              </div>

              <div className="relative z-10 hidden lg:block">
                <div className={`text-sm font-medium transition-colors ${isActive ? "text-white" : "text-[#5A6178]"}`}>
                  {step.title}
                </div>
              </div>

              {/* Connector line between steps */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute left-[30px] top-[52px] w-px h-[8px] bg-[#1C1E3A]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content - right column */}
      <div className="relative min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card rounded-2xl p-8 h-full"
          >
            <div className="flex items-start gap-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${current.color}15`, boxShadow: `0 0 20px ${current.color}15` }}
              >
                <current.icon className="w-7 h-7" style={{ color: current.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold gradient-text">
                    Step {current.step}
                  </span>
                  <ChevronRight className="w-3 h-3 text-[#5A6178]" />
                  <h3 className="font-[family-name:var(--font-space-grotesk)] text-xl font-semibold">
                    {current.title}
                  </h3>
                </div>
                <p className="text-[#9BA3B7] leading-relaxed mb-4">
                  {current.description}
                </p>
                <div className="glass rounded-xl p-4">
                  <p className="text-sm text-[#5A6178] leading-relaxed">
                    {current.detail}
                  </p>
                </div>
              </div>
            </div>

            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleStepClick(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeStep ? "w-8 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC]" : "w-1.5 bg-[#1C1E3A] hover:bg-[#2A2D52]"
                  }`}
                />
              ))}
            </div>

            {/* Next step button */}
            {activeStep < STEPS.length - 1 && (
              <button
                onClick={() => handleStepClick(activeStep + 1)}
                className="absolute bottom-8 right-8 flex items-center gap-1.5 text-xs text-[#5A6178] hover:text-[#C084FC] transition-colors"
              >
                Next: {STEPS[activeStep + 1].title}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
