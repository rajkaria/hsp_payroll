// HashPay ABIs — copied from frontend/src/config so the MCP server is
// publishable standalone with no path-dependent imports.

export const PAYROLL_FACTORY_ABI = [
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
    inputs: [{ name: "payrollId", type: "uint256" }, { name: "amount", type: "uint256" }],
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
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "addRecipient",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }, { name: "recipientIndex", type: "uint256" }],
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
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
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
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  { inputs: [{ name: "recipient", type: "address" }], name: "incomeOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "employersOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "onTimeRate", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "attestationsOf", outputs: [{ type: "bytes32[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "highestMilestone", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "minAmount", type: "uint256" },
      { name: "windowSeconds", type: "uint256" },
    ],
    name: "verifyMinimumIncome",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ADAPTIVE_CADENCE_ABI = [
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "mode", type: "uint8" },
      { name: "canSwitch", type: "bool" },
      { name: "hybridStreamBps", type: "uint256" },
    ],
    name: "setCadencePolicy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }, { name: "mode", type: "uint8" }],
    name: "setRecipientCadence",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }],
    name: "claim",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }, { name: "recipient", type: "address" }],
    name: "accruedFor",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const YIELD_ESCROW_ABI = [
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "vault", type: "address" },
      { name: "autoCompound", type: "bool" },
    ],
    name: "enableYield",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "disableYield", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "claimYield", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "availableBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "accruedYield", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const PAYROLL_ADVANCE_ABI = [
  {
    inputs: [{ name: "recipient", type: "address" }, { name: "payrollId", type: "uint256" }],
    name: "maxAdvanceFor",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "tierFor",
    outputs: [
      { name: "ltvBps", type: "uint256" },
      { name: "interestBps", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "outstandingDebt",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "payrollId", type: "uint256" }, { name: "amount", type: "uint256" }],
    name: "requestAdvance",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }],
    name: "fundLenderPool",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }, { name: "shares", type: "uint256" }],
    name: "withdrawFromPool",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [{ name: "token", type: "address" }], name: "lenderPoolBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const COMPLIANCE_REGISTRY_ABI = [
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "hook", type: "address" }], name: "attachHook", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "hook", type: "address" }], name: "detachHook", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "getHooks", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  {
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "runHooks",
    outputs: [
      { name: "passed", type: "bool" },
      { name: "reason", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const SALARY_INDEX_ABI = [
  {
    inputs: [{ name: "role", type: "string" }, { name: "region", type: "string" }],
    name: "indexFor",
    outputs: [
      { name: "price", type: "int256" },
      { name: "updatedAt", type: "uint256" },
    ],
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
    outputs: [{ type: "bytes32[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "schemaUID", outputs: [{ type: "bytes32" }], stateMutability: "view", type: "function" },
] as const;
