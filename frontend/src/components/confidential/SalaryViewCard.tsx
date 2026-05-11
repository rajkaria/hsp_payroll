"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";
import { encryptUint64, userDecryptUint } from "@/lib/fhevm/client";
import {
  FHEVM_ADDRESSES,
  ConfidentialSalaryIndexAbi,
} from "@/lib/fhevm/contracts";

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
      const auth = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "authorizeViewer",
        args: [counterpartyAddress, FHEVM_ADDRESSES.ConfidentialAdvance],
      });
      toast.success("ConfidentialAdvance authorized as viewer", {
        description: auth,
      });
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
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6]/15 to-[#C084FC]/5 border border-[#8B5CF6]/20 flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-[#C084FC]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Encrypted salary</h3>
          <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
            {mode === "employer" ? "Set & view" : "Decrypt"}
          </p>
        </div>
      </div>

      {mode === "employer" && (
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
            Salary (USD / month) — encrypted client-side
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="5000"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              disabled={busy}
              className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
            />
            <Button
              onClick={setSalary}
              disabled={busy}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0"
            >
              {busy ? "Encrypting…" : "Set"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-4 border-t border-white/5">
        <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
          Decrypted salary — authorized viewers only
        </label>
        <div className="flex gap-2 items-center">
          <div className="font-mono text-2xl flex-1 text-white">
            {decrypted === null
              ? "—"
              : hidden
                ? "••••••"
                : `$${(Number(decrypted) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          {decrypted !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHidden(!hidden)}
              className="text-[#9BA3B7] hover:text-white hover:bg-white/5"
            >
              {hidden ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            onClick={decrypt}
            disabled={busy}
            variant="outline"
            className="bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-[#8B5CF6]/30"
          >
            {busy ? "Decrypting…" : "Decrypt"}
          </Button>
        </div>
      </div>
    </div>
  );
}
