import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "HSP Payroll — On-Chain Recurring Payments",
  description: "On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-[#0A0E1A] text-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
