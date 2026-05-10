"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";
import { encryptUint64, userDecryptUint } from "@/lib/fhevm/client";
import {
  FHEVM_ADDRESSES,
  ConfidentialSalaryIndexAbi,
} from "@/lib/fhevm/contracts";

/**
 * SalaryViewCard
 *
 * Two operations on the same encrypted record:
 *   - Employer mode: enters a USD salary, encrypts it client-side, and
 *     calls setSalary on ConfidentialSalaryIndex. The number never goes
 *     on-chain in plaintext.
 *   - Employee mode: fetches the encrypted handle, asks the relayer for
 *     a user-decryption (gated by EIP-712 signature), and shows the
 *     plaintext locally.
 */
export function SalaryViewCard({
  mode,
  counterpartyAddress,
}: {
  mode: "employer" | "employee";
  counterpartyAddress: `0x${string}`;
}) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [salaryInput, setSalaryInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [hidden, setHidden] = useState(true);

  const setSalary = async () => {
    if (!address || !walletClient) return;
    const cents = BigInt(Math.round(Number(salaryInput) * 100));
    if (cents <= 0n) {
      toast.error("Enter a salary greater than zero");
      return;
    }
    setBusy(true);
    try {
      const { handle, proof } = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        address,
        cents,
      );
      const hash = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "setSalary",
        args: [counterpartyAddress, handle, proof],
      });
      toast.success("Encrypted salary submitted", { description: hash });
      // Authorize the advance contract to read it.
      const auth = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "authorizeViewer",
        args: [counterpartyAddress, FHEVM_ADDRESSES.ConfidentialAdvance],
      });
      toast.success("ConfidentialAdvance authorized as viewer", { description: auth });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Failed to set salary", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const decrypt = async () => {
    if (!address || !walletClient || !publicClient) return;
    setBusy(true);
    try {
      const target = mode === "employee" ? address : counterpartyAddress;
      const handle = (await publicClient.readContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "salaryOf",
        args: [target],
      })) as `0x${string}`;
      const value = await userDecryptUint(
        handle,
        FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        {
          address,
          signTypedData: walletClient.signTypedData.bind(walletClient),
        },
      );
      setDecrypted(value);
      setHidden(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Decryption failed", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4" />
          Encrypted salary
          <span className="text-xs text-muted-foreground font-normal">
            ({mode === "employer" ? "set & view" : "decrypt"})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "employer" && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Salary (USD per month) — encrypted client-side before submit
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="5000"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                disabled={busy}
              />
              <Button onClick={setSalary} disabled={busy}>
                {busy ? "Encrypting..." : "Set encrypted salary"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Decrypted salary (only visible to authorized viewers)
          </label>
          <div className="flex gap-2 items-center">
            <div className="font-mono text-2xl flex-1">
              {decrypted === null
                ? "—"
                : hidden
                  ? "••••••"
                  : `$${(Number(decrypted) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            {decrypted !== null && (
              <Button variant="ghost" size="sm" onClick={() => setHidden(!hidden)}>
                {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
            )}
            <Button onClick={decrypt} disabled={busy} variant="outline">
              {busy ? "Decrypting..." : "Decrypt"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
