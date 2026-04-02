export function generatePaymentVolume() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const baseValues = [15200, 18400, 17800, 22600, 24100, 28500, 26800, 31200, 34500, 38200, 42100, 45800];
  return months.map((month, i) => ({
    month,
    volume: baseValues[i] + Math.floor(Math.random() * 2000 - 1000),
  }));
}

export function generateBurnRate() {
  const data = [];
  let balance = 120000;
  const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];
  for (let i = 0; i < weeks.length; i++) {
    const burn = 8000 + Math.floor(Math.random() * 3000);
    balance -= burn;
    if (i === 5) balance += 80000; // refill
    data.push({ week: weeks[i], balance: Math.max(balance, 0), burn });
  }
  return data;
}

export function generateCostBreakdown() {
  return [
    { name: "0x7a2F...e91B", amount: 8500, role: "Engineering" },
    { name: "0x3cD1...a4F2", amount: 7200, role: "Engineering" },
    { name: "0x9bE4...d82C", amount: 6800, role: "Design" },
    { name: "0x1fA3...b5D7", amount: 6500, role: "Product" },
    { name: "0x5eC8...f1A9", amount: 5200, role: "Marketing" },
    { name: "0x2dB6...c7E3", amount: 4800, role: "Operations" },
    { name: "0x8aF2...e3B1", amount: 3500, role: "Community" },
    { name: "0x6cE9...d4A8", amount: 2800, role: "Support" },
  ];
}

export function generateSummaryStats() {
  return {
    totalPaid: 345800,
    activePayrolls: 4,
    avgCycleCost: 28817,
    totalEmployees: 23,
    runwayMonths: 3.2,
    nextPayout: "Apr 7, 2026",
  };
}
