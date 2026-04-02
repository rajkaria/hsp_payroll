"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint {
  month: string;
  volume: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <div className="text-[#8B95A9] mb-0.5">{label}</div>
      <div className="text-white font-semibold">${payload[0].value.toLocaleString()}</div>
    </div>
  );
}

export function PaymentVolumeChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-sm font-semibold mb-4 font-[family-name:var(--font-space-grotesk)]">
        Payment Volume
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2340" />
            <XAxis dataKey="month" tick={{ fill: "#525E75", fontSize: 11 }} axisLine={{ stroke: "#1A2340" }} />
            <YAxis tick={{ fill: "#525E75", fontSize: 11 }} axisLine={{ stroke: "#1A2340" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="volume" stroke="#1E5EFF" strokeWidth={2} dot={{ fill: "#1E5EFF", r: 3 }} activeDot={{ r: 5, fill: "#4B7FFF" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
