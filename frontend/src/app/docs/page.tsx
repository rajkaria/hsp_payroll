"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Zap, BookOpen, Code2, Shield, Layers, Wallet, FileText, Terminal,
  ExternalLink, Copy, Check, GitBranch, Box, Users, BarChart3, Lock, PlayCircle,
  Brain, Droplets, CheckCircle2, Repeat, ArrowRight,
} from "lucide-react";

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "quickstart", label: "Quick Start", icon: PlayCircle },
  { id: "guide", label: "User Guide", icon: ArrowRight },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "contracts", label: "Smart Contracts", icon: Code2 },
  { id: "hsp", label: "HSP Protocol", icon: Shield },
  { id: "eas", label: "EAS Attestations", icon: CheckCircle2 },
  { id: "ai", label: "AI Intelligence", icon: Brain },
  { id: "features", label: "All Features", icon: Zap },
  { id: "api", label: "Contract API", icon: FileText },
  { id: "setup", label: "Developer Setup", icon: Terminal },
  { id: "network", label: "Network Info", icon: GitBranch },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative group rounded-xl overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0A0B14] border-b border-[#1C1E3A]">
        <span className="text-[10px] text-[#5A6178] uppercase tracking-wider">{language}</span>
        <button onClick={handleCopy} className="text-[#5A6178] hover:text-white transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 bg-[#08090F] overflow-x-auto text-sm font-mono text-[#9BA3B7] leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-[#8B5CF6]" />
        </div>
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">{title}</h2>
      </div>
      <div className="text-[#9BA3B7] leading-relaxed space-y-4">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 my-5">
      <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-bold gradient-text">{n}</span>
      </div>
      <div className="flex-1">
        <h4 className="text-white font-semibold mb-1">{title}</h4>
        <div className="text-sm text-[#9BA3B7] space-y-2">{children}</div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-8">
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-6">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </button>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold">HashPay Docs</span>
            </div>
            <nav className="space-y-1">
              {NAV_SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${activeSection === s.id ? "bg-[#8B5CF6]/10 text-white border border-[#8B5CF6]/20" : "text-[#5A6178] hover:text-[#9BA3B7] hover:bg-white/[0.02]"}`}>
                  <s.icon className="w-3.5 h-3.5" />{s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 max-w-3xl">
          {/* Mobile nav */}
          <div className="lg:hidden mb-6">
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </button>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
              {NAV_SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} onClick={() => setActiveSection(s.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-all ${activeSection === s.id ? "bg-[#8B5CF6]/10 text-white border border-[#8B5CF6]/20" : "text-[#5A6178]"}`}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold mb-3 tracking-tight">
              Hash<span className="gradient-text">Pay</span> Documentation
            </h1>
            <p className="text-[#5A6178]">Complete guide to the on-chain recurring payroll platform on HashKey Chain.</p>
          </motion.div>

          {/* ════════════ OVERVIEW ════════════ */}
          <Section id="overview" title="Overview" icon={BookOpen}>
            <p>HashPay is a production-grade on-chain payroll platform built on HashKey Chain (OP Stack L2). It enables DAOs, crypto-native teams, and freelancers to create automated, recurring payrolls with cryptographic settlement receipts, EAS on-chain attestations, and AI-powered analytics.</p>
            <div className="grid sm:grid-cols-3 gap-3 my-6">
              {[
                { label: "Chain", value: "Testnet (133) + Mainnet (177)", icon: GitBranch },
                { label: "Contracts", value: "4 Solidity contracts", icon: Code2 },
                { label: "Tests", value: "115 passing", icon: CheckCircle2 },
              ].map((item) => (
                <div key={item.label} className="glass-card rounded-xl p-4">
                  <item.icon className="w-4 h-4 text-[#8B5CF6] mb-2" />
                  <div className="text-xs text-[#5A6178]">{item.label}</div>
                  <div className="text-sm font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>
            <h3 className="text-white font-semibold mt-6 mb-3">All Pages</h3>
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#1C1E3A]">
                  <th className="text-left py-2.5 px-4 text-[#5A6178] text-xs uppercase tracking-wider">Route</th>
                  <th className="text-left py-2.5 px-4 text-[#5A6178] text-xs uppercase tracking-wider">Description</th>
                </tr></thead>
                <tbody className="text-xs">
                  {[
                    ["/", "Landing page — animated mesh background, features showcase, interactive stepper"],
                    ["/employer", "Employer dashboard — view all payrolls, execute cycles, pay via HSP, generate reports"],
                    ["/employer/create", "Create payroll — multi-step wizard with templates, token selector, frequency picker"],
                    ["/employer/analytics", "Analytics — payment volume charts, burn rate, cost breakdown, AI intelligence panel"],
                    ["/employer/profile", "Business profile — company details stored locally for PDF compliance reports"],
                    ["/employee", "Employee dashboard — payment history, streaming balance counter, gasless claims, fiat conversion"],
                    ["/faucet", "Token faucet — mint 1K/10K/100K testnet USDT with one click, auto-refreshing balance"],
                    ["/verify", "Payment verification — paste EAS attestation UID to verify any payment on-chain"],
                    ["/docs", "Documentation — this page"],
                  ].map(([route, desc]) => (
                    <tr key={route} className="border-b border-[#1C1E3A]/50">
                      <td className="py-2.5 px-4 font-mono text-[#8B5CF6]">{route}</td>
                      <td className="py-2.5 px-4 text-[#9BA3B7]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ════════════ QUICK START ════════════ */}
          <Section id="quickstart" title="Quick Start (2 Minutes)" icon={PlayCircle}>
            <p className="text-white font-medium">Get from zero to your first payroll in 5 steps:</p>
            <Step n="1" title="Get Testnet Tokens">
              <p>Visit the <a href="https://www.hashkeychain.net/faucet" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#C084FC]">HashKey Chain Faucet</a> to get HSK for gas fees. Then go to <a href="/faucet" className="text-[#8B5CF6] hover:text-[#C084FC]">/faucet</a> and mint Mock USDT (click 10,000 USDT and confirm in wallet).</p>
            </Step>
            <Step n="2" title="Connect Wallet">
              <p>Go to <a href="/" className="text-[#8B5CF6] hover:text-[#C084FC]">hashpay.tech</a> and click Connect Wallet. Add HashKey Chain Testnet to your wallet if prompted (Chain ID: 133, RPC: https://testnet.hsk.xyz).</p>
            </Step>
            <Step n="3" title="Create a Payroll">
              <p>Click Employer Dashboard, then Create Payroll. Use the &quot;Quick Test&quot; template for a 5-minute cycle, or fill in manually. Add recipient wallet addresses and amounts, then confirm the transaction.</p>
            </Step>
            <Step n="4" title="Fund the Escrow">
              <p>After creating the payroll, fund the escrow: first approve USDT spending, then deposit funds. The runway indicator shows how many cycles your deposit covers.</p>
            </Step>
            <Step n="5" title="Execute a Cycle">
              <p>Once the cycle period elapses (5 minutes for test), click Execute Cycle on your payroll card. All recipients receive their payments simultaneously via HSP settlement. View the transaction on the block explorer.</p>
            </Step>
          </Section>

          {/* ════════════ USER GUIDE ════════════ */}
          <Section id="guide" title="Detailed User Guide" icon={ArrowRight}>
            <h3 className="text-white font-semibold text-lg mt-2 mb-3">Employer Flow</h3>

            <h4 className="text-white font-medium mt-6 mb-2">Creating a Payroll</h4>
            <p>Navigate to <span className="font-mono text-[#8B5CF6] text-xs">/employer/create</span>. The 3-step wizard guides you through:</p>
            <ul className="list-none space-y-2 my-3">
              <li className="flex items-start gap-2"><span className="text-[#8B5CF6] font-bold text-xs mt-1">1.</span><span><strong className="text-white">Details</strong> — Enter a payroll name, select a token (USDT default, or add a custom ERC-20 by pasting its contract address), and choose frequency (Weekly, Biweekly, Monthly, Test 5min, or Streaming preview). Use a template to pre-fill common configurations.</span></li>
              <li className="flex items-start gap-2"><span className="text-[#8B5CF6] font-bold text-xs mt-1">2.</span><span><strong className="text-white">Recipients</strong> — Add wallet addresses and individual payment amounts. The total per cycle is calculated automatically. Add or remove recipients as needed.</span></li>
              <li className="flex items-start gap-2"><span className="text-[#8B5CF6] font-bold text-xs mt-1">3.</span><span><strong className="text-white">Fund Escrow</strong> — First approve the token contract to spend your USDT (one-time per amount), then deposit funds into the on-chain escrow. The runway indicator shows how many cycles your deposit covers.</span></li>
            </ul>

            <h4 className="text-white font-medium mt-6 mb-2">Payroll Templates</h4>
            <p>Four built-in templates speed up payroll creation:</p>
            <div className="grid grid-cols-2 gap-3 my-3">
              {[
                { name: "Engineering Team", desc: "3 recipients, monthly, $8K/$7.5K/$6K" },
                { name: "Contractor Weekly", desc: "2 recipients, weekly, $2K/$1.5K" },
                { name: "Design Team", desc: "2 recipients, biweekly, $5K/$4.5K" },
                { name: "Quick Test", desc: "1 recipient, 5-min cycle, $100" },
              ].map((t) => (
                <div key={t.name} className="glass rounded-xl p-3">
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-[#5A6178]">{t.desc}</div>
                </div>
              ))}
            </div>

            <h4 className="text-white font-medium mt-6 mb-2">Managing Payrolls</h4>
            <p>The employer dashboard (<span className="font-mono text-[#8B5CF6] text-xs">/employer</span>) shows all your payrolls as cards with real-time stats: recipients, per-cycle cost, escrow balance (with USD equivalent), runway, completed cycles, and total paid. Each card has:</p>
            <ul className="list-disc list-inside text-sm space-y-1 my-3">
              <li><strong className="text-white">Execute Cycle</strong> — triggers payment distribution to all recipients (enabled when the cycle period has elapsed)</li>
              <li><strong className="text-white">Pay via HSP</strong> — initiates payment through HashKey Settlement Protocol checkout (demo mode available)</li>
              <li><strong className="text-white">Generate Report</strong> — downloads a PDF compliance report (requires business profile setup)</li>
              <li><strong className="text-white">View on Explorer</strong> — links to the transaction on HashKey Chain block explorer after execution</li>
            </ul>

            <h4 className="text-white font-medium mt-6 mb-2">Business Profile &amp; Compliance Reports</h4>
            <p>Go to <span className="font-mono text-[#8B5CF6] text-xs">/employer/profile</span> to enter your company details (name, registration number, address, country, email). This data is stored in your browser&apos;s localStorage and used to generate PDF compliance reports. Click the report icon on any payroll card to download a PDF with your company header, payment table, HSP receipt IDs, and totals.</p>

            <h4 className="text-white font-medium mt-6 mb-2">Analytics Dashboard</h4>
            <p>The analytics page (<span className="font-mono text-[#8B5CF6] text-xs">/employer/analytics</span>) provides:</p>
            <ul className="list-disc list-inside text-sm space-y-1 my-3">
              <li><strong className="text-white">Summary cards</strong> — total paid, active payrolls, average cycle cost, total employees, runway, next payout</li>
              <li><strong className="text-white">Payment volume chart</strong> — monthly payment trends over 12 months</li>
              <li><strong className="text-white">Escrow runway chart</strong> — escrow balance over time with refill indicators</li>
              <li><strong className="text-white">Cost breakdown</strong> — per-employee compensation bars</li>
              <li><strong className="text-white">AI Intelligence panel</strong> — health score, runway prediction, anomaly detection, optimization tips (demo mode, or powered by Claude API when configured)</li>
            </ul>

            <h3 className="text-white font-semibold text-lg mt-10 mb-3">Employee Flow</h3>
            <p>Connect a wallet that is a recipient of an active payroll and visit <span className="font-mono text-[#8B5CF6] text-xs">/employee</span>. The dashboard shows:</p>
            <ul className="list-disc list-inside text-sm space-y-1 my-3">
              <li><strong className="text-white">Streaming balance counter</strong> — live-ticking counter showing accumulated earnings (preview mode with mock data)</li>
              <li><strong className="text-white">Exchange rate bar</strong> — real-time USD and HKD conversion for USDT amounts</li>
              <li><strong className="text-white">Payment history table</strong> — all payments received with date, amount, cycle number, HSP receipt ID, and settlement status</li>
              <li><strong className="text-white">CSV export</strong> — download full payment history as CSV for accounting and tax filing</li>
              <li><strong className="text-white">Gasless claims</strong> — preview of ERC-2771 meta-transaction claiming (coming soon)</li>
              <li><strong className="text-white">Withdraw to bank</strong> — preview of fiat off-ramp with HKD conversion (coming soon)</li>
            </ul>

            <h3 className="text-white font-semibold text-lg mt-10 mb-3">Token Faucet</h3>
            <p>Visit <span className="font-mono text-[#8B5CF6] text-xs">/faucet</span> to mint free testnet USDT. Connect your wallet, select an amount (1K, 10K, or 100K), and confirm the transaction. Your balance updates automatically after minting. You also need HSK for gas — get it from the <a href="https://www.hashkeychain.net/faucet" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#C084FC]">HashKey Chain Faucet</a>.</p>

            <h3 className="text-white font-semibold text-lg mt-10 mb-3">Payment Verification</h3>
            <p>Visit <span className="font-mono text-[#8B5CF6] text-xs">/verify</span> and paste an EAS attestation UID to independently verify any HashPay payment on-chain. The page decodes and displays: payroll ID, cycle number, employer address, recipient address, amount, token, HSP receipt ID, and attestation timestamp. No wallet connection required — anyone can verify.</p>
          </Section>

          {/* ════════════ ARCHITECTURE ════════════ */}
          <Section id="architecture" title="Architecture" icon={Layers}>
            <CodeBlock language="text" code={`┌──────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 + wagmi v2 + RainbowKit)              │
│  ├── Employer: create, fund, execute, attest, analyze        │
│  ├── Employee: history, streaming, CSV, gasless claims       │
│  ├── API Routes: /api/ai/analyze, /api/hsp/create-order     │
│  └── Pages: faucet, verify, docs, analytics, profile         │
├──────────────────────────────────────────────────────────────┤
│  Smart Contracts (Solidity 0.8.24)                           │
│  ├── PayrollFactory  — payroll CRUD, escrow, cycle execution │
│  ├── HSPAdapter      — settlement request lifecycle          │
│  ├── PayrollAttestor — EAS attestation creation              │
│  └── MockERC20       — testnet token (6 decimals)            │
├──────────────────────────────────────────────────────────────┤
│  HashKey Chain (OP Stack L2)                                 │
│  ├── EAS predeploy   — 0x4200...0021 (attestations)          │
│  ├── SchemaRegistry  — 0x4200...0020 (schemas)               │
│  └── ~2s blocks, ~$0.01 gas, EVM compatible                  │
└──────────────────────────────────────────────────────────────┘`} />
            <p>The system is three layers: a React frontend communicating with 4 Solidity contracts deployed on HashKey Chain. The HSPAdapter handles payment settlement lifecycle, the PayrollAttestor creates EAS attestations, and server-side API routes handle AI analysis and HSP payment order creation.</p>
          </Section>

          {/* ════════════ SMART CONTRACTS ════════════ */}
          <Section id="contracts" title="Smart Contracts" icon={Code2}>
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-[#8B5CF6]" />PayrollFactory.sol</h3>
                <p className="text-sm">Core contract managing the entire payroll lifecycle. Creates payrolls with multiple recipients, handles USDT escrow deposits, executes payment cycles that distribute funds to all recipients simultaneously, and stores immutable payment receipts with HSP request IDs.</p>
                <CodeBlock language="solidity" code={`// Write functions
createPayroll(name, token, recipients[], amounts[], frequency) → payrollId
fundPayroll(payrollId, amount)        // deposit tokens to escrow
executeCycle(payrollId)               // pay all recipients + create HSP receipts
cancelPayroll(payrollId)              // cancel + refund remaining escrow
withdrawExcess(payrollId, amount)     // withdraw unused escrow funds
addRecipient(payrollId, recipient, amount)
removeRecipient(payrollId, recipientIndex)

// View functions
getPayrollDetails(payrollId) → (owner, token, name, recipients[], amounts[],
    frequency, startTime, lastExecuted, cycleCount, totalDeposited, totalPaid, active)
getReceipts(payrollId, cycleNumber) → Receipt[]
getRunway(payrollId) → uint256 cyclesRemaining
getRecipientPayrolls(address) → uint256[] payrollIds`} />
              </div>

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-[#10B981]" />HSPAdapter.sol</h3>
                <p className="text-sm">Settlement protocol message layer implementing the HashKey Settlement Protocol. Manages the full payment request lifecycle: creation, confirmation, settlement, and cancellation. Generates unique bytes32 request IDs for each payment.</p>
                <CodeBlock language="solidity" code={`createPaymentRequest(payer, recipient, token, amount) → bytes32 requestId
confirmPayment(requestId)                // Pending → Confirmed
markSettled(requestId)                   // Confirmed → Settled
cancelPayment(requestId)                // Pending → Cancelled
getRequest(requestId) → PaymentRequest
createBatchRequests(payer, recipients[], token, amounts[]) → bytes32[]`} />
              </div>

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#06B6D4]" />PayrollAttestor.sol</h3>
                <p className="text-sm">Creates permanent on-chain attestations via the Ethereum Attestation Service (EAS). After a payroll cycle is executed, call attestCycle to create one attestation per recipient. Attestations are non-revocable — they serve as permanent proof that a payment occurred.</p>
                <CodeBlock language="solidity" code={`registerSchema() → bytes32 schemaUID     // call once after deployment
attestCycle(payrollId, cycleNumber, employer, token, tokenSymbol) → bytes32[] uids
attestSingle(payrollId, cycleNumber, employer, recipient, amount, token, hspRequestId, tokenSymbol) → bytes32 uid

// Schema: bytes32 payrollId, uint256 cycleNumber, address employer,
//         address recipient, uint256 amount, address token,
//         bytes32 hspRequestId, string tokenSymbol`} />
              </div>

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Wallet className="w-4 h-4 text-[#F59E0B]" />MockERC20.sol</h3>
                <p className="text-sm">Test ERC-20 token simulating USDT with 6 decimals. Has a public <span className="font-mono text-xs">mint(address, amount)</span> function so anyone can mint tokens on testnet. Used for demo purposes.</p>
              </div>
            </div>

            <h3 className="text-white font-semibold mt-8 mb-3">Deployed Addresses (HashKey Testnet)</h3>
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#1C1E3A]">
                  <th className="text-left py-3 px-4 text-[#5A6178] text-xs uppercase tracking-wider">Contract</th>
                  <th className="text-left py-3 px-4 text-[#5A6178] text-xs uppercase tracking-wider">Address</th>
                </tr></thead>
                <tbody className="font-mono text-xs">
                  {[
                    ["PayrollFactory", "0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb"],
                    ["HSPAdapter", "0xa31558b2c364B269Ac823798AefcA7E285Af3487"],
                    ["Mock USDT", "0xcd367c583fd028C12Cc038d744cE7B2a67d848E2"],
                    ["PayrollAttestor", "0x5F6b5EB4f444d6aCc4F7829660a7C920399253Cf"],
                    ["EAS (predeploy)", "0x4200000000000000000000000000000000000021"],
                    ["SchemaRegistry", "0x4200000000000000000000000000000000000020"],
                  ].map(([name, addr]) => (
                    <tr key={name} className="border-b border-[#1C1E3A]/50">
                      <td className="py-3 px-4 text-white">{name}</td>
                      <td className="py-3 px-4 text-[#8B5CF6]">{addr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ════════════ HSP ════════════ */}
          <Section id="hsp" title="HSP Protocol Integration" icon={Shield}>
            <p>HashPay integrates with the HashKey Settlement Protocol at two levels: on-chain via the HSPAdapter smart contract, and off-chain via the HSP REST API.</p>

            <h3 className="text-white font-semibold mt-6 mb-3">On-Chain Settlement (HSPAdapter)</h3>
            <p>Every time executeCycle is called, the PayrollFactory creates batch payment requests through HSPAdapter. Each payment goes through a 3-step lifecycle:</p>
            <div className="grid sm:grid-cols-3 gap-3 my-4">
              {[
                { step: "1", title: "Create + Confirm", desc: "Batch requests created and immediately confirmed before token transfer" },
                { step: "2", title: "Transfer + Settle", desc: "ERC-20 tokens transferred to recipients, requests marked as settled" },
                { step: "3", title: "Receipt", desc: "Immutable receipt stored with HSP requestId, amount, timestamp" },
              ].map((item) => (
                <div key={item.step} className="glass-card rounded-xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center mb-2">
                    <span className="text-xs font-bold gradient-text">{item.step}</span>
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{item.title}</div>
                  <div className="text-xs text-[#5A6178]">{item.desc}</div>
                </div>
              ))}
            </div>

            <h3 className="text-white font-semibold mt-6 mb-3">HSP REST API (Off-Chain)</h3>
            <p>HashPay also supports payment via the HSP hosted checkout. The &quot;Pay via HSP&quot; button on each payroll card creates an HSP payment order via <span className="font-mono text-xs text-[#8B5CF6]">/api/hsp/create-order</span>. In production mode (with HSP API keys), this redirects to HSP&apos;s hosted checkout page where the payer approves a USDC transfer. In demo mode, a simulated checkout modal is shown.</p>
            <CodeBlock language="text" code={`HSP API Authentication:
├── HMAC-SHA256 request signing (method + path + body hash + timestamp + nonce)
├── API key in X-API-Key header
├── Webhook signature verification for payment confirmations
└── Cloudflare Worker proxy for QA environment bot detection bypass`} />

            <h3 className="text-white font-semibold mt-6 mb-3">Receipt Data Structure</h3>
            <CodeBlock language="solidity" code={`struct Receipt {
    uint256 payrollId;      // Which payroll this payment belongs to
    uint256 cycleNumber;    // Which cycle (1, 2, 3, ...)
    address recipient;      // Who received the payment
    uint256 amount;         // Amount in token's smallest unit
    uint256 timestamp;      // Block timestamp of settlement
    bytes32 hspRequestId;   // Unique HSP settlement identifier
}`} />
          </Section>

          {/* ════════════ EAS ════════════ */}
          <Section id="eas" title="EAS Attestations" icon={CheckCircle2}>
            <p>HashPay uses the Ethereum Attestation Service (EAS) to create permanent, on-chain proof-of-payment attestations. EAS is pre-deployed on HashKey Chain (OP Stack) at the standard predeploy addresses.</p>

            <h3 className="text-white font-semibold mt-6 mb-3">How It Works</h3>
            <Step n="1" title="Schema Registration">
              <p>A custom payroll payment schema is registered on EAS SchemaRegistry during contract deployment. The schema defines the attestation data structure: payrollId, cycleNumber, employer, recipient, amount, token, hspRequestId, and tokenSymbol.</p>
            </Step>
            <Step n="2" title="Attestation Creation">
              <p>After a payroll cycle is executed, the PayrollAttestor contract reads all receipts from PayrollFactory and creates one EAS attestation per recipient. Each attestation is permanent (non-revocable) and linked to the recipient&apos;s address.</p>
            </Step>
            <Step n="3" title="Verification">
              <p>Anyone can verify a payment by visiting <a href="/verify" className="text-[#8B5CF6] hover:text-[#C084FC]">/verify</a> and pasting the attestation UID. The page reads directly from the EAS contract and decodes the attestation data.</p>
            </Step>

            <h3 className="text-white font-semibold mt-6 mb-3">Schema UID</h3>
            <CodeBlock language="text" code="0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4" />

            <h3 className="text-white font-semibold mt-4 mb-3">Creating Attestations (CLI)</h3>
            <CodeBlock code={`cd contracts
npx hardhat console --network hashkeyTestnet

# In the console:
const attestor = await ethers.getContractAt("PayrollAttestor", "0x5F6b5EB4f444d6aCc4F7829660a7C920399253Cf");
const [signer] = await ethers.getSigners();

# Attest cycle 1 of payroll 1
const tx = await attestor.attestCycle(
  1,                                                    // payrollId
  1,                                                    // cycleNumber
  signer.address,                                       // employer
  "0xcd367c583fd028C12Cc038d744cE7B2a67d848E2",         // token (USDT)
  "USDT"                                                // tokenSymbol
);
const receipt = await tx.wait();
console.log("Attestation tx:", receipt.hash);`} />
          </Section>

          {/* ════════════ AI ════════════ */}
          <Section id="ai" title="AI Intelligence" icon={Brain}>
            <p>The AI Intelligence panel on the analytics dashboard provides automated payroll analysis including runway prediction, anomaly detection, and optimization suggestions.</p>

            <h3 className="text-white font-semibold mt-6 mb-3">Two Modes</h3>
            <div className="grid sm:grid-cols-2 gap-3 my-4">
              <div className="glass-card rounded-xl p-4">
                <div className="text-xs px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#C084FC] border border-[#8B5CF6]/20 font-medium inline-block mb-2">Demo Mode</div>
                <div className="text-sm text-white font-medium mb-1">Mock Analysis</div>
                <div className="text-xs text-[#5A6178]">Returns realistic, data-aware analysis based on your payroll parameters. No API key required. Active by default.</div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <div className="text-xs px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/20 font-medium inline-block mb-2">Live Mode</div>
                <div className="text-sm text-white font-medium mb-1">Claude AI Analysis</div>
                <div className="text-xs text-[#5A6178]">Real AI-powered analysis via Claude API. Set ANTHROPIC_API_KEY in environment variables to activate.</div>
              </div>
            </div>

            <h3 className="text-white font-semibold mt-6 mb-3">Analysis Output</h3>
            <ul className="list-disc list-inside text-sm space-y-1 my-3">
              <li><strong className="text-white">Health Score</strong> — 0-100 gauge indicating overall payroll health</li>
              <li><strong className="text-white">Summary</strong> — natural language overview of payroll status</li>
              <li><strong className="text-white">Runway Prediction</strong> — cycles remaining and estimated depletion date</li>
              <li><strong className="text-white">Anomalies</strong> — detected irregularities (cost spikes, missed cycles) with severity levels</li>
              <li><strong className="text-white">Optimizations</strong> — actionable tips for gas savings, timing, and escrow efficiency</li>
            </ul>

            <h3 className="text-white font-semibold mt-6 mb-3">Enabling Live Mode</h3>
            <CodeBlock language="env" code={`# Add to Vercel environment variables or frontend/.env.local
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here`} />
          </Section>

          {/* ════════════ ALL FEATURES ════════════ */}
          <Section id="features" title="All Features" icon={Zap}>
            <div className="space-y-3">
              {[
                { icon: Lock, title: "Escrow-Based Payroll", desc: "Funds held in smart contract escrow with real-time runway tracking. Transparent balances viewable by all participants." },
                { icon: Shield, title: "HSP Settlement Receipts", desc: "Every payment generates an immutable on-chain receipt via HashKey Settlement Protocol with unique bytes32 request IDs." },
                { icon: CheckCircle2, title: "EAS Attestations", desc: "Permanent on-chain proof-of-payment via Ethereum Attestation Service. Non-revocable attestations verifiable by anyone at /verify." },
                { icon: Brain, title: "AI Cash Flow Intelligence", desc: "Health score, runway prediction, anomaly detection, and optimization suggestions. Powered by Claude API or demo mode." },
                { icon: Shield, title: "HSP API Integration", desc: "Real HSP REST API with HMAC-SHA256 signing. Demo checkout modal when keys unavailable, live HSP redirect when configured." },
                { icon: Users, title: "Multi-Recipient Payrolls", desc: "Pay unlimited team members in a single cycle. Each recipient gets individual amounts with their own HSP receipt." },
                { icon: Wallet, title: "Multi-Token + Custom", desc: "Built-in support for USDT, USDC, HSK, WETH. Add any custom ERC-20 token by pasting its contract address." },
                { icon: GitBranch, title: "Multi-Chain", desc: "HashKey Chain testnet (133) and mainnet (177) with automatic network detection and explorer URL switching." },
                { icon: FileText, title: "Payroll Templates", desc: "4 pre-built templates (Engineering, Contractor, Design, Quick Test) that pre-fill name, frequency, and recipients." },
                { icon: BarChart3, title: "Analytics Dashboard", desc: "Payment volume trends, escrow runway chart, cost-per-employee breakdown, and 6 summary stat cards." },
                { icon: FileText, title: "PDF Compliance Reports", desc: "Downloadable reports with company header, payment table, HSP receipt IDs, totals. Requires business profile setup." },
                { icon: Droplets, title: "Token Faucet", desc: "One-click Mock USDT minting (1K/10K/100K) with auto-refreshing balance display at /faucet." },
                { icon: ExternalLink, title: "Explorer Integration", desc: "All transaction hashes link to HashKey Chain block explorer. Contract addresses link to explorer address pages." },
                { icon: Repeat, title: "CSV Export", desc: "Employees export full payment history as CSV for personal accounting and tax filing." },
                { icon: Zap, title: "Gasless Claims (Preview)", desc: "ERC-2771 meta-transaction flow for gas-free employee claims. 3-step visual walkthrough." },
                { icon: Code2, title: "Payment Streaming (Preview)", desc: "Per-second salary streaming with live requestAnimationFrame counter showing 8-decimal precision." },
                { icon: Wallet, title: "Fiat Off-Ramp (Preview)", desc: "USD/HKD conversion badges on all amounts. Withdraw-to-bank modal with exchange rate display." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 glass-card rounded-xl p-4">
                  <item.icon className="w-5 h-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                  <div><span className="text-sm font-medium text-white">{item.title}</span><p className="text-xs text-[#5A6178] mt-0.5">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </Section>

          {/* ════════════ API REFERENCE ════════════ */}
          <Section id="api" title="Contract API Reference" icon={FileText}>
            <h3 className="text-white font-semibold mb-3">PayrollFactory Events</h3>
            <CodeBlock language="solidity" code={`event PayrollCreated(uint256 payrollId, address owner, address token, string name)
event PayrollFunded(uint256 payrollId, uint256 amount, uint256 newBalance)
event CycleExecuted(uint256 payrollId, uint256 cycleNumber, uint256 totalPaid)
event PaymentSettled(uint256 payrollId, address recipient, uint256 amount, bytes32 hspRequestId)
event PayrollCancelled(uint256 payrollId, uint256 refundedAmount)
event RecipientAdded(uint256 payrollId, address recipient, uint256 amount)
event RecipientRemoved(uint256 payrollId, address recipient)
event FundsWithdrawn(uint256 payrollId, uint256 amount)`} />

            <h3 className="text-white font-semibold mt-6 mb-3">PayrollAttestor Events</h3>
            <CodeBlock language="solidity" code={`event SchemaRegistered(bytes32 indexed uid)
event PayrollAttested(bytes32 indexed attestationUID, uint256 indexed payrollId,
    uint256 cycleNumber, address indexed recipient, uint256 amount)`} />

            <h3 className="text-white font-semibold mt-6 mb-3">Frontend Hooks</h3>
            <CodeBlock language="typescript" code={`// ═══ Read Hooks ═══
usePayrollCount()                    → total payrolls created
usePayrollDetails(payrollId)         → full payroll data tuple (12 fields)
useEscrowBalance(payrollId)          → current escrow balance (bigint)
useRunway(payrollId)                 → cycles remaining (bigint)
useRecipientPayrolls(address)        → payroll IDs for a recipient
useReceipts(payrollId, cycleNumber)  → payment receipts array
useAttestationData(uid)              → decoded EAS attestation + payment proof

// ═══ Write Hooks ═══
useCreatePayroll()    → create(name, token, recipients, amounts, frequency)
useFundPayroll()      → fund(payrollId, amount)
useApproveToken()     → approve(token, amount)
useExecuteCycle()     → execute(payrollId) — returns { hash, isPending, isConfirming, isSuccess }
useAttestCycle()      → attest(payrollId, cycleNumber, employer, token, tokenSymbol)`} />

            <h3 className="text-white font-semibold mt-6 mb-3">API Routes</h3>
            <CodeBlock language="typescript" code={`// POST /api/ai/analyze
// Body: { payrollName, token, recipientCount, amountPerCycle, frequency, escrowBalance, cyclesExecuted }
// Returns: { summary, runway, anomalies, optimizations, healthScore, _meta: { mode } }

// POST /api/hsp/create-order
// Body: { payrollId, cycleNumber, totalAmount, recipientCount, token }
// Returns: { paymentUrl, hspOrderId, isDemo }

// POST /api/hsp/webhook
// Headers: x-hsp-signature (HMAC verification)
// Body: HSP payment confirmation payload`} />
          </Section>

          {/* ════════════ DEVELOPER SETUP ════════════ */}
          <Section id="setup" title="Developer Setup" icon={Terminal}>
            <h3 className="text-white font-semibold mb-3">Prerequisites</h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-[#9BA3B7] mb-6">
              <li>Node.js 18+ (or Bun)</li>
              <li>MetaMask or compatible Web3 wallet</li>
              <li>HSK testnet tokens from the faucet</li>
            </ul>

            <h3 className="text-white font-semibold mb-3">Clone &amp; Install</h3>
            <CodeBlock code={`git clone https://github.com/rajkaria/hsp_payroll.git
cd hsp_payroll`} />

            <h3 className="text-white font-semibold mb-3">Smart Contracts</h3>
            <CodeBlock code={`cd contracts
cp .env.example .env
# Add PRIVATE_KEY to .env

npm install
npx hardhat compile                  # compiles 4 contracts
npx hardhat test                     # 115 tests
npx hardhat run scripts/deploy.ts --network hashkeyTestnet`} />

            <h3 className="text-white font-semibold mb-3">Frontend</h3>
            <CodeBlock code={`cd frontend
npm install
npm run dev                          # http://localhost:3000
npm run build                        # production build`} />

            <h3 className="text-white font-semibold mb-3">Deploy to Vercel</h3>
            <CodeBlock code={`cd frontend
npx vercel --prod                    # set root directory to frontend/`} />

            <h3 className="text-white font-semibold mb-3">Environment Variables</h3>
            <CodeBlock language="env" code={`# contracts/.env
PRIVATE_KEY=your_deployer_private_key

# frontend/.env.local (optional — for live AI + HSP)
ANTHROPIC_API_KEY=sk-ant-api03-...         # enables live AI analysis
HSP_API_KEY=your_hsp_api_key               # enables real HSP checkout
HSP_API_SECRET=your_hsp_hmac_secret
HSP_MERCHANT_ID=your_merchant_id
HSP_PROXY_URL=https://your-worker.workers.dev
NEXT_PUBLIC_APP_URL=https://hashpay.tech`} />
          </Section>

          {/* ════════════ NETWORK ════════════ */}
          <Section id="network" title="Network Information" icon={GitBranch}>
            <div className="space-y-4">
              <div className="glass-card rounded-xl p-5 space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  HashKey Chain Testnet
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#C084FC] border border-[#8B5CF6]/20 font-medium">Active</span>
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[["Chain ID", "133"], ["Currency", "HSK (18 decimals)"], ["RPC URL", "https://testnet.hsk.xyz"], ["Explorer", "https://testnet-explorer.hsk.xyz"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between items-center glass rounded-lg px-3 py-2">
                      <span className="text-[#5A6178]">{l}</span><span className="font-mono text-xs text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-xl p-5 space-y-3">
                <h3 className="text-white font-semibold">HashKey Chain Mainnet</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[["Chain ID", "177"], ["Currency", "HSK (18 decimals)"], ["RPC URL", "https://mainnet.hsk.xyz"], ["Explorer", "https://explorer.hsk.xyz"]].map(([l, v]) => (
                    <div key={l} className="flex justify-between items-center glass rounded-lg px-3 py-2">
                      <span className="text-[#5A6178]">{l}</span><span className="font-mono text-xs text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { href: "https://testnet-explorer.hsk.xyz", label: "Testnet Explorer", color: "#8B5CF6" },
                { href: "https://explorer.hsk.xyz", label: "Mainnet Explorer", color: "#8B5CF6" },
                { href: "https://www.hashkeychain.net/faucet", label: "HSK Faucet", color: "#10B981" },
                { href: "/faucet", label: "USDT Faucet", color: "#F59E0B" },
                { href: "/verify", label: "Verify Payment", color: "#06B6D4" },
              ].map((link) => (
                <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="flex items-center gap-2 glass-card rounded-xl px-4 py-3 text-sm hover:border-[#8B5CF6]/30 transition-all">
                  <ExternalLink className="w-4 h-4" style={{ color: link.color }} />{link.label}
                </a>
              ))}
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
