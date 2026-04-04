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
  title: "HashPay — On-Chain Recurring Payroll",
  description: "On-chain recurring payment rails for DAOs, crypto-native teams, and freelancers — powered by HashKey Settlement Protocol on HashKey Chain.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>%E2%9A%A1</text></svg>",
  },
  openGraph: {
    title: "HashPay — On-Chain Recurring Payroll",
    description: "Automated payroll for DAOs and crypto teams. Pay your team on-chain with HSP settlement receipts, EAS attestations, and AI analytics.",
    siteName: "HashPay",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HashPay — On-Chain Recurring Payroll",
    description: "Automated payroll for DAOs and crypto teams on HashKey Chain.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-[#060611] text-white min-h-screen antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
