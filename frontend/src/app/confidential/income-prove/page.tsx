"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { ConnectGate } from "@/components/connect-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  IncomeProverAbi,
} from "@/lib/fhevm/contracts";

/**
 * /confidential/income-prove
 *
 * Generate a selective proof "salary >= threshold" for a specified
 * verifier (a landlord, lender, or insurance underwriter). The
 * verifier can decrypt only the boolean — never the salary.
 */
export default function IncomeProvePage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [threshold, setThreshold] = useState("");
  const [verifier, setVerifier] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Prove your"
        highlight="income"
        message="Issue a 'salary ≥ threshold' attestation to a specific verifier — without revealing the underlying amount."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function prove() {
    setBusy(true);
    try {
      const cents = BigInt(Math.round(parseFloat(threshold) * 100));
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.IncomeProver,
        abi: IncomeProverAbi,
        functionName: "proveAtLeast",
        args: [cents, verifier as `0x${string}`],
      });
      setLog((l) => [...l, `proveAtLeast(${threshold}, ${verifier}) → ${tx}`]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="container mx-auto max-w-3xl py-10 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wider">
            <ShieldCheck className="size-3" /> Selective income disclosure
          </div>
          <h1 className="text-3xl font-semibold mt-2">Prove your income</h1>
          <p className="text-muted-foreground mt-1">
            Issue an encrypted "salary ≥ threshold" attestation to a
            specific verifier — without revealing the underlying amount.
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
            <CardTitle>Generate proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Threshold (USD)"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <Input
              placeholder="Verifier 0x…"
              value={verifier}
              onChange={(e) => setVerifier(e.target.value)}
            />
            <Button onClick={prove} disabled={busy || !verifier || !threshold}>
              Generate encrypted proof
            </Button>
            <pre className="text-xs bg-muted/40 p-3 rounded overflow-x-auto">
              {log.join("\n") || "Proofs you generate will be listed here."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
