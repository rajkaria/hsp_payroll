"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PAYROLL_FACTORY_ABI, MOCK_ERC20_ABI } from "@/config/contracts";
import { useContracts } from "./useContracts";

export function useFundPayroll() {
  const contracts = useContracts();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function fund(payrollId: bigint, amount: bigint) {
    writeContract({
      address: contracts.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "fundPayroll",
      args: [payrollId, amount],
    });
  }

  return { fund, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveToken() {
  const contracts = useContracts();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function approve(token: `0x${string}`, amount: bigint) {
    writeContract({
      address: token,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [contracts.PAYROLL_FACTORY as `0x${string}`, amount],
    });
  }

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
