"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint {
  week: string;
  balance: number;
  burn: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <div className="text-[#8B95A9] mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="text-[#525E75]">{p.dataKey === "balance" ? "Balance" : "Burn"}:</span>
          <span className="text-white font-semibold">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function BurnRateChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold mb-4 font-[family-name:var(--font-space-grotesk)]">
        Escrow Runway
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2340" />
            <XAxis dataKey="week" tick={{ fill: "#525E75", fontSize: 11 }} axisLine={{ stroke: "#1A2340" }} />
            <YAxis tick={{ fill: "#525E75", fontSize: 11 }} axisLine={{ stroke: "#1A2340" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2} fill="url(#balanceGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
