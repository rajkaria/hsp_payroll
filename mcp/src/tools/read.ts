// Tier 1 — Read tools. No signing, no keys needed.

import { z } from "zod";
import {
  CHAIN_REGISTRY,
  addressUrl,
  allowedChainIds,
  getChainEntry,
  requireCore,
  requireProtocol,
} from "../chains.js";
import { publicClient } from "../clients.js";
import { serializeBigints } from "../safety.js";
import {
  PAYROLL_FACTORY_ABI,
  REPUTATION_REGISTRY_ABI,
  PAYROLL_ADVANCE_ABI,
  YIELD_ESCROW_ABI,
  ADAPTIVE_CADENCE_ABI,
  COMPLIANCE_REGISTRY_ABI,
  SALARY_INDEX_ABI,
  ERC20_ABI,
} from "../abis.js";
import { AddressSchema, ChainIdSchema, PayrollIdSchema } from "../schemas.js";

export type Tool = {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (args: unknown) => Promise<unknown>;
};

export const readTools: Tool[] = [
  {
    name: "hashpay_list_chains",
    description:
      "List all chains supported by HashPay. For each chain returns status (deployed/undeployed), name, chainId, and deployed contract addresses.",
    inputSchema: z.object({}),
    handler: async () => {
      const allowed = new Set(allowedChainIds());
      return Object.entries(CHAIN_REGISTRY).map(([id, entry]) => ({
        chainId: Number(id),
        name: entry.chain.name,
        status: entry.status,
        allowedBySession: allowed.has(Number(id)),
        isTestnet: entry.chain.testnet ?? false,
        explorer: entry.chain.blockExplorers?.default.url,
        rpcUrlEnv: entry.rpcUrlEnv,
        core: entry.core,
        protocol: entry.protocol,
      }));
    },
  },

  {
    name: "hashpay_get_payroll",
    description:
      "Read full state of a payroll: owner, token, name, recipients, amounts, frequency, cycle count, totals, active flag, and current escrow balance.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
    }),
    handler: async (args) => {
      const { chainId, payrollId } = args as {
        chainId: number;
        payrollId: bigint;
      };
      const factory = requireCore(chainId, "PAYROLL_FACTORY");
      const pc = publicClient(chainId);

      const [details, escrow] = await Promise.all([
        pc.readContract({
          address: factory,
          abi: PAYROLL_FACTORY_ABI,
          functionName: "getPayrollDetails",
          args: [payrollId],
        }),
        pc.readContract({
          address: factory,
          abi: PAYROLL_FACTORY_ABI,
          functionName: "escrowBalances",
          args: [payrollId],
        }),
      ]);

      return serializeBigints({
        chainId,
        payrollId: payrollId.toString(),
        owner: (details as unknown[])[0],
        token: (details as unknown[])[1],
        name: (details as unknown[])[2],
        recipients: (details as unknown[])[3],
        amounts: (details as unknown[])[4],
        frequencySeconds: (details as unknown[])[5],
        startTime: (details as unknown[])[6],
        lastExecuted: (details as unknown[])[7],
        cycleCount: (details as unknown[])[8],
        totalDeposited: (details as unknown[])[9],
        totalPaid: (details as unknown[])[10],
        active: (details as unknown[])[11],
        escrowBalance: escrow,
      });
    },
  },

  {
    name: "hashpay_list_payrolls_by_recipient",
    description:
      "Returns all payroll IDs that include the given recipient address. Useful for agents checking who's paying them.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      recipient: AddressSchema,
    }),
    handler: async (args) => {
      const { chainId, recipient } = args as {
        chainId: number;
        recipient: `0x${string}`;
      };
      const factory = requireCore(chainId, "PAYROLL_FACTORY");
      const pc = publicClient(chainId);
      const ids = await pc.readContract({
        address: factory,
        abi: PAYROLL_FACTORY_ABI,
        functionName: "getRecipientPayrolls",
        args: [recipient],
      });
      return { chainId, recipient, payrollIds: serializeBigints(ids) };
    },
  },

  {
    name: "hashpay_get_reputation",
    description:
      "Read reputation metrics for any address from ReputationRegistry. Returns cumulative income, distinct employer count, on-time payment rate (bps), and highest milestone reached. Use this to judge agent or contributor reliability.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      address: AddressSchema,
    }),
    handler: async (args) => {
      const { chainId, address } = args as {
        chainId: number;
        address: `0x${string}`;
      };
      const reg = requireProtocol(chainId, "REPUTATION_REGISTRY");
      const pc = publicClient(chainId);
      const [income, employers, onTime, milestone] = await Promise.all([
        pc.readContract({ address: reg, abi: REPUTATION_REGISTRY_ABI, functionName: "incomeOf", args: [address] }),
        pc.readContract({ address: reg, abi: REPUTATION_REGISTRY_ABI, functionName: "employersOf", args: [address] }),
        pc.readContract({ address: reg, abi: REPUTATION_REGISTRY_ABI, functionName: "onTimeRate", args: [address] }),
        pc.readContract({ address: reg, abi: REPUTATION_REGISTRY_ABI, functionName: "highestMilestone", args: [address] }),
      ]);
      return serializeBigints({
        chainId,
        address,
        cumulativeIncome: income,
        distinctEmployers: employers,
        onTimeRateBps: onTime,
        highestMilestoneIncome: milestone,
        explorerUrl: addressUrl(chainId, address),
      });
    },
  },

  {
    name: "hashpay_verify_minimum_income",
    description:
      "Oracle-style predicate: returns true if the address received at least `minAmount` within the last `windowSeconds`. Useful for gating (lending decisions, visa attestations, premium feature access).",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      address: AddressSchema,
      minAmount: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
      windowSeconds: z.number().int().positive(),
    }),
    handler: async (args) => {
      const { chainId, address, minAmount, windowSeconds } = args as {
        chainId: number;
        address: `0x${string}`;
        minAmount: bigint;
        windowSeconds: number;
      };
      const reg = requireProtocol(chainId, "REPUTATION_REGISTRY");
      const pc = publicClient(chainId);
      const ok = await pc.readContract({
        address: reg,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "verifyMinimumIncome",
        args: [address, minAmount, BigInt(windowSeconds)],
      });
      return { chainId, address, minAmount: minAmount.toString(), windowSeconds, verified: ok };
    },
  },

  {
    name: "hashpay_get_advance_quote",
    description:
      "Quote the advance (earned-wage loan) terms for a recipient: their LTV-bps tier, APR-bps rate (priced to reputation), max available advance against a specific payroll, and current outstanding debt.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      recipient: AddressSchema,
      payrollId: PayrollIdSchema,
    }),
    handler: async (args) => {
      const { chainId, recipient, payrollId } = args as {
        chainId: number;
        recipient: `0x${string}`;
        payrollId: bigint;
      };
      const adv = requireProtocol(chainId, "PAYROLL_ADVANCE");
      const pc = publicClient(chainId);
      const [tier, maxAdvance, debt] = await Promise.all([
        pc.readContract({ address: adv, abi: PAYROLL_ADVANCE_ABI, functionName: "tierFor", args: [recipient] }),
        pc.readContract({ address: adv, abi: PAYROLL_ADVANCE_ABI, functionName: "maxAdvanceFor", args: [recipient, payrollId] }),
        pc.readContract({ address: adv, abi: PAYROLL_ADVANCE_ABI, functionName: "outstandingDebt", args: [recipient] }),
      ]);
      return serializeBigints({
        chainId,
        recipient,
        payrollId: payrollId.toString(),
        ltvBps: (tier as unknown[])[0],
        interestBps: (tier as unknown[])[1],
        maxAdvance,
        outstandingDebt: debt,
      });
    },
  },

  {
    name: "hashpay_get_yield_state",
    description:
      "Read the yield-bearing escrow state for a payroll: available balance and accrued (not-yet-claimed) yield.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
    }),
    handler: async (args) => {
      const { chainId, payrollId } = args as { chainId: number; payrollId: bigint };
      const ye = requireProtocol(chainId, "YIELD_ESCROW");
      const pc = publicClient(chainId);
      const [available, accrued] = await Promise.all([
        pc.readContract({ address: ye, abi: YIELD_ESCROW_ABI, functionName: "availableBalance", args: [payrollId] }),
        pc.readContract({ address: ye, abi: YIELD_ESCROW_ABI, functionName: "accruedYield", args: [payrollId] }),
      ]);
      return serializeBigints({ chainId, payrollId: payrollId.toString(), availableBalance: available, accruedYield: accrued });
    },
  },

  {
    name: "hashpay_get_streamed_balance",
    description:
      "For a recipient in STREAM or HYBRID cadence, returns how much has accrued but not yet been claimed for a given payroll.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      recipient: AddressSchema,
    }),
    handler: async (args) => {
      const { chainId, payrollId, recipient } = args as {
        chainId: number;
        payrollId: bigint;
        recipient: `0x${string}`;
      };
      const ac = requireProtocol(chainId, "ADAPTIVE_CADENCE");
      const pc = publicClient(chainId);
      const accrued = await pc.readContract({
        address: ac,
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "accruedFor",
        args: [payrollId, recipient],
      });
      return serializeBigints({ chainId, payrollId: payrollId.toString(), recipient, accrued });
    },
  },

  {
    name: "hashpay_get_compliance_hooks",
    description:
      "List the compliance hooks attached to a payroll, and preview whether a prospective payment would pass them (with a human-readable reason if it would fail).",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      recipient: AddressSchema,
      amount: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
    }),
    handler: async (args) => {
      const { chainId, payrollId, recipient, amount } = args as {
        chainId: number;
        payrollId: bigint;
        recipient: `0x${string}`;
        amount: bigint;
      };
      const cr = requireProtocol(chainId, "COMPLIANCE_REGISTRY");
      const pc = publicClient(chainId);
      const [hooks, result] = await Promise.all([
        pc.readContract({ address: cr, abi: COMPLIANCE_REGISTRY_ABI, functionName: "getHooks", args: [payrollId] }),
        pc.readContract({ address: cr, abi: COMPLIANCE_REGISTRY_ABI, functionName: "runHooks", args: [payrollId, recipient, amount] }),
      ]);
      return serializeBigints({
        chainId,
        payrollId: payrollId.toString(),
        recipient,
        amount: amount.toString(),
        hooks,
        wouldPass: (result as unknown[])[0],
        reason: (result as unknown[])[1],
      });
    },
  },

  {
    name: "hashpay_get_salary_index",
    description:
      "Read the on-chain salary oracle (Chainlink-compatible) for a role+region — e.g. role='SWE', region='US'. Returns the index price and last-update timestamp.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      role: z.string(),
      region: z.string(),
    }),
    handler: async (args) => {
      const { chainId, role, region } = args as { chainId: number; role: string; region: string };
      const si = requireProtocol(chainId, "SALARY_INDEX");
      const pc = publicClient(chainId);
      const [price, updatedAt] = (await pc.readContract({
        address: si,
        abi: SALARY_INDEX_ABI,
        functionName: "indexFor",
        args: [role, region],
      })) as [bigint, bigint];
      return serializeBigints({ chainId, role, region, price, updatedAt });
    },
  },

  {
    name: "hashpay_get_token_info",
    description:
      "Read ERC-20 metadata (symbol, decimals) plus balance and allowance (vs. a given spender) for a specific holder. Useful for checking MockUSDT funds before creating payrolls.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      token: AddressSchema,
      holder: AddressSchema.optional(),
      spender: AddressSchema.optional(),
    }),
    handler: async (args) => {
      const { chainId, token, holder, spender } = args as {
        chainId: number;
        token: `0x${string}`;
        holder?: `0x${string}`;
        spender?: `0x${string}`;
      };
      const pc = publicClient(chainId);
      const promises: Array<Promise<unknown>> = [
        pc.readContract({ address: token, abi: ERC20_ABI, functionName: "symbol" }),
        pc.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" }),
      ];
      if (holder) promises.push(pc.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [holder] }));
      if (holder && spender) promises.push(pc.readContract({ address: token, abi: ERC20_ABI, functionName: "allowance", args: [holder, spender] }));
      const [symbol, decimals, balance, allowance] = await Promise.all(promises);
      return serializeBigints({ chainId, token, symbol, decimals, holder, balance, spender, allowance });
    },
  },
];
