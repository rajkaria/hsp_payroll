"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectGate } from "@/components/connect-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, Shield, Eye } from "lucide-react";
import { SalaryViewCard } from "@/components/confidential/SalaryViewCard";
import { RequestAdvanceCard } from "@/components/confidential/RequestAdvanceCard";
import { FHEVM_CHAIN_ID } from "@/lib/fhevm/contracts";

/**
 * /confidential
 *
 * HashPay Confidential dashboard. Lives entirely on Sepolia FHEVM. The
 * existing employer / employee dashboards on HashKey Chain are
 * untouched.
 */
export default function ConfidentialPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [mode, setMode] = useState<"employer" | "employee">("employee");
  const [counterparty, setCounterparty] = useState("");

  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  return (
    <ConnectGate>
      <div className="container mx-auto max-w-4xl py-10 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wider">
            <Shield className="size-3" /> Built on Zama Protocol — FHEVM
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">
            HashPay Confidential
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Privacy-preserving payroll-backed credit. Salary, credit score,
            and advance amount are all encrypted end to end. Underwriting
            happens entirely under FHE — no observer learns the values, and
            no observer learns whether you were approved.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-1 flex items-center gap-1">
              <Lock className="size-3" /> Encrypted on chain
            </span>
            <span className="rounded-full bg-muted px-2 py-1 flex items-center gap-1">
              <Eye className="size-3" /> User-controlled decryption
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              Settles in cUSDT (ERC-7984)
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              HSK side untouched
            </span>
          </div>
        </header>

        {onWrongChain && (
          <Card className="border-amber-500/40">
            <CardContent className="pt-6">
              <p className="text-sm">
                Connect to <strong>Sepolia (chainId 11155111)</strong> to
                use the confidential dApp. Your HashKey Chain payroll
                continues to run on its own network — no bridging required.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("employee")}
                className={`flex-1 rounded-md border px-4 py-2 text-sm ${mode === "employee" ? "border-primary bg-primary/10" : "border-muted"}`}
              >
                I&apos;m an employee — request an advance
              </button>
              <button
                onClick={() => setMode("employer")}
                className={`flex-1 rounded-md border px-4 py-2 text-sm ${mode === "employer" ? "border-primary bg-primary/10" : "border-muted"}`}
              >
                I&apos;m an employer — set encrypted salaries
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                {mode === "employer" ? "Employee address" : "Employer address"}
              </label>
              <Input
                placeholder="0x…"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {address && counterparty.startsWith("0x") && counterparty.length === 42 && (
          <div className="grid gap-6 md:grid-cols-2">
            <SalaryViewCard
              mode={mode}
              counterpartyAddress={counterparty as `0x${string}`}
            />
            {mode === "employee" && <RequestAdvanceCard />}
          </div>
        )}

        <footer className="text-xs text-muted-foreground border-t pt-6 space-y-1">
          <div>
            Submission for the Zama Developer Program — Season 2, Builder
            Track.
          </div>
          <div>
            Source: <code>fhevm/</code> workspace; HSK contracts under{" "}
            <code>contracts/</code> are unchanged.
          </div>
        </footer>
      </div>
    </ConnectGate>
  );
}
