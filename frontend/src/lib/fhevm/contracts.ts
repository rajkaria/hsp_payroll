/**
 * Sepolia FHEVM contract addresses + minimal ABIs for HashPay
 * Confidential. Populated from `fhevm/deployments.json` after deploy.
 *
 * Kept entirely separate from `frontend/src/lib/contracts.ts` so the HSK
 * surface area is untouched.
 */

export const FHEVM_CHAIN_ID = 11155111; // Sepolia

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const FHEVM_ADDRESSES = {
  ConfidentialUSDT:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_USDT ?? ZERO) as `0x${string}`,
  ConfidentialSalaryIndex:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_SALARY_INDEX ?? ZERO) as `0x${string}`,
  ConfidentialReputationRegistry:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_REPUTATION_REGISTRY ?? ZERO) as `0x${string}`,
  ConfidentialAdvance:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_ADVANCE ?? ZERO) as `0x${string}`,
  PayrollAttestorMirror:
    (process.env.NEXT_PUBLIC_PAYROLL_ATTESTOR_MIRROR ?? ZERO) as `0x${string}`,
  ConfidentialCompliance:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_COMPLIANCE ?? ZERO) as `0x${string}`,
  ConfidentialPayrollRoster:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_PAYROLL_ROSTER ?? ZERO) as `0x${string}`,
  IncomeProver:
    (process.env.NEXT_PUBLIC_INCOME_PROVER ?? ZERO) as `0x${string}`,
  ConfidentialEmployerRunway:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_EMPLOYER_RUNWAY ?? ZERO) as `0x${string}`,
  ConfidentialAdvancePositionNFT:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_ADVANCE_POSITION_NFT ?? ZERO) as `0x${string}`,
  ConfidentialFXOracle:
    (process.env.NEXT_PUBLIC_CONFIDENTIAL_FX_ORACLE ?? ZERO) as `0x${string}`,
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

// ──────────── Tier 1+3 additions to ConfidentialAdvance ────────────
export const ConfidentialAdvanceExtAbi = [
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "postCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releaseCollateral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "outstandingOf",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "collateralOf",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "limitOf",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

// ──────────── Tier 2 ABIs ────────────
export const ConfidentialPayrollRosterAbi = [
  {
    type: "function",
    name: "createRoster",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "addEmployee",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rosterId", type: "uint256" },
      { name: "employee", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "executeRoster",
    stateMutability: "nonpayable",
    inputs: [{ name: "rosterId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rosterEmployees",
    stateMutability: "view",
    inputs: [{ name: "rosterId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
] as const;

export const IncomeProverAbi = [
  {
    type: "function",
    name: "proveAtLeast",
    stateMutability: "nonpayable",
    inputs: [
      { name: "threshold", type: "uint64" },
      { name: "verifier", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "proofOf",
    stateMutability: "view",
    inputs: [
      { name: "employee", type: "address" },
      { name: "verifier", type: "address" },
    ],
    outputs: [
      { type: "bytes32" },
      { type: "uint64" },
      { type: "uint64" },
    ],
  },
] as const;

export const ConfidentialEmployerRunwayAbi = [
  {
    type: "function",
    name: "setPerCycleTotal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedTotal", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "hasLowRunway",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employer", type: "address" },
      { name: "cycles", type: "uint64" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "hasAtLeast",
    stateMutability: "nonpayable",
    inputs: [
      { name: "employer", type: "address" },
      { name: "cycles", type: "uint64" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

export const ConfidentialComplianceAbi = [
  {
    type: "function",
    name: "authorizeChecker",
    stateMutability: "nonpayable",
    inputs: [{ name: "checker", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "exists",
    stateMutability: "view",
    inputs: [{ name: "subject", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

export const ConfidentialAdvancePositionNFTAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "principalOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
