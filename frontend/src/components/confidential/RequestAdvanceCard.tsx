"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Coins, CheckCircle2, AlertCircle } from "lucide-react";
import { encryptUint64, userDecryptUint } from "@/lib/fhevm/client";
import {
  FHEVM_ADDRESSES,
  ConfidentialAdvanceAbi,
  ConfidentialUSDTAbi,
  ConfidentialReputationRegistryAbi,
} from "@/lib/fhevm/contracts";

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
      const authHash = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialReputationRegistry,
        abi: ConfidentialReputationRegistryAbi,
        functionName: "authorizeViewer",
        args: [FHEVM_ADDRESSES.ConfidentialAdvance],
      });
      toast.message("Authorized advance contract", { description: authHash });

      const { handle, proof } = await encryptUint64(
        FHEVM_ADDRESSES.ConfidentialAdvance,
        address,
        cents,
      );

      const hash = await walletClient.writeContract({
        address: FHEVM_ADDRESSES.ConfidentialAdvance,
        abi: ConfidentialAdvanceAbi,
        functionName: "requestAdvance",
        args: [handle, proof],
      });
      toast.success("Confidential advance request submitted", {
        description: hash,
      });
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
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6]/15 to-[#C084FC]/5 border border-[#8B5CF6]/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            Request a confidential advance
          </h3>
          <p className="text-[10px] text-[#5A6178] uppercase tracking-wider">
            FHE-gated underwriting
          </p>
        </div>
      </div>

      <p className="text-xs text-[#9BA3B7] leading-relaxed">
        Your salary, your credit score, and the amount you request are all
        encrypted. The contract decides under FHE — neither HashPay nor any
        observer learns whether you were approved or how much.
      </p>

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold">
          Amount (USD)
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="1200"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            className="bg-white/[0.02] border-white/5 focus-visible:border-[#8B5CF6]/40"
          />
          <Button
            onClick={authorizeAndRequest}
            disabled={busy}
            className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] border-0"
          >
            {busy ? "Working…" : "Encrypt & request"}
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 space-y-2">
        <label className="text-[11px] uppercase tracking-widest text-[#9BA3B7] font-semibold flex items-center gap-1.5">
          <Coins className="w-3 h-3 text-[#10B981]" /> Encrypted cUSDT balance
        </label>
        <div className="flex gap-2 items-center">
          <div className="font-mono text-2xl flex-1 text-white">
            {decryptedBalance === null
              ? "—"
              : `$${(Number(decryptedBalance) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <Button
            onClick={decryptBalance}
            disabled={busy}
            variant="outline"
            className="bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-[#8B5CF6]/30"
          >
            {busy ? "Decrypting…" : "Decrypt"}
          </Button>
        </div>
        {delta !== null && delta > 0n && (
          <div className="text-xs text-[#10B981] flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved · disbursed $
            {(Number(delta) / 100).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        )}
        {delta !== null && delta === 0n && (
          <div className="text-xs text-[#E7C97F] flex items-center gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5" /> No balance change — likely
            denied (the chain doesn&apos;t reveal which).
          </div>
        )}
      </div>
    </div>
  );
}
