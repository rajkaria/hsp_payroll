"use client";

import { useReadContract } from "wagmi";
import { CONTRACTS, PAYROLL_FACTORY_ABI } from "@/config/contracts";

const factoryAddress = CONTRACTS.PAYROLL_FACTORY as `0x${string}`;

export function usePayrollCount() {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "payrollCount",
  });
}

export function usePayrollDetails(payrollId: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getPayrollDetails",
    args: [payrollId],
  });
}

export function useEscrowBalance(payrollId: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "escrowBalances",
    args: [payrollId],
  });
}

export function useRunway(payrollId: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRunway",
    args: [payrollId],
  });
}

export function useRecipientPayrolls(address: `0x${string}` | undefined) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getRecipientPayrolls",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useReceipts(payrollId: bigint, cycleNumber: bigint) {
  return useReadContract({
    address: factoryAddress,
    abi: PAYROLL_FACTORY_ABI,
    functionName: "getReceipts",
    args: [payrollId, cycleNumber],
    query: { enabled: cycleNumber > 0n },
  });
}
