"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { ConnectGate } from "@/components/connect-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gauge } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  ConfidentialEmployerRunwayAbi,
} from "@/lib/fhevm/contracts";
import { encryptUint64 } from "@/lib/fhevm/client";

/**
 * /confidential/runway
 *
 * Encrypted runway alerting for employers. The per-cycle total and the
 * cUSDT balance are both encrypted; this page lets the employer set
 * the per-cycle total and check whether they have at least N cycles of
 * runway left — without revealing balance or burn rate to the chain.
 */
export default function ConfidentialRunwayPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [perCycle, setPerCycle] = useState("");
  const [cycles, setCycles] = useState("2");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  async function setTotal() {
    if (!address) return;
    setBusy(true);
    try {
      const cents = BigInt(Math.round(parseFloat(perCycle) * 100));
      const enc = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialEmployerRunway,
        address,
        cents,
      );
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialEmployerRunway,
        abi: ConfidentialEmployerRunwayAbi,
        functionName: "setPerCycleTotal",
        args: [enc.handle, enc.proof],
      });
      setLog((l) => [...l, `setPerCycleTotal: ${tx}`]);
    } finally {
      setBusy(false);
    }
  }

  async function checkLow() {
    if (!address) return;
    setBusy(true);
    try {
      const tx = await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialEmployerRunway,
        abi: ConfidentialEmployerRunwayAbi,
        functionName: "hasLowRunway",
        args: [address, BigInt(cycles)],
      });
      setLog((l) => [
        ...l,
        `hasLowRunway(${cycles}): ${tx} — decrypt the returned ebool client-side`,
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConnectGate>
      <div className="container mx-auto max-w-3xl py-10 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wider">
            <Gauge className="size-3" /> Encrypted employer runway
          </div>
          <h1 className="text-3xl font-semibold mt-2">Confidential runway</h1>
          <p className="text-muted-foreground mt-1">
            Track payroll runway without publishing your burn rate. The
            balance and per-cycle total are both encrypted.
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
            <CardTitle>Encrypted per-cycle total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Per-cycle total (USD)"
              value={perCycle}
              onChange={(e) => setPerCycle(e.target.value)}
            />
            <Button onClick={setTotal} disabled={busy || !perCycle}>
              Encrypt + set
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low-runway alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Cycles threshold"
              value={cycles}
              onChange={(e) => setCycles(e.target.value)}
            />
            <Button onClick={checkLow} disabled={busy || !cycles}>
              Check (encrypted boolean)
            </Button>
            <pre className="text-xs bg-muted/40 p-3 rounded overflow-x-auto">
              {log.join("\n") || "Activity will appear here."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </ConnectGate>
  );
}
