"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { useContracts } from "./useContracts";

export function useCreatePayroll() {
  const contracts = useContracts();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function create(
    name: string,
    token: `0x${string}`,
    recipients: `0x${string}`[],
    amounts: bigint[],
    frequency: bigint
  ) {
    writeContract({
      address: contracts.PAYROLL_FACTORY as `0x${string}`,
      abi: PAYROLL_FACTORY_ABI,
      functionName: "createPayroll",
      args: [name, token, recipients, amounts, frequency],
    });
  }

  return { create, hash, isPending, isConfirming, isSuccess, error };
}
