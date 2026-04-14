"use client";

import { useReadContract } from "wagmi";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { useContracts } from "./useContracts";

export function usePayrollCount() {
  const contracts = useContracts();
  return useReadContract({
    address: contracts.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "payrollCount",
  });
}

export function usePayrollDetails(payrollId: bigint) {
  const contracts = useContracts();
  return useReadContract({
    address: contracts.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getPayrollDetails",
    args: [payrollId],
  });
}

export function useEscrowBalance(payrollId: bigint) {
  const contracts = useContracts();
  return useReadContract({
    address: contracts.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "escrowBalances",
    args: [payrollId],
  });
}

export function useRunway(payrollId: bigint) {
  const contracts = useContracts();
  return useReadContract({
    address: contracts.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRunway",
    args: [payrollId],
  });
}

export function useRecipientPayrolls(address: `0x${string}` | undefined) {
  const contracts = useContracts();
  return useReadContract({
    address: contracts.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRecipientPayrolls",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useReceipts(payrollId: bigint, cycleNumber: bigint) {
  const contracts = useContracts();
  return useReadContract({
    address: contracts.PAYROLL_FACTORY as `0x${string}`,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getReceipts",
    args: [payrollId, cycleNumber],
    query: { enabled: cycleNumber > 0n },
  });
}
