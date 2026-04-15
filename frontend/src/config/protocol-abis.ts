// ABIs for HashPay protocol primitives (read-heavy; only the shapes the UI needs).

export const REPUTATION_REGISTRY_ABI = [
  { inputs: [{ name: "recipient", type: "address" }], name: "incomeOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "employersOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "onTimeRate", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "attestationsOf", outputs: [{ type: "bytes32[]" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "historyOf",
    outputs: [{
      components: [
        { name: "employer", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "timestamp", type: "uint256" },
        { name: "uid", type: "bytes32" },
        { name: "onTime", type: "bool" },
      ],
      name: "",
      type: "tuple[]",
    }],
    stateMutability: "view", type: "function",
  },
  { inputs: [
      { name: "recipient", type: "address" },
      { name: "minAmount", type: "uint256" },
      { name: "windowSeconds", type: "uint256" }
    ], name: "verifyMinimumIncome", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "highestMilestone", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const ADAPTIVE_CADENCE_ABI = [
  { inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "mode", type: "uint8" },
      { name: "canSwitch", type: "bool" },
      { name: "hybridStreamBps", type: "uint256" },
    ], name: "setCadencePolicy", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "mode", type: "uint8" }], name: "setRecipientCadence", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "claim", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "recipient", type: "address" }], name: "accruedFor", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "payrollId", type: "uint256" }, { name: "recipient", type: "address" }],
    name: "getCadenceState",
    outputs: [{
      components: [
        { name: "mode", type: "uint8" },
        { name: "lastClaimTime", type: "uint256" },
        { name: "accruedBalance", type: "uint256" },
        { name: "committedBalance", type: "uint256" },
        { name: "cyclesAvailable", type: "uint256" },
        { name: "streamRate", type: "uint256" },
        { name: "hybridStreamBps", type: "uint256" },
        { name: "recipientCanSwitch", type: "bool" },
        { name: "configured", type: "bool" },
      ],
      name: "", type: "tuple",
    }],
    stateMutability: "view", type: "function",
  },
] as const;

export const YIELD_ESCROW_ABI = [
  { inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "vault", type: "address" },
      { name: "autoCompound", type: "bool" },
    ], name: "enableYield", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "disableYield", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "claimYield", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "availableBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "accruedYield", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "cycleCost", type: "uint256" }
    ], name: "runwayWithYield", outputs: [
      { name: "baseCycles", type: "uint256" },
      { name: "extendedCycles", type: "uint256" }
    ], stateMutability: "view", type: "function" },
] as const;

export const PAYROLL_ADVANCE_ABI = [
  { inputs: [{ name: "recipient", type: "address" }, { name: "payrollId", type: "uint256" }], name: "maxAdvanceFor", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "tierFor", outputs: [{ name: "ltvBps", type: "uint256" }, { name: "interestBps", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "recipient", type: "address" }], name: "outstandingDebt", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "amount", type: "uint256" }], name: "requestAdvance", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], name: "fundLenderPool", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }, { name: "shares", type: "uint256" }], name: "withdrawFromPool", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "token", type: "address" }], name: "lenderPoolBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "token", type: "address" }, { name: "lender", type: "address" }], name: "lenderShares", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const COMPLIANCE_REGISTRY_ABI = [
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "hook", type: "address" }], name: "attachHook", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }, { name: "hook", type: "address" }], name: "detachHook", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "payrollId", type: "uint256" }], name: "getHooks", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" }
    ], name: "runHooks", outputs: [
      { name: "passed", type: "bool" },
      { name: "reason", type: "string" }
    ], stateMutability: "view", type: "function" },
] as const;
