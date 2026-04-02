"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { getBusinessProfile } from "@/lib/business-profile";
import { generatePayrollReport, type PayrollReportData } from "@/lib/generate-report";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface GenerateReportButtonProps {
  payrollName: string;
  cycleCount: number;
  frequency: string;
  tokenSymbol?: string;
  recipients: Array<{ address: string; amount: string }>;
  totalAmount: string;
  size?: "sm" | "md";
}

export function GenerateReportButton({
  payrollName,
  cycleCount,
  frequency,
  tokenSymbol = "USDT",
  recipients,
  totalAmount,
  size = "sm",
}: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    const profile = getBusinessProfile();
    if (!profile) {
      toast.error("Business profile required", {
        description: "Set up your company profile first to generate reports.",
        action: {
          label: "Set Up",
          onClick: () => router.push("/employer/profile"),
        },
      });
      return;
    }

    setLoading(true);
    try {
      const reportData: PayrollReportData = {
        payrollName,
        cycleNumber: cycleCount,
        frequency,
        tokenSymbol,
        recipients: recipients.map((r) => ({
          address: r.address,
          amount: r.amount,
          hspReceiptId: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
          timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        })),
        totalAmount,
        generatedAt: new Date().toLocaleString(),
      };

      await generatePayrollReport(profile, reportData);
      toast.success("Report downloaded");
    } catch (err) {
      toast.error("Failed to generate report");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (size === "sm") {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="p-2 text-[#8B95A9] hover:text-[#1E5EFF] hover:bg-[#1E5EFF]/10 rounded-lg transition-colors disabled:opacity-40"
        title="Generate PDF report"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="px-4 py-2 glass rounded-xl text-sm font-medium hover:border-[#1E5EFF]/30 transition-all flex items-center gap-2 disabled:opacity-40"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      Generate Report
    </button>
  );
}
