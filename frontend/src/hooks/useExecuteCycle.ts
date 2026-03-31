"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

export function useExecuteCycle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function execute(payrollId: bigint) {
    writeContract({
      address: CONTRACTS.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "executeCycle",
      args: [payrollId],
    });
  }

  return { execute, hash, isPending, isConfirming, isSuccess, error };
}
