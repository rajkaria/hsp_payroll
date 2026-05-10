/**
 * Sepolia FHEVM contract addresses + minimal ABIs for HashPay
 * Confidential. Populated from `fhevm/deployments.json` after deploy.
 *
 * Kept entirely separate from `frontend/src/lib/contracts.ts` so the HSK
 * surface area is untouched.
 */

export const FHEVM_CHAIN_ID = 11155111; // Sepolia

export const FHEVM_ADDRESSES = {
  ConfidentialUSDT:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_USDT ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  ConfidentialSalaryIndex:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_SALARY_INDEX ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
  ConfidentialReputationRegistry:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_REPUTATION_REGISTRY ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
  ConfidentialAdvance:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_ADVANCE ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
  PayrollAttestorMirror:
    (process.env.NEXT_PUBLIC_PAYROLL_ATTESTOR_MIRROR ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

export const ConfidentialSalaryIndexAbi = [
  {
    type: "function",
    name: "registerEmployer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "employer", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setSalary",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "encryptedSalary", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "authorizeViewer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employee", type: "address" },
      { name: "viewer", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "salaryOf",
    stateMutability: "view",
    inputs: [{ name: "employee", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export const ConfidentialReputationRegistryAbi = [
  {
    type: "function",
    name: "scoreOf",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "authorizeViewer",
    stateMutability: "nonpayable",
    inputs: [{ name: "viewer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "lastUpdated",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ type: "uint64" }],
  },
] as const;

export const ConfidentialAdvanceAbi = [
  {
    type: "function",
    name: "requestAdvance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "minScore",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint32" }],
  },
  {
    type: "function",
    name: "salaryMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "requestCount",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "ConfidentialDecisionEmitted",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "requestId", type: "uint256", indexed: true },
    ],
  },
] as const;

export const ConfidentialUSDTAbi = [
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "authorizeBalanceViewer",
    stateMutability: "nonpayable",
    inputs: [{ name: "viewer", type: "address" }],
    outputs: [],
  },
] as const;
