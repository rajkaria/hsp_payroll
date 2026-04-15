// Multi-chain contract addresses — keyed by chainId
export type ContractAddresses = {
  HSP_ADAPTER: string;
  PAYROLL_FACTORY: string;
  MOCK_USDT: string;
  PAYROLL_ATTESTOR: string;
  EAS: string;
  EAS_SCHEMA_UID: string;
};

export const CHAIN_CONTRACTS: Record<number, ContractAddresses> = {
  // HashKey Chain Testnet (133) — HashPay Protocol v2 deploy
  133: {
    HSP_ADAPTER: "0xCE3D31f8170E8f253F457C1Dd4C9D27344028cF7",
    PAYROLL_FACTORY: "0xA601F99D4161062E4d424189376E49C5249792A8",
    MOCK_USDT: "0x85466F956A7d29650042846C916da2ae9eB84d5c",
    PAYROLL_ATTESTOR: "0x7d19a8EfC0df51853D44B51C88ea9B783Ac7D255",
    EAS: "0x4200000000000000000000000000000000000021",
    EAS_SCHEMA_UID: "0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4",
  },
  // Base Sepolia (84532) — deploy with: npx hardhat run scripts/deploy-multichain.ts --network baseSepolia
  84532: {
    HSP_ADAPTER: "0x0000000000000000000000000000000000000000",
    PAYROLL_FACTORY: "0x0000000000000000000000000000000000000000",
    MOCK_USDT: "0x0000000000000000000000000000000000000000",
    PAYROLL_ATTESTOR: "0x0000000000000000000000000000000000000000",
    EAS: "0x4200000000000000000000000000000000000021",
    EAS_SCHEMA_UID: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  // Sepolia (11155111) — HashPay Protocol v2 deploy
  11155111: {
    HSP_ADAPTER: "0x083b4713c7D90506ABD165CeFB59F744522Ac523",
    PAYROLL_FACTORY: "0xD15E9249103E9399eF4FBba85f8e695AA36c3b54",
    MOCK_USDT: "0xCa52178fa3bE627fa51378Be5ef11C8015D1ec23",
    PAYROLL_ATTESTOR: "0x93437997BF08bE7572a503E4CbE4fee70E6DF25B",
    EAS: "0xc2679fBd37d54388cE493f1db75e8dAD8e0b84D5",
    EAS_SCHEMA_UID: "0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4",
  },
};

// Default chain for the app
export const DEFAULT_CHAIN_ID = 11155111; // Sepolia

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = [11155111, 133] as const;

export function getContracts(chainId?: number): ContractAddresses {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  return CHAIN_CONTRACTS[id] ?? CHAIN_CONTRACTS[DEFAULT_CHAIN_ID];
}

export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_CONTRACTS;
}

// Backward compatibility — defaults to HashKey testnet
export const CONTRACTS = CHAIN_CONTRACTS[133];

export const PAYROLL_FACTORY_ABI = [
  // createPayroll
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "frequency", type: "uint256" },
    ],
    name: "createPayroll",
    outputs: [{ name: "payrollId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "fundPayroll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "executeCycle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "cancelPayroll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "withdrawExcess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "addRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipientIndex", type: "uint256" },
    ],
    name: "removeRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "getPayrollDetails",
    outputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "name", type: "string" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "frequency", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "lastExecuted", type: "uint256" },
      { name: "cycleCount", type: "uint256" },
      { name: "totalDeposited", type: "uint256" },
      { name: "totalPaid", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "cycleNumber", type: "uint256" },
    ],
    name: "getReceipts",
    outputs: [
      {
        components: [
          { name: "payrollId", type: "uint256" },
          { name: "cycleNumber", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "hspRequestId", type: "bytes32" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "getRunway",
    outputs: [{ name: "cyclesRemaining", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "payrollCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "escrowBalances",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "getRecipientPayrolls",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "token", type: "address" },
      { indexed: false, name: "name", type: "string" },
    ],
    name: "PayrollCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "newBalance", type: "uint256" },
    ],
    name: "PayrollFunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: false, name: "cycleNumber", type: "uint256" },
      { indexed: false, name: "totalPaid", type: "uint256" },
    ],
    name: "CycleExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "hspRequestId", type: "bytes32" },
    ],
    name: "PaymentSettled",
    type: "event",
  },
] as const;

export const MOCK_ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PAYROLL_ATTESTOR_ABI = [
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "cycleNumber", type: "uint256" },
      { name: "employer", type: "address" },
      { name: "token", type: "address" },
      { name: "tokenSymbol", type: "string" },
    ],
    name: "attestCycle",
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "schemaUID",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "attestationUID", type: "bytes32" },
      { indexed: true, name: "payrollId", type: "uint256" },
      { indexed: false, name: "cycleNumber", type: "uint256" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "PayrollAttested",
    type: "event",
  },
] as const;

export const EAS_ABI = [
  {
    inputs: [{ name: "uid", type: "bytes32" }],
    name: "getAttestation",
    outputs: [
      {
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schema", type: "bytes32" },
          { name: "time", type: "uint64" },
          { name: "expirationTime", type: "uint64" },
          { name: "revocationTime", type: "uint64" },
          { name: "refUID", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "attester", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "data", type: "bytes" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
