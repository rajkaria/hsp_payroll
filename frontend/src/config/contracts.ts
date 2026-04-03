// Contract addresses — update after deployment to HashKey Chain testnet
export const CONTRACTS = {
  HSP_ADAPTER: "0xa31558b2c364B269Ac823798AefcA7E285Af3487",
  PAYROLL_FACTORY: "0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb",
  MOCK_USDT: "0xcd367c583fd028C12Cc038d744cE7B2a67d848E2",
  PAYROLL_ATTESTOR: "0x0000000000000000000000000000000000000000", // Update after deployment
  EAS: "0x4200000000000000000000000000000000000021",
} as const;

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
