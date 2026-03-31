"use client";

import { downloadCSV, generateCSV } from "@/lib/csv";

interface CSVExportProps {
  receipts: Array<{
    date: string;
    amount: string;
    token: string;
    payrollName: string;
    cycle: number;
    txHash: string;
  }>;
}

export function CSVExport({ receipts }: CSVExportProps) {
  const handleExport = () => {
    const csv = generateCSV(receipts);
    downloadCSV(csv, `hsp-payroll-receipts-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={receipts.length === 0}
      className="px-4 py-2 bg-[#111827] border border-[#1F2937] text-white rounded-lg text-sm font-medium hover:bg-[#1F2937] transition disabled:opacity-50"
    >
      Export CSV
    </button>
  );
}
