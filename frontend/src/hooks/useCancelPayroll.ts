"use client";

import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useAccount } from "wagmi";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { useContracts } from "./useContracts";
import { toast } from "sonner";

export function useCancelPayroll() {
  const contracts = useContracts();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function cancel(payrollId: bigint) {
    if (!publicClient || !address) {
      toast.error("Wallet not ready", { description: "Connect your wallet and try again." });
      return;
    }

    try {
      await publicClient.simulateContract({
        address: contracts.PAYROLL_FACTORY as `0x${string}`,
        abi: PAYROLL_FACTORY_ABI,
        functionName: "cancelPayroll",
        args: [payrollId],
        account: address,
      });
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      const msg = err.shortMessage || err.message || "Transaction would revert";
      toast.error("Cannot cancel payroll", { description: msg.slice(0, 180) });
      return;
    }

    writeContract({
      address: contracts.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "cancelPayroll",
      args: [payrollId],
    });
  }

  return { cancel, hash, isPending, isConfirming, isSuccess, error };
}
