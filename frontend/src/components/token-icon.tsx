"use client";

interface TokenIconProps {
  symbol: string;
  color: string;
  icon: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { wrapper: "w-5 h-5", text: "text-[10px]" },
  md: { wrapper: "w-7 h-7", text: "text-xs" },
  lg: { wrapper: "w-9 h-9", text: "text-sm" },
};

export function TokenIcon({ color, icon, size = "sm" }: TokenIconProps) {
  const s = sizes[size];
  return (
    <div
      className={`${s.wrapper} rounded-full flex items-center justify-center flex-shrink-0 font-bold ${s.text}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {icon}
    </div>
  );
}
