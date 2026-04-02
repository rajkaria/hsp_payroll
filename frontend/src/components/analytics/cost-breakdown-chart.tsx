"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DataPoint {
  name: string;
  amount: number;
  role: string;
}

const COLORS = ["#1E5EFF", "#4B7FFF", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DataPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <div className="text-[#8B95A9] mb-0.5">{d.name}</div>
      <div className="text-white font-semibold">${d.amount.toLocaleString()}/mo</div>
      <div className="text-[#525E75]">{d.role}</div>
    </div>
  );
}

export function CostBreakdownChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold mb-4 font-[family-name:var(--font-space-grotesk)]">
        Cost per Employee
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2340" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#525E75", fontSize: 11 }} axisLine={{ stroke: "#1A2340" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#525E75", fontSize: 10 }} axisLine={{ stroke: "#1A2340" }} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={20}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
