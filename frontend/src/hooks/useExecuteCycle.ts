"use client";

import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from "wagmi";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { useContracts } from "./useContracts";
import { toast } from "sonner";

export function useExecuteCycle() {
  const contracts = useContracts();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function execute(payrollId: bigint) {
    if (!publicClient || !address) {
      toast.error("Wallet not ready", { description: "Connect your wallet and try again." });
      return;
    }

    try {
      // Pre-flight simulation — surfaces the revert reason before we prompt the wallet.
      await publicClient.simulateContract({
        address: contracts.PAYROLL_FACTORY as `0x${string}`,
        abi: PAYROLL_FACTORY_ABI,
        functionName: "executeCycle",
        args: [payrollId],
        account: address,
      });
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      const msg = err.shortMessage || err.message || "Transaction would revert";
      toast.error("Cannot execute cycle", { description: msg.slice(0, 180) });
      return;
    }

    writeContract({
      address: contracts.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "executeCycle",
      args: [payrollId],
    });
  }

  return { execute, hash, isPending, isConfirming, isSuccess, error };
}
