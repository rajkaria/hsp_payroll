interface ReceiptRow {
  date: string;
  amount: string;
  token: string;
  payrollName: string;
  cycle: number;
  txHash: string;
}

export function generateCSV(rows: ReceiptRow[]): string {
  const header = "Date,Amount,Token,Payroll,Cycle,Transaction Hash\n";
  const body = rows
    .map((r) => `${r.date},${r.amount},${r.token},${r.payrollName},${r.cycle},${r.txHash}`)
    .join("\n");
  return header + body;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
