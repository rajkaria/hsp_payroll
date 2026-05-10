"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Coins } from "lucide-react";
import { encryptUint64, userDecryptUint } from "@/lib/fhevm/client";
import {
  FHEVM_ADDRESSES,
  ConfidentialAdvanceAbi,
  ConfidentialUSDTAbi,
  ConfidentialReputationRegistryAbi,
} from "@/lib/fhevm/contracts";

/**
 * RequestAdvanceCard
 *
 * The novel piece: borrower asks for an encrypted amount; the contract
 * underwrites it under FHE; the borrower decrypts their own resulting
 * cUSDT balance to see whether the advance was approved.
 */
export function RequestAdvanceCard() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);
  const [previousBalance, setPreviousBalance] = useState<bigint | null>(null);

  const authorizeAndRequest = async () => {
    if (!address || !walletClient || !publicClient) return;
    const cents = BigInt(Math.round(Number(amount) * 100));
    if (cents <= 0n) {
      toast.error("Enter an advance amount greater than zero");
      return;
    }
    setBusy(true);
    try {
      // 1. Authorize ConfidentialAdvance to read the borrower's score.
      const authHash = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialReputationRegistry,
        abi: ConfidentialReputationRegistryAbi,
        functionName: "authorizeViewer",
        args: [FHEVM_ADDRESSES.ConfidentialAdvance],
      });
      toast.message("Authorized advance contract", { description: authHash });

      // 2. Encrypt requested amount client-side.
      const { handle, proof } = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialAdvance,
        address,
        cents,
      );

      // 3. Call requestAdvance.
      const hash = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialAdvance,
        abi: ConfidentialAdvanceAbi,
        functionName: "requestAdvance",
        args: [handle, proof],
      });
      toast.success("Confidential advance request submitted", { description: hash });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Request failed", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const decryptBalance = async () => {
    if (!address || !walletClient || !publicClient) return;
    setBusy(true);
    try {
      const handle = (await publicClient.readContract({
        address: FHEVM_ADDRESSES.ConfidentialUSDT,
        abi: ConfidentialUSDTAbi,
        functionName: "confidentialBalanceOf",
        args: [address],
      })) as `0x${string}`;
      const value = await userDecryptUint(
        handle,
        FHEVM_ADDRESSES.ConfidentialUSDT,
        {
          address,
          signTypedData: walletClient.signTypedData.bind(walletClient),
        },
      );
      setPreviousBalance(decryptedBalance);
      setDecryptedBalance(value);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Decryption failed", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const delta =
    previousBalance !== null && decryptedBalance !== null
      ? decryptedBalance - previousBalance
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Request a confidential advance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-sm text-muted-foreground">
          Your salary, your credit score, and the amount you request are all
          encrypted. The contract decides under FHE — neither HashPay nor
          any observer learns whether you were approved or how much.
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Amount (USD)
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="1200"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
            <Button onClick={authorizeAndRequest} disabled={busy}>
              {busy ? "Working..." : "Encrypt & request"}
            </Button>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <Coins className="size-4" /> Encrypted cUSDT balance
          </label>
          <div className="flex gap-2 items-center">
            <div className="font-mono text-2xl flex-1">
              {decryptedBalance === null
                ? "—"
                : `$${(Number(decryptedBalance) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <Button onClick={decryptBalance} disabled={busy} variant="outline">
              {busy ? "Decrypting..." : "Decrypt"}
            </Button>
          </div>
          {delta !== null && delta > 0n && (
            <div className="text-sm text-emerald-500">
              ✓ Approved. Disbursed{" "}
              ${(Number(delta) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}.
            </div>
          )}
          {delta !== null && delta === 0n && (
            <div className="text-sm text-amber-500">
              Request did not increase your balance — likely denied (or you
              haven&apos;t requested yet). The chain doesn&apos;t reveal which.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
