"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  BookOpen,
  Code2,
  Shield,
  Layers,
  Wallet,
  FileText,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  GitBranch,
  Box,
  Users,
  BarChart3,
  Lock,
} from "lucide-react";

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "contracts", label: "Smart Contracts", icon: Code2 },
  { id: "hsp", label: "HSP Protocol", icon: Shield },
  { id: "frontend", label: "Frontend", icon: Box },
  { id: "features", label: "Features", icon: Zap },
  { id: "setup", label: "Setup Guide", icon: Terminal },
  { id: "api", label: "Contract API", icon: FileText },
  { id: "network", label: "Network Info", icon: GitBranch },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0A0B14] border-b border-[#1C1E3A]">
        <span className="text-[10px] text-[#5A6178] uppercase tracking-wider">{language}</span>
        <button onClick={handleCopy} className="text-[#5A6178] hover:text-white transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 bg-[#08090F] overflow-x-auto text-sm font-mono text-[#9BA3B7] leading-relaxed">
        <code>{code}</code>
      </pre>
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

export default function DocsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-8 relative flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-8">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#C084FC] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold">
                HashPay Docs
              </span>
            </div>

            <nav className="space-y-1">
              {NAV_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? "bg-[#8B5CF6]/10 text-white border border-[#8B5CF6]/20"
                      : "text-[#5A6178] hover:text-[#9BA3B7] hover:bg-white/[0.02]"
                  }`}
                >
                  <section.icon className="w-3.5 h-3.5" />
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold mb-3 tracking-tight">
              Hash<span className="gradient-text">Pay</span> Documentation
            </h1>
            <p className="text-[#5A6178]">
              Complete guide to the on-chain recurring payroll system on HashKey Chain.
            </p>
          </motion.div>

          <Section id="overview" title="Overview" icon={BookOpen}>
            <p>
              HashPay is an on-chain recurring payment system built on HashKey Chain (OP Stack L2).
              It enables DAOs, crypto-native teams, and freelancers to set up automated payroll with
              cryptographic settlement receipts via the HashKey Settlement Protocol (HSP).
            </p>
            <div className="grid sm:grid-cols-3 gap-3 my-6">
              {[
                { label: "Chain", value: "HashKey Chain (ID: 133)", icon: GitBranch },
                { label: "Contracts", value: "Solidity 0.8.24", icon: Code2 },
                { label: "Frontend", value: "Next.js + wagmi v2", icon: Box },
              ].map((item) => (
                <div key={item.label} className="glass-card rounded-xl p-4">
                  <item.icon className="w-4 h-4 text-[#8B5CF6] mb-2" />
                  <div className="text-xs text-[#5A6178]">{item.label}</div>
                  <div className="text-sm font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="architecture" title="Architecture" icon={Layers}>
            <CodeBlock language="text" code={`Frontend (Next.js 16) ──→ Smart Contracts (Solidity) ──→ HashKey Chain (OP Stack L2)
                                        ↕
                              HSP Adapter (Settlement Protocol)`} />
            <p>The system consists of three layers:</p>
            <ul className="list-none space-y-3 my-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[#8B5CF6]">1</span>
                </div>
                <span><strong className="text-white">Frontend</strong> — Next.js app with wagmi v2, RainbowKit for wallet connection, and React Query for contract reads.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[#8B5CF6]">2</span>
                </div>
                <span><strong className="text-white">Smart Contracts</strong> — PayrollFactory manages payrolls, escrow, and cycle execution. HSPAdapter handles settlement receipts.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[#8B5CF6]">3</span>
                </div>
                <span><strong className="text-white">HashKey Chain</strong> — OP Stack L2 providing fast settlement (~2s), low gas costs (~$0.01), and EVM compatibility.</span>
              </li>
            </ul>
          </Section>

          <Section id="contracts" title="Smart Contracts" icon={Code2}>
            <div className="space-y-6">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#8B5CF6]" />
                  PayrollFactory.sol
                </h3>
                <p className="text-sm">
                  Core contract for creating and managing payrolls. Handles escrow deposits, cycle execution, and recipient management.
                </p>
                <CodeBlock language="solidity" code={`// Key functions
createPayroll(name, token, recipients[], amounts[], frequency) → payrollId
fundPayroll(payrollId, amount)
executeCycle(payrollId)
cancelPayroll(payrollId)
withdrawExcess(payrollId, amount)
addRecipient(payrollId, recipient, amount)
removeRecipient(payrollId, recipientIndex)

// View functions
getPayrollDetails(payrollId) → (owner, token, name, recipients, ...)
getReceipts(payrollId, cycleNumber) → Receipt[]
getRunway(payrollId) → uint256
getRecipientPayrolls(address) → uint256[]`} />
              </div>

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#10B981]" />
                  HSPAdapter.sol
                </h3>
                <p className="text-sm">
                  Settlement protocol message layer. Creates payment requests, confirms them, marks as settled, and generates receipt IDs.
                </p>
                <CodeBlock language="solidity" code={`// Settlement lifecycle
createPaymentRequest(payer, recipient, token, amount) → requestId
confirmPayment(requestId)
markSettled(requestId)
cancelPayment(requestId)
getRequest(requestId) → PaymentRequest
createBatchRequests(payer, recipients[], token, amounts[]) → requestId[]

// Status flow: Pending → Confirmed → Settled (or Cancelled)`} />
              </div>

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#F59E0B]" />
                  MockERC20.sol
                </h3>
                <p className="text-sm">Test ERC-20 token (Mock USDT) with 6 decimals. Public mint function for testnet use.</p>
              </div>
            </div>

            <h3 className="text-white font-semibold mt-8 mb-3">Deployed Addresses (HashKey Testnet)</h3>
            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1C1E3A]">
                    <th className="text-left py-3 px-4 text-[#5A6178] text-xs uppercase tracking-wider">Contract</th>
                    <th className="text-left py-3 px-4 text-[#5A6178] text-xs uppercase tracking-wider">Address</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-b border-[#1C1E3A]/50">
                    <td className="py-3 px-4 text-white">PayrollFactory</td>
                    <td className="py-3 px-4 text-[#8B5CF6]">0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb</td>
                  </tr>
                  <tr className="border-b border-[#1C1E3A]/50">
                    <td className="py-3 px-4 text-white">HSPAdapter</td>
                    <td className="py-3 px-4 text-[#8B5CF6]">0xa31558b2c364B269Ac823798AefcA7E285Af3487</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white">Mock USDT</td>
                    <td className="py-3 px-4 text-[#8B5CF6]">0xcd367c583fd028C12Cc038d744cE7B2a67d848E2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="hsp" title="HSP Protocol Integration" icon={Shield}>
            <p>
              HSP (HashKey Settlement Protocol) is the settlement coordination layer. Every payment in HashPay
              is routed through HSP, generating cryptographic receipts for auditability.
            </p>
            <h3 className="text-white font-semibold mt-6 mb-3">Settlement Flow</h3>
            <div className="grid sm:grid-cols-4 gap-3 my-4">
              {[
                { step: "1", title: "Create", desc: "Batch payment requests created via HSPAdapter" },
                { step: "2", title: "Confirm", desc: "Requests confirmed before fund release" },
                { step: "3", title: "Settle", desc: "Funds transferred, marked as settled" },
                { step: "4", title: "Receipt", desc: "Immutable on-chain receipt with HSP ID" },
              ].map((item) => (
                <div key={item.step} className="glass-card rounded-xl p-4 text-center">
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-xs font-bold gradient-text">{item.step}</span>
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{item.title}</div>
                  <div className="text-xs text-[#5A6178]">{item.desc}</div>
                </div>
              ))}
            </div>
            <h3 className="text-white font-semibold mt-6 mb-3">Receipt Data Structure</h3>
            <CodeBlock language="solidity" code={`struct Receipt {
    uint256 payrollId;
    uint256 cycleNumber;
    address recipient;
    uint256 amount;
    uint256 timestamp;
    bytes32 hspRequestId;  // Unique HSP settlement identifier
}`} />
          </Section>

          <Section id="frontend" title="Frontend Stack" icon={Box}>
            <div className="grid sm:grid-cols-2 gap-3 my-4">
              {[
                { name: "Next.js 16", desc: "App Router, React Server Components" },
                { name: "wagmi v2", desc: "React hooks for Ethereum" },
                { name: "RainbowKit", desc: "Wallet connection UI" },
                { name: "Tailwind CSS v4", desc: "Utility-first styling" },
                { name: "Framer Motion", desc: "Animations and transitions" },
                { name: "Recharts", desc: "Analytics chart library" },
                { name: "jsPDF", desc: "Client-side PDF generation" },
                { name: "viem", desc: "TypeScript Ethereum library" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                  <div>
                    <span className="text-sm font-medium text-white">{item.name}</span>
                    <span className="text-xs text-[#5A6178] ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="features" title="Features" icon={Zap}>
            <div className="space-y-3">
              {[
                { icon: Lock, title: "Escrow-Based Payroll", desc: "Funds held securely in smart contract escrow with transparent runway tracking." },
                { icon: Shield, title: "HSP Settlement Receipts", desc: "Every payment generates an immutable on-chain receipt via HashKey Settlement Protocol." },
                { icon: Users, title: "Multi-Recipient Payrolls", desc: "Pay unlimited team members in a single cycle execution." },
                { icon: Wallet, title: "Multi-Token Support", desc: "USDT, USDC, HSK, WETH, and custom ERC-20 tokens." },
                { icon: Zap, title: "Gasless Claims (Preview)", desc: "ERC-2771 meta-transaction support for gas-free employee claims." },
                { icon: BarChart3, title: "Analytics Dashboard", desc: "Payment volume, burn rate, and per-employee cost visualizations." },
                { icon: FileText, title: "Compliance Reports", desc: "PDF payroll reports with company headers, HSP receipt IDs, and payment tables." },
                { icon: Code2, title: "Payment Streaming (Preview)", desc: "Per-second salary streaming with live-ticking balance counters." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 glass-card rounded-xl p-4">
                  <item.icon className="w-5 h-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-white">{item.title}</span>
                    <p className="text-xs text-[#5A6178] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="setup" title="Setup Guide" icon={Terminal}>
            <h3 className="text-white font-semibold mb-3">Prerequisites</h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-[#9BA3B7] mb-6">
              <li>Node.js 18+</li>
              <li>MetaMask or compatible Web3 wallet</li>
              <li>HSK testnet tokens from the faucet</li>
            </ul>

            <h3 className="text-white font-semibold mb-3">Smart Contracts</h3>
            <CodeBlock code={`cd contracts
cp .env.example .env
# Add your PRIVATE_KEY to .env

npm install
npx hardhat compile
npx hardhat test          # 105 tests
npx hardhat run scripts/deploy.ts --network hashkeyTestnet`} />

            <h3 className="text-white font-semibold mb-3">Frontend</h3>
            <CodeBlock code={`cd frontend
npm install
npm run dev               # http://localhost:3000
npm run build             # Production build`} />

            <h3 className="text-white font-semibold mb-3">Environment Variables</h3>
            <CodeBlock language="env" code={`# contracts/.env
PRIVATE_KEY=your_deployer_private_key

# Update frontend/src/config/contracts.ts with deployed addresses`} />
          </Section>

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

            <h3 className="text-white font-semibold mt-6 mb-3">Frontend Hooks</h3>
            <CodeBlock language="typescript" code={`// Read hooks
usePayrollCount()                    → total payrolls created
usePayrollDetails(payrollId)         → full payroll data tuple
useEscrowBalance(payrollId)          → current escrow balance
useRunway(payrollId)                 → cycles remaining
useRecipientPayrolls(address)        → payroll IDs for recipient
useReceipts(payrollId, cycleNumber)  → payment receipts

// Write hooks
useCreatePayroll()    → create(name, token, recipients, amounts, frequency)
useFundPayroll()      → fund(payrollId, amount)
useApproveToken()     → approve(token, amount)
useExecuteCycle()     → execute(payrollId)`} />
          </Section>

          <Section id="network" title="Network Information" icon={GitBranch}>
            <div className="glass-card rounded-xl p-5 space-y-3">
              <h3 className="text-white font-semibold">HashKey Chain Testnet</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Chain ID", "133"],
                  ["Currency", "HSK (18 decimals)"],
                  ["RPC URL", "https://testnet.hsk.xyz"],
                  ["Block Explorer", "https://testnet-explorer.hsk.xyz"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center glass rounded-lg px-3 py-2">
                    <span className="text-[#5A6178]">{label}</span>
                    <span className="font-mono text-xs text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <a
                href="https://testnet-explorer.hsk.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 glass-card rounded-xl px-4 py-3 text-sm hover:border-[#8B5CF6]/30 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-[#8B5CF6]" />
                Block Explorer
              </a>
              <a
                href="https://www.hashkeychain.net/faucet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 glass-card rounded-xl px-4 py-3 text-sm hover:border-[#8B5CF6]/30 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-[#10B981]" />
                Testnet Faucet
              </a>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
