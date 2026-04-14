"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { useContracts } from "./useContracts";

export function useExecuteCycle() {
  const contracts = useContracts();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function execute(payrollId: bigint) {
    writeContract({
      address: contracts.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "executeCycle",
      args: [payrollId],
    });
  }

  return { execute, hash, isPending, isConfirming, isSuccess, error };
}
