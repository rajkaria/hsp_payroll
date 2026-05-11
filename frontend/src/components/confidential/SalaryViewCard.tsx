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

type SetStage =
  | null
  | "awaiting-sdk"
  | "building-proof"
  | "submitting-to-relayer"
  | "signing-set"
  | "signing-auth"
  | "done";

type DecryptStage =
  | null
  | "fetching"
  | "signing"
  | "decrypting"
  | "done";

const setStageText: Record<Exclude<SetStage, null | "done">, string> = {
  "awaiting-sdk": "Waiting for FHE SDK to warm up…",
  "building-proof": "Computing ZK proof locally…",
  "submitting-to-relayer": "Sending proof to Zama relayer…",
  "signing-set": "Confirm setSalary in wallet…",
  "signing-auth": "Confirm viewer auth in wallet…",
};

const decryptStageText: Record<Exclude<DecryptStage, null | "done">, string> = {
  fetching: "Fetching encrypted handle…",
  signing: "Sign decryption request…",
  decrypting: "Decrypting via relayer…",
};

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
  const [setStage, setSetStage] = useState<SetStage>(null);
  const [decryptStage, setDecryptStage] = useState<DecryptStage>(null);
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [hidden, setHidden] = useState(true);

  const setBusy = setStage !== null && setStage !== "done";
  const decryptBusy = decryptStage !== null && decryptStage !== "done";

  const setSalary = async () => {
    if (!address || !walletClient) return;
    const cents = BigInt(Math.round(Number(salaryInput) * 100));
    if (cents <= 0n) {
      toast.error("Enter a salary greater than zero");
      return;
    }
    const t0 = performance.now();
    try {
      setSetStage("awaiting-sdk");
      const { handle, proof } = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        address,
        cents,
        (phase) => {
          if (phase === "awaiting-sdk") setSetStage("awaiting-sdk");
          else if (phase === "building-proof") setSetStage("building-proof");
          else if (phase === "submitting-to-relayer")
            setSetStage("submitting-to-relayer");
        },
      );
      console.info(
        `[salary] encrypt total ${Math.round(performance.now() - t0)}ms`,
      );

      setSetStage("signing-set");
      const hash = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "setSalary",
        args: [counterpartyAddress, handle, proof],
      });
      toast.success("Encrypted salary submitted", { description: hash });

      setSetStage("signing-auth");
      const auth = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "authorizeViewer",
        args: [counterpartyAddress, FHEVM_ADDRESSES.ConfidentialAdvance],
      });
      toast.success("ConfidentialAdvance authorized as viewer", {
        description: auth,
      });
      setSetStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Failed to set salary", { description: msg });
      setSetStage(null);
    } finally {
      setTimeout(() => setSetStage(null), 1500);
    }
  };

  const decrypt = async () => {
    if (!address || !walletClient || !publicClient) return;
    try {
      setDecryptStage("fetching");
      const target = mode === "employee" ? address : counterpartyAddress;
      const handle = (await publicClient.readContract({
        address: FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        abi: ConfidentialSalaryIndexAbi,
        functionName: "salaryOf",
        args: [target],
      })) as `0x${string}`;

      setDecryptStage("signing");
      const signTypedData = async (params: Parameters<typeof walletClient.signTypedData>[0]) => {
        return walletClient.signTypedData(params);
      };

      setDecryptStage("decrypting");
      const value = await userDecryptUint(
        handle,
        FHEVM_ADDRESSES.ConfidentialSalaryIndex,
        { address, signTypedData },
      );
      setDecrypted(value);
      setHidden(false);
      setDecryptStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Decryption failed", { description: msg });
      setDecryptStage(null);
    } finally {
      setTimeout(() => setDecryptStage(null), 1500);
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
              disabled={setBusy}
              className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
            />
            <Button
              onClick={setSalary}
              disabled={setBusy}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0 min-w-[110px]"
            >
              {setBusy ? "Working…" : "Set"}
            </Button>
          </div>
          {setBusy && setStage ? (
            <div className="flex items-center gap-2 text-[11px] text-[#C084FC] pt-1">
              <div className="w-3 h-3 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#C084FC] animate-spin" />
              <span>{setStageText[setStage]}</span>
              {setStage === "submitting-to-relayer" ? (
                <span className="text-[#5A6178]">
                  · 20–60s typical on Sepolia
                </span>
              ) : null}
            </div>
          ) : null}
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
            disabled={decryptBusy}
            variant="outline"
            className="bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-[#8B5CF6]/30 min-w-[110px]"
          >
            {decryptBusy ? "Working…" : "Decrypt"}
          </Button>
        </div>
        {decryptBusy && decryptStage ? (
          <div className="flex items-center gap-2 text-[11px] text-[#06B6D4] pt-1">
            <div className="w-3 h-3 rounded-full border-2 border-[#06B6D4]/30 border-t-[#06B6D4] animate-spin" />
            <span>{decryptStageText[decryptStage]}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
