"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectGate } from "@/components/connect-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Users } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  ConfidentialPayrollRosterAbi,
} from "@/lib/fhevm/contracts";
import { encryptUint64 } from "@/lib/fhevm/client";
import { useWriteContract } from "wagmi";

/**
 * /confidential/roster
 *
 * Confidential payroll batch run. The employer commits a roster of
 * employees + encrypted amounts and disburses in a single transaction.
 * Per-employee compensation is never revealed.
 */
export default function ConfidentialRosterPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [rosterId, setRosterId] = useState<string>("");
  const [employee, setEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const { writeContractAsync } = useWriteContract();

  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;
  const append = (s: string) => setLog((l) => [...l, s]);

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Confidential"
        highlight="Roster"
        message="Pay every employee in one transaction without revealing per-employee amounts or the total."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function createRoster() {
    setBusy(true);
    try {
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        abi: ConfidentialPayrollRosterAbi,
        functionName: "createRoster",
        args: [],
      });
      append(`createRoster: ${tx}`);
    } finally {
      setBusy(false);
    }
  }

  async function addEmployee() {
    if (!address) return;
    setBusy(true);
    try {
      const cents = BigInt(Math.round(parseFloat(amount) * 100));
      const enc = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        address,
        cents,
      );
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        abi: ConfidentialPayrollRosterAbi,
        functionName: "addEmployee",
        args: [BigInt(rosterId), employee as `0x${string}`, enc.handle, enc.proof],
      });
      append(`addEmployee ${employee}: ${tx}`);
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    setBusy(true);
    try {
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialPayrollRoster,
        abi: ConfidentialPayrollRosterAbi,
        functionName: "executeRoster",
        args: [BigInt(rosterId)],
      });
      append(`executeRoster: ${tx}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="container mx-auto max-w-3xl py-10 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wider">
            <Lock className="size-3" /> Encrypted batch payroll
          </div>
          <h1 className="text-3xl font-semibold mt-2">Confidential Roster</h1>
          <p className="text-muted-foreground mt-1">
            Pay every employee in one transaction without revealing
            per-employee amounts or the total.
          </p>
        </header>
        {onWrongChain && (
          <Card className="border-amber-500/40">
            <CardContent className="pt-6 text-sm">
              Connect to Sepolia (chainId 11155111).
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> Build a roster
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={createRoster} disabled={busy}>
                Create new roster
              </Button>
              <Input
                placeholder="Roster ID (after create)"
                value={rosterId}
                onChange={(e) => setRosterId(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Employee 0x…"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
              />
              <Input
                placeholder="Amount (USD)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addEmployee} disabled={busy || !rosterId}>
                Add employee (encrypted)
              </Button>
              <Button onClick={execute} disabled={busy || !rosterId} variant="default">
                Execute roster
              </Button>
            </div>
            <pre className="text-xs bg-muted/40 p-3 rounded overflow-x-auto">
              {log.join("\n") || "Activity will appear here."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
