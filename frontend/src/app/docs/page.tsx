"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Zap, BookOpen, Shield, Wallet, FileText, ExternalLink,
  Copy, Check, Users, BarChart3, Lock, PlayCircle, Brain, CheckCircle2,
  ArrowRight, Repeat, Droplets, Coins, Building2, HelpCircle, GitBranch,
} from "lucide-react";

const NAV_SECTIONS = [
  { id: "overview", label: "What is HashPay?", icon: BookOpen },
  { id: "quickstart", label: "Quick Start", icon: PlayCircle },
  { id: "employer", label: "For Employers", icon: Building2 },
  { id: "employee", label: "For Employees", icon: Users },
  { id: "settlement", label: "How Settlement Works", icon: Shield },
  { id: "attestations", label: "Payment Verification", icon: CheckCircle2 },
  { id: "analytics", label: "Analytics & AI", icon: Brain },
  { id: "tokens", label: "Tokens & Faucet", icon: Coins },
  { id: "security", label: "Security", icon: Lock },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

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

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
        <span className="text-sm font-medium text-white">{q}</span>
        <ArrowRight className={`w-4 h-4 text-[#5A6178] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="px-5 pb-4 text-sm text-[#9BA3B7] leading-relaxed">{children}</div>}
    </div>
  );
}

export default function DocsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");
  const [copied, setCopied] = useState("");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

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
            <p className="text-[#5A6178]">Everything you need to know about using HashPay for on-chain payroll.</p>
          </motion.div>

          {/* ════════════ WHAT IS HASHPAY ════════════ */}
          <Section id="overview" title="What is HashPay?" icon={BookOpen}>
            <p>HashPay is an on-chain payroll platform that lets you pay your team automatically using cryptocurrency on HashKey Chain. Set up a payroll once, fund it, and execute payments to all your team members with a single click.</p>
            <p>Every payment is settled through the HashKey Settlement Protocol (HSP) and recorded on the blockchain with a permanent, verifiable receipt. No intermediaries, no delays, no hidden fees.</p>
            <div className="grid sm:grid-cols-3 gap-3 my-6">
              {[
                { icon: Zap, label: "Fast Settlement", value: "~2 seconds" },
                { icon: Coins, label: "Transaction Cost", value: "~$0.01 gas" },
                { icon: Shield, label: "Verification", value: "On-chain proof" },
              ].map((item) => (
                <div key={item.label} className="glass-card rounded-xl p-4 text-center">
                  <item.icon className="w-5 h-5 text-[#8B5CF6] mx-auto mb-2" />
                  <div className="text-sm font-medium text-white">{item.value}</div>
                  <div className="text-xs text-[#5A6178]">{item.label}</div>
                </div>
              ))}
            </div>
            <h3 className="text-white font-semibold mt-6 mb-2">Who is it for?</h3>
            <ul className="list-disc list-inside text-sm space-y-1.5">
              <li><strong className="text-white">DAOs</strong> — Automate contributor payments with full transparency and on-chain audit trails</li>
              <li><strong className="text-white">Crypto-native teams</strong> — Pay your team in stablecoins with recurring schedules</li>
              <li><strong className="text-white">Freelancers & contractors</strong> — Get paid on time with verifiable settlement receipts</li>
            </ul>
          </Section>

          {/* ════════════ QUICK START ════════════ */}
          <Section id="quickstart" title="Quick Start" icon={PlayCircle}>
            <p className="text-white font-medium">Get your first payroll running in under 2 minutes:</p>
            <Step n="1" title="Get Testnet Tokens">
              <p>You need two types of tokens: <strong className="text-white">HSK</strong> for gas fees and <strong className="text-white">USDT</strong> for payments.</p>
              <p>Get HSK from the <a href="https://www.hashkeychain.net/faucet" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#C084FC] underline">HashKey Chain Faucet</a>. Then go to <a href="/faucet" className="text-[#8B5CF6] hover:text-[#C084FC] underline">hashpay.tech/faucet</a> and mint free USDT.</p>
            </Step>
            <Step n="2" title="Connect Your Wallet">
              <p>Click &quot;Connect Wallet&quot; on the homepage. HashPay supports MetaMask, WalletConnect, and other popular wallets. If prompted, add HashKey Chain Testnet to your wallet (it&apos;s automatic with most wallets).</p>
            </Step>
            <Step n="3" title="Create a Payroll">
              <p>Go to <strong className="text-white">Employer Dashboard → Create Payroll</strong>. Use the &quot;Quick Test&quot; template to try it fast — it sets up a 5-minute cycle with one recipient. Enter a wallet address and amount, then confirm the transaction.</p>
            </Step>
            <Step n="4" title="Fund the Escrow">
              <p>After creating, you&apos;ll be asked to deposit USDT into the escrow. Two steps: <strong className="text-white">Approve</strong> (allows the contract to use your USDT) then <strong className="text-white">Fund</strong> (deposits the amount). The runway indicator shows how many payment cycles your deposit covers.</p>
            </Step>
            <Step n="5" title="Execute a Payment Cycle">
              <p>Once the cycle period elapses (5 minutes for test), the &quot;Execute Cycle&quot; button activates on your payroll card. Click it — all recipients receive their payments simultaneously. You&apos;ll see a link to view the transaction on the block explorer.</p>
            </Step>
          </Section>

          {/* ════════════ FOR EMPLOYERS ════════════ */}
          <Section id="employer" title="For Employers" icon={Building2}>
            <h3 className="text-white font-semibold text-lg mb-3">Creating a Payroll</h3>
            <p>The payroll creation wizard has 3 steps:</p>
            <ul className="list-none space-y-3 my-4">
              <li className="flex items-start gap-3"><span className="text-[#8B5CF6] font-bold text-xs mt-1.5">1</span><span><strong className="text-white">Details</strong> — Name your payroll, pick a payment token (USDT or add a custom token), and choose how often to pay: weekly, biweekly, monthly, or a 5-minute test cycle.</span></li>
              <li className="flex items-start gap-3"><span className="text-[#8B5CF6] font-bold text-xs mt-1.5">2</span><span><strong className="text-white">Recipients</strong> — Add your team&apos;s wallet addresses and how much each person gets paid per cycle. The total cost per cycle is shown at the bottom.</span></li>
              <li className="flex items-start gap-3"><span className="text-[#8B5CF6] font-bold text-xs mt-1.5">3</span><span><strong className="text-white">Fund</strong> — Deposit USDT into the on-chain escrow. You can see exactly how many cycles your deposit will cover (the &quot;runway&quot;).</span></li>
            </ul>

            <h3 className="text-white font-semibold text-lg mt-8 mb-3">Templates</h3>
            <p>Don&apos;t want to fill everything manually? Use a template:</p>
            <div className="grid grid-cols-2 gap-3 my-4">
              {[
                { name: "Engineering Team", desc: "3 people, monthly cycle" },
                { name: "Contractor Weekly", desc: "2 people, weekly cycle" },
                { name: "Design Team", desc: "2 people, biweekly cycle" },
                { name: "Quick Test", desc: "1 person, 5-minute cycle" },
              ].map((t) => (
                <div key={t.name} className="glass rounded-xl p-3">
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-[#5A6178]">{t.desc}</div>
                </div>
              ))}
            </div>
            <p className="text-sm">Templates pre-fill the name, frequency, and recipient slots. You just need to add the wallet addresses.</p>

            <h3 className="text-white font-semibold text-lg mt-8 mb-3">Managing Payrolls</h3>
            <p>Your dashboard shows all payrolls as cards. Each card displays:</p>
            <ul className="list-disc list-inside text-sm space-y-1.5 my-3">
              <li>Number of recipients and cost per cycle</li>
              <li>Current escrow balance with USD equivalent</li>
              <li>Runway — how many more cycles your funds cover</li>
              <li>Cycles completed and total paid out</li>
            </ul>

            <h3 className="text-white font-semibold text-lg mt-8 mb-3">Actions on Each Payroll</h3>
            <div className="space-y-3 my-4">
              {[
                { icon: Zap, title: "Execute Cycle", desc: "Triggers payment to all recipients. Only available when the cycle period has elapsed and there are sufficient funds." },
                { icon: CheckCircle2, title: "Create EAS Attestations", desc: "After executing a cycle, create permanent on-chain proof-of-payment for each recipient via EAS. Attestations are non-revocable and verifiable by anyone." },
                { icon: Shield, title: "Pay via HSP", desc: "Process payment through HashKey Settlement Protocol's hosted checkout. Shows a demo flow when API keys aren't configured." },
                { icon: FileText, title: "Generate Report", desc: "Downloads a PDF compliance report with your company header, all payment details, and HSP receipt IDs. Requires setting up your business profile first." },
                { icon: ExternalLink, title: "View on Explorer", desc: "After executing a cycle, click to see the transaction on the HashKey Chain block explorer." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 glass rounded-xl p-4">
                  <item.icon className="w-4 h-4 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                  <div><span className="text-sm font-medium text-white">{item.title}</span><p className="text-xs text-[#5A6178] mt-0.5">{item.desc}</p></div>
                </div>
              ))}
            </div>

            <h3 className="text-white font-semibold text-lg mt-8 mb-3">Business Profile</h3>
            <p>Go to the profile page (click the <Building2 className="w-3.5 h-3.5 inline text-[#9BA3B7]" /> icon on your dashboard) to enter your company details — name, registration number, address, country, and email. This information appears in the header of your PDF compliance reports. Your profile is saved in your browser.</p>
          </Section>

          {/* ════════════ FOR EMPLOYEES ════════════ */}
          <Section id="employee" title="For Employees" icon={Users}>
            <p>Connect a wallet that is registered as a recipient in an active payroll. Your employee dashboard shows:</p>

            <h3 className="text-white font-semibold mt-6 mb-3">What You&apos;ll See</h3>
            <div className="space-y-3 my-4">
              {[
                { icon: FileText, title: "Payment History", desc: "Real on-chain payment data fetched from the blockchain. Shows date, amount (with USD value), cycle number, HSP receipt ID, and settlement status." },
                { icon: Coins, title: "Fiat Conversion", desc: "All USDT amounts show their approximate USD value alongside the token amount." },
                { icon: FileText, title: "CSV Export", desc: "Download your complete payment history as a CSV file for accounting, tax filing, or personal records." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 glass rounded-xl p-4">
                  <item.icon className="w-4 h-4 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                  <div><span className="text-sm font-medium text-white">{item.title}</span><p className="text-xs text-[#5A6178] mt-0.5">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </Section>

          {/* ════════════ SETTLEMENT ════════════ */}
          <Section id="settlement" title="How Settlement Works" icon={Shield}>
            <p>Every payment in HashPay goes through the HashKey Settlement Protocol (HSP). This ensures every payment is verifiable and creates an immutable audit trail.</p>

            <h3 className="text-white font-semibold mt-6 mb-3">The Payment Flow</h3>
            <div className="space-y-4 my-4">
              <Step n="1" title="Employer Clicks 'Execute Cycle'">
                <p>The smart contract checks that enough time has passed since the last payment and that the escrow has sufficient funds.</p>
              </Step>
              <Step n="2" title="HSP Payment Requests Created">
                <p>A batch of payment requests is created through the settlement protocol — one for each recipient. Each request gets a unique HSP receipt ID.</p>
              </Step>
              <Step n="3" title="Tokens Transferred">
                <p>USDT is transferred from the escrow directly to each recipient&apos;s wallet. Each transfer is confirmed and marked as settled in the HSP system.</p>
              </Step>
              <Step n="4" title="Receipts Stored On-Chain">
                <p>A permanent receipt is stored for every payment containing: who paid, who received, how much, when, and the HSP receipt ID. These receipts can never be altered or deleted.</p>
              </Step>
            </div>

            <h3 className="text-white font-semibold mt-6 mb-3">HSP Hosted Checkout</h3>
            <p>HashPay also supports payment through HSP&apos;s hosted checkout page. When you click &quot;Pay via HSP&quot; on a payroll card, you&apos;re taken to HSP&apos;s payment page where you approve a USDC transfer directly. This adds an extra layer of settlement verification from HashKey&apos;s own infrastructure.</p>
          </Section>

          {/* ════════════ VERIFICATION ════════════ */}
          <Section id="attestations" title="Payment Verification" icon={CheckCircle2}>
            <p>HashPay creates permanent, cryptographic proof for every payment using the Ethereum Attestation Service (EAS). This means anyone — your accountant, a tax auditor, or a business partner — can independently verify that a payment happened.</p>

            <h3 className="text-white font-semibold mt-6 mb-3">What is an Attestation?</h3>
            <p>An attestation is a signed, on-chain record that proves a specific event occurred. HashPay attestations prove: <em className="text-white">this employer paid this recipient this amount at this time, and here is the HSP settlement receipt to prove it</em>. Attestations are permanent — they can never be revoked or deleted.</p>

            <h3 className="text-white font-semibold mt-6 mb-3">How to Verify a Payment</h3>
            <Step n="1" title="Get the Attestation UID">
              <p>After a payroll cycle is attested, each payment gets a unique attestation UID (a long hex string starting with 0x). This UID is your proof of payment.</p>
            </Step>
            <Step n="2" title="Visit the Verify Page">
              <p>Go to <a href="/verify" className="text-[#8B5CF6] hover:text-[#C084FC] underline">hashpay.tech/verify</a> — no wallet connection needed.</p>
            </Step>
            <Step n="3" title="Paste and Verify">
              <p>Paste the attestation UID and click Verify. The page reads directly from the blockchain and shows: payroll ID, cycle number, employer address, recipient address, exact amount, token used, HSP receipt ID, and timestamp.</p>
            </Step>

            <h3 className="text-white font-semibold mt-6 mb-3">Why This Matters</h3>
            <p>Traditional payroll relies on trust — you trust your employer&apos;s records, you trust the bank&apos;s statement. With HashPay, proof of payment lives on the blockchain. It can&apos;t be altered, backdated, or disputed. This is especially valuable for:</p>
            <ul className="list-disc list-inside text-sm space-y-1.5 my-3">
              <li>Tax compliance and audit readiness</li>
              <li>Contractor payment disputes</li>
              <li>DAO contributor transparency</li>
              <li>Cross-border payment verification</li>
            </ul>
          </Section>

          {/* ════════════ ANALYTICS ════════════ */}
          <Section id="analytics" title="Analytics & AI" icon={Brain}>
            <h3 className="text-white font-semibold mb-3">Analytics Dashboard</h3>
            <p>The analytics page gives employers a bird&apos;s-eye view of their payroll operations:</p>
            <ul className="list-disc list-inside text-sm space-y-1.5 my-3">
              <li><strong className="text-white">Summary cards</strong> — total paid, active payrolls, average cycle cost, employee count, runway remaining, next payout date</li>
              <li><strong className="text-white">Payment volume chart</strong> — monthly payment trends showing growth over time</li>
              <li><strong className="text-white">Escrow runway</strong> — how your treasury balance changes over time, including refill events</li>
              <li><strong className="text-white">Cost breakdown</strong> — per-employee compensation comparison</li>
            </ul>

            <h3 className="text-white font-semibold mt-8 mb-3">AI Payroll Intelligence</h3>
            <p>The AI panel on the analytics page automatically analyzes your payroll data and provides:</p>
            <div className="space-y-3 my-4">
              {[
                { title: "Health Score", desc: "A 0-100 score indicating your overall payroll health based on runway, consistency, and anomalies." },
                { title: "Runway Prediction", desc: "Estimates when your escrow will run out and recommends when to top up." },
                { title: "Anomaly Detection", desc: "Flags unusual patterns — cost spikes, missed cycles, or unexpected changes in recipient count." },
                { title: "Optimization Tips", desc: "Actionable suggestions like optimal execution timing for gas savings or escrow efficiency." },
              ].map((item) => (
                <div key={item.title} className="glass rounded-xl p-4">
                  <span className="text-sm font-medium text-white">{item.title}</span>
                  <p className="text-xs text-[#5A6178] mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm">The AI panel currently runs in demo mode with realistic sample analysis. When configured with an AI API key, it provides live analysis based on your actual payroll data.</p>
          </Section>

          {/* ════════════ TOKENS ════════════ */}
          <Section id="tokens" title="Tokens & Faucet" icon={Coins}>
            <h3 className="text-white font-semibold mb-3">Supported Tokens</h3>
            <p>HashPay supports multiple payment tokens:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              {[
                { symbol: "USDT", name: "Tether USD", status: "Live" },
                { symbol: "USDC", name: "USD Coin", status: "Soon" },
                { symbol: "HSK", name: "HashKey Token", status: "Soon" },
                { symbol: "WETH", name: "Wrapped ETH", status: "Soon" },
              ].map((t) => (
                <div key={t.symbol} className="glass rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-white">{t.symbol}</div>
                  <div className="text-xs text-[#5A6178]">{t.name}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1.5 inline-block ${t.status === "Live" ? "bg-[#10B981]/15 text-[#34D399]" : "bg-[#F59E0B]/15 text-[#F59E0B]"}`}>{t.status}</span>
                </div>
              ))}
            </div>
            <p className="text-sm">You can also add any custom ERC-20 token by pasting its contract address in the token selector during payroll creation.</p>

            <h3 className="text-white font-semibold mt-8 mb-3">Token Faucet</h3>
            <p>For testing, visit <a href="/faucet" className="text-[#8B5CF6] hover:text-[#C084FC] underline">hashpay.tech/faucet</a> to mint free Mock USDT. Choose from 1,000 / 10,000 / 100,000 USDT amounts. Your balance updates automatically after minting.</p>
            <p className="text-sm mt-2">You&apos;ll also need HSK for gas fees — get it from the <a href="https://www.hashkeychain.net/faucet" target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#C084FC] underline">HashKey Chain Faucet</a>.</p>

            <h3 className="text-white font-semibold mt-8 mb-3">Contract Addresses</h3>
            <p className="text-sm mb-3">If you need to add these tokens to your wallet manually:</p>
            <div className="space-y-2">
              {[
                { label: "Mock USDT", addr: "0xcd367c583fd028C12Cc038d744cE7B2a67d848E2" },
                { label: "PayrollFactory", addr: "0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb" },
                { label: "PayrollAttestor", addr: "0x5F6b5EB4f444d6aCc4F7829660a7C920399253Cf" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between glass rounded-lg px-4 py-2.5">
                  <span className="text-sm text-[#9BA3B7]">{c.label}</span>
                  <button onClick={() => handleCopy(c.addr, c.label)} className="flex items-center gap-1.5 text-xs font-mono text-[#8B5CF6] hover:text-[#C084FC]">
                    {c.addr.slice(0, 10)}...{c.addr.slice(-6)}
                    {copied === c.label ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* ════════════ SECURITY ════════════ */}
          <Section id="security" title="Security" icon={Lock}>
            <p>HashPay is designed with security as a priority:</p>
            <div className="space-y-3 my-4">
              {[
                { title: "Non-Custodial Escrow", desc: "Funds are held in a smart contract, not by HashPay. Only the payroll owner can execute cycles or withdraw excess funds." },
                { title: "On-Chain Transparency", desc: "Every transaction is recorded on HashKey Chain. Anyone can verify payments, balances, and settlement receipts on the block explorer." },
                { title: "Immutable Receipts", desc: "HSP receipts and EAS attestations cannot be altered, backdated, or deleted after creation." },
                { title: "Owner-Only Actions", desc: "Only the wallet that created a payroll can execute cycles, add/remove recipients, fund, cancel, or withdraw. No admin backdoors." },
                { title: "HSP Access Control", desc: "The HSP settlement layer restricts confirm/settle/cancel operations to authorized contracts only. Unauthorized callers are rejected." },
                { title: "Reentrancy Protection", desc: "All fund-moving operations (execute, fund, cancel, withdraw) are protected by OpenZeppelin's ReentrancyGuard." },
                { title: "Open Source", desc: "All smart contracts and frontend code are open source and available on GitHub for independent review." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 glass rounded-xl p-4">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                  <div><span className="text-sm font-medium text-white">{item.title}</span><p className="text-xs text-[#5A6178] mt-0.5">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </Section>

          {/* ════════════ FAQ ════════════ */}
          <Section id="faq" title="FAQ" icon={HelpCircle}>
            <div className="space-y-3">
              <FAQ q="What blockchain does HashPay run on?">
                <p>HashPay runs on HashKey Chain, an OP Stack Layer 2 with ~2 second block times and gas costs around $0.01. It supports both testnet (Chain ID 133) and mainnet (Chain ID 177).</p>
              </FAQ>
              <FAQ q="Is this real money?">
                <p>On testnet, HashPay uses Mock USDT which has no real value — it&apos;s free to mint from the faucet. On mainnet, it would use real tokens. Currently HashPay is deployed on testnet only.</p>
              </FAQ>
              <FAQ q="What wallets are supported?">
                <p>HashPay supports MetaMask, WalletConnect, Coinbase Wallet, Rainbow, and other popular Web3 wallets through RainbowKit.</p>
              </FAQ>
              <FAQ q="Can I add my own token?">
                <p>Yes. In the payroll creation form, click the token selector and choose &quot;Add Custom Token.&quot; Paste the ERC-20 contract address, symbol, and decimals. Any token deployed on HashKey Chain can be used.</p>
              </FAQ>
              <FAQ q="How does the escrow work?">
                <p>When you fund a payroll, your tokens are deposited into the PayrollFactory smart contract. The contract holds the funds and releases them only when you execute a cycle. You can withdraw unused funds at any time. No one else can access your escrow.</p>
              </FAQ>
              <FAQ q="What is an EAS attestation?">
                <p>EAS (Ethereum Attestation Service) creates permanent, on-chain proof that a payment occurred. After a cycle is executed, attestations can be created for each payment. Anyone can verify these at hashpay.tech/verify without needing a wallet.</p>
              </FAQ>
              <FAQ q="What happens if I don't execute a cycle on time?">
                <p>Nothing bad. Cycles don&apos;t execute automatically — you trigger them manually when ready. If you&apos;re late, the payment simply happens when you click the button. There&apos;s no penalty for delayed execution.</p>
              </FAQ>
              <FAQ q="Can recipients see their pending payments?">
                <p>Recipients can see their payment history on the employee dashboard. They can view amounts with USD conversion, dates, HSP receipt IDs, and export everything as CSV.</p>
              </FAQ>
              <FAQ q="How do compliance reports work?">
                <p>Set up your business profile (company name, registration number, address). Then click the report icon on any payroll card to download a PDF with your company header, a table of all payments, HSP receipt IDs, and totals. Useful for tax filing and audits.</p>
              </FAQ>
              <FAQ q="Is the AI analysis feature using my data externally?">
                <p>In demo mode, no data is sent anywhere — the analysis is generated locally. When configured with an API key, payroll summary data (not wallet addresses or personal info) is sent to the AI service for analysis.</p>
              </FAQ>
            </div>
          </Section>

          {/* ════════════ FOOTER LINKS ════════════ */}
          <div className="border-t border-[#1C1E3A] pt-8 mt-8">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { href: "/", label: "Home", icon: Zap },
                { href: "/employer", label: "Employer Dashboard", icon: Building2 },
                { href: "/employee", label: "Employee Dashboard", icon: Users },
                { href: "/faucet", label: "Token Faucet", icon: Droplets },
                { href: "/verify", label: "Verify Payment", icon: CheckCircle2 },
                { href: "/employer/analytics", label: "Analytics", icon: BarChart3 },
                { href: "https://testnet-explorer.hsk.xyz", label: "Block Explorer", icon: ExternalLink },
                { href: "https://github.com/rajkaria/hsp_payroll", label: "GitHub", icon: GitBranch },
              ].map((link) => (
                <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="flex items-center gap-2 glass-card rounded-xl px-4 py-2.5 text-sm hover:border-[#8B5CF6]/30 transition-all">
                  <link.icon className="w-3.5 h-3.5 text-[#8B5CF6]" />{link.label}
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
