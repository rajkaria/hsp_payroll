"use client";

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { CONTRACTS, PAYROLL_ATTESTOR_ABI, EAS_ABI } from "@/config/contracts";
import { decodeAbiParameters } from "viem";

export function useAttestCycle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function attest(
    payrollId: bigint,
    cycleNumber: bigint,
    employer: `0x${string}`,
    token: `0x${string}`,
    tokenSymbol: string
  ) {
    writeContract({
      address: CONTRACTS.PAYROLL_ATTESTOR as `0x${string}`,
      abi: PAYROLL_ATTESTOR_ABI,
      functionName: "attestCycle",
      args: [payrollId, cycleNumber, employer, token, tokenSymbol],
    });
  }

  return { attest, hash, isPending, isConfirming, isSuccess, error };
}

export function useAttestationData(uid: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.EAS as `0x${string}`,
    abi: EAS_ABI,
    functionName: "getAttestation",
    args: uid ? [uid] : undefined,
    query: { enabled: !!uid && uid !== "0x0000000000000000000000000000000000000000000000000000000000000000" },
  });

  if (!data) return { attestation: null, decoded: null, isLoading, error };

  const attestation = {
    uid: data.uid,
    schema: data.schema,
    time: data.time,
    recipient: data.recipient,
    attester: data.attester,
    revocable: data.revocable,
    data: data.data,
  };

  // Decode the custom data
  let decoded = null;
  try {
    const params = decodeAbiParameters(
      [
        { name: "payrollId", type: "bytes32" },
        { name: "cycleNumber", type: "uint256" },
        { name: "employer", type: "address" },
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "token", type: "address" },
        { name: "hspRequestId", type: "bytes32" },
        { name: "tokenSymbol", type: "string" },
      ],
      data.data
    );
    decoded = {
      payrollId: params[0],
      cycleNumber: Number(params[1]),
      employer: params[2],
      recipient: params[3],
      amount: params[4],
      token: params[5],
      hspRequestId: params[6],
      tokenSymbol: params[7],
    };
  } catch {
    // Data might not be decodable
  }

  return { attestation, decoded, isLoading, error };
}
