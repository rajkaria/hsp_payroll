// Tier 2 — Write tools. Require HASHPAY_MODE=write (or dry-run to simulate).

import { z } from "zod";
import { decodeEventLog } from "viem";
import {
  explorerUrl,
  getChainEntry,
  requireCore,
  requireProtocol,
} from "../chains.js";
import { publicClient } from "../clients.js";
import {
  requireWrite,
  simulateOrSend,
  spend,
  serializeBigints,
  getMode,
} from "../safety.js";
import { getSigner } from "../signers/index.js";
import {
  PAYROLL_FACTORY_ABI,
  ERC20_ABI,
  PAYROLL_ADVANCE_ABI,
  ADAPTIVE_CADENCE_ABI,
  YIELD_ESCROW_ABI,
  COMPLIANCE_REGISTRY_ABI,
  PAYROLL_ATTESTOR_ABI,
} from "../abis.js";
import type { Tool } from "./read.js";
import {
  AddressSchema,
  AmountSchema,
  CadenceModeSchema,
  ChainIdSchema,
  PayrollIdSchema,
} from "../schemas.js";

async function ctx(chainId: number) {
  requireWrite();
  const entry = getChainEntry(chainId);
  const signer = await getSigner();
  const wallet = signer.walletClientFor(entry.chain);
  const pc = publicClient(chainId);
  return {
    entry,
    signer,
    wallet,
    pc,
    chain: entry.chain,
    explorerTxUrl: (hash: string) => explorerUrl(chainId, hash),
  };
}

export const writeTools: Tool[] = [
  {
    name: "hashpay_whoami",
    description:
      "Return the active signer account + mode + session spend snapshot. Helpful to confirm which wallet the MCP will sign as before running writes.",
    inputSchema: z.object({}),
    handler: async () => {
      const signer = await getSigner().catch((e) => ({
        kind: "unset" as const,
        account: null,
        error: (e as Error).message,
      }));
      return {
        mode: getMode(),
        signerKind: (signer as { kind: string }).kind,
        account: "account" in signer ? signer.account : null,
        spend: spend.snapshot(),
      };
    },
  },

  {
    name: "hashpay_create_payroll",
    description:
      "Deploy a new payroll via PayrollFactory. Recipients array and amounts array must be equal length. Frequency is in seconds (e.g. 604800 for weekly). Returns the new payrollId on success.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      name: z.string().min(1),
      token: AddressSchema,
      recipients: z.array(AddressSchema).min(1),
      amounts: z.array(AmountSchema).min(1),
      frequencySeconds: z.number().int().positive(),
    }),
    handler: async (args) => {
      const a = args as {
        chainId: number;
        name: string;
        token: `0x${string}`;
        recipients: `0x${string}`[];
        amounts: bigint[];
        frequencySeconds: number;
      };
      if (a.recipients.length !== a.amounts.length) {
        throw new Error("recipients.length must equal amounts.length");
      }
      const c = await ctx(a.chainId);
      const factory = requireCore(a.chainId, "PAYROLL_FACTORY");
      const res = await simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: factory,
        abi: PAYROLL_FACTORY_ABI,
        functionName: "createPayroll",
        args: [a.name, a.token, a.recipients, a.amounts, BigInt(a.frequencySeconds)],
        label: `createPayroll(${a.name})`,
        explorerTxUrl: c.explorerTxUrl,
      });

      // Parse payrollId from receipt if actually sent
      let payrollId: string | undefined;
      if (res.txHash) {
        const receipt = await c.pc.waitForTransactionReceipt({ hash: res.txHash });
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: PAYROLL_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "PayrollCreated") {
              payrollId = (decoded.args as { payrollId: bigint }).payrollId.toString();
              break;
            }
          } catch {
            /* not our event */
          }
        }
      }
      return { ...res, payrollId };
    },
  },

  {
    name: "hashpay_fund_payroll",
    description:
      "Transfer tokens from the signer into payroll escrow. Approves the factory first if allowance is insufficient. Amount is in token base units (e.g. 1000000 = 1 USDC at 6 decimals).",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      amount: AmountSchema,
    }),
    handler: async (args) => {
      const { chainId, payrollId, amount } = args as {
        chainId: number;
        payrollId: bigint;
        amount: bigint;
      };
      spend.check(amount, `fundPayroll(${payrollId})`);
      const c = await ctx(chainId);
      const factory = requireCore(chainId, "PAYROLL_FACTORY");

      // Read token + allowance
      const [details, _] = await Promise.all([
        c.pc.readContract({
          address: factory,
          abi: PAYROLL_FACTORY_ABI,
          functionName: "getPayrollDetails",
          args: [payrollId],
        }),
        Promise.resolve(null),
      ]);
      const token = (details as unknown[])[1] as `0x${string}`;
      const allowance = (await c.pc.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [c.signer.account, factory],
      })) as bigint;

      const steps: unknown[] = [];
      if (allowance < amount) {
        const approveRes = await simulateOrSend({
          publicClient: c.pc,
          wallet: c.wallet,
          account: c.signer.account,
          chain: c.chain,
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [factory, amount],
          label: `approve(${factory}, ${amount})`,
          explorerTxUrl: c.explorerTxUrl,
        });
        steps.push({ step: "approve", ...approveRes });
        if (approveRes.txHash) {
          await c.pc.waitForTransactionReceipt({ hash: approveRes.txHash });
        }
      }

      const fundRes = await simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: factory,
        abi: PAYROLL_FACTORY_ABI,
        functionName: "fundPayroll",
        args: [payrollId, amount],
        label: `fundPayroll(${payrollId}, ${amount})`,
        explorerTxUrl: c.explorerTxUrl,
      });
      steps.push({ step: "fund", ...fundRes });
      if (fundRes.txHash) spend.record(amount);
      return { chainId, payrollId: payrollId.toString(), steps };
    },
  },

  {
    name: "hashpay_execute_cycle",
    description:
      "Trigger settlement on a payroll. Runs compliance hooks → advance repayment → cadence routing → transfers. Anyone can call this (keeper-friendly). Returns tx hash.",
    inputSchema: z.object({ chainId: ChainIdSchema, payrollId: PayrollIdSchema }),
    handler: async (args) => {
      const { chainId, payrollId } = args as { chainId: number; payrollId: bigint };
      const c = await ctx(chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireCore(chainId, "PAYROLL_FACTORY"),
        abi: PAYROLL_FACTORY_ABI,
        functionName: "executeCycle",
        args: [payrollId],
        label: `executeCycle(${payrollId})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_add_recipient",
    description: "Add a new recipient + amount to an existing payroll. Only callable by the payroll owner.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      recipient: AddressSchema,
      amount: AmountSchema,
    }),
    handler: async (args) => {
      const a = args as { chainId: number; payrollId: bigint; recipient: `0x${string}`; amount: bigint };
      const c = await ctx(a.chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireCore(a.chainId, "PAYROLL_FACTORY"),
        abi: PAYROLL_FACTORY_ABI,
        functionName: "addRecipient",
        args: [a.payrollId, a.recipient, a.amount],
        label: `addRecipient(${a.payrollId}, ${a.recipient})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_remove_recipient",
    description:
      "Remove a recipient from a payroll by their index in the recipients array. Read the payroll first to find the index.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      recipientIndex: z.number().int().nonnegative(),
    }),
    handler: async (args) => {
      const a = args as { chainId: number; payrollId: bigint; recipientIndex: number };
      const c = await ctx(a.chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireCore(a.chainId, "PAYROLL_FACTORY"),
        abi: PAYROLL_FACTORY_ABI,
        functionName: "removeRecipient",
        args: [a.payrollId, BigInt(a.recipientIndex)],
        label: `removeRecipient(${a.payrollId}, idx=${a.recipientIndex})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_set_cadence",
    description:
      "Set a recipient's cadence mode on AdaptiveCadence. Modes: BATCH (lump-sum at cycle), STREAM (per-second), PULL (recipient claims), HYBRID (split BATCH/STREAM by hybridStreamBps).",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      recipient: AddressSchema,
      mode: CadenceModeSchema,
      recipientCanSwitch: z.boolean().default(true),
      hybridStreamBps: z.number().int().min(0).max(10000).default(0),
    }),
    handler: async (args) => {
      const a = args as {
        chainId: number;
        payrollId: bigint;
        recipient: `0x${string}`;
        mode: number;
        recipientCanSwitch: boolean;
        hybridStreamBps: number;
      };
      const c = await ctx(a.chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireProtocol(a.chainId, "ADAPTIVE_CADENCE"),
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "setCadencePolicy",
        args: [
          a.payrollId,
          a.recipient,
          a.mode,
          a.recipientCanSwitch,
          BigInt(a.hybridStreamBps),
        ],
        label: `setCadencePolicy(${a.payrollId}, mode=${a.mode})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_claim_stream",
    description:
      "Recipient claims their accrued-but-unclaimed streaming balance on AdaptiveCadence. Must be called by the recipient (the active signer).",
    inputSchema: z.object({ chainId: ChainIdSchema, payrollId: PayrollIdSchema }),
    handler: async (args) => {
      const { chainId, payrollId } = args as { chainId: number; payrollId: bigint };
      const c = await ctx(chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireProtocol(chainId, "ADAPTIVE_CADENCE"),
        abi: ADAPTIVE_CADENCE_ABI,
        functionName: "claim",
        args: [payrollId],
        label: `claim(${payrollId})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_enable_yield",
    description:
      "Attach the YieldEscrow vault to a payroll so idle funds earn yield (ERC-4626 wrapper; MockYieldVault pays 4.5% APY on testnets). Only callable by payroll owner.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      autoCompound: z.boolean().default(true),
    }),
    handler: async (args) => {
      const a = args as { chainId: number; payrollId: bigint; autoCompound: boolean };
      const c = await ctx(a.chainId);
      const vault = requireProtocol(a.chainId, "MOCK_YIELD_VAULT");
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireProtocol(a.chainId, "YIELD_ESCROW"),
        abi: YIELD_ESCROW_ABI,
        functionName: "enableYield",
        args: [a.payrollId, vault, a.autoCompound],
        label: `enableYield(${a.payrollId})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_claim_yield",
    description:
      "Sweep accrued yield from the vault back into the payroll's spendable balance. Callable by payroll owner.",
    inputSchema: z.object({ chainId: ChainIdSchema, payrollId: PayrollIdSchema }),
    handler: async (args) => {
      const { chainId, payrollId } = args as { chainId: number; payrollId: bigint };
      const c = await ctx(chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireProtocol(chainId, "YIELD_ESCROW"),
        abi: YIELD_ESCROW_ABI,
        functionName: "claimYield",
        args: [payrollId],
        label: `claimYield(${payrollId})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_request_advance",
    description:
      "Borrow against expected future income. LTV and APR are priced to the recipient's reputation tier — check with hashpay_get_advance_quote first. Repaid automatically at the next executeCycle.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      amount: AmountSchema,
    }),
    handler: async (args) => {
      const a = args as { chainId: number; payrollId: bigint; amount: bigint };
      const c = await ctx(a.chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireProtocol(a.chainId, "PAYROLL_ADVANCE"),
        abi: PAYROLL_ADVANCE_ABI,
        functionName: "requestAdvance",
        args: [a.payrollId, a.amount],
        label: `requestAdvance(${a.payrollId}, ${a.amount})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_fund_lender_pool",
    description:
      "Lend to the PayrollAdvance pool. You earn interest as recipients borrow against future wages. Returns minted pool shares. Approves token first if needed.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      token: AddressSchema,
      amount: AmountSchema,
    }),
    handler: async (args) => {
      const a = args as { chainId: number; token: `0x${string}`; amount: bigint };
      spend.check(a.amount, `fundLenderPool(${a.token})`);
      const c = await ctx(a.chainId);
      const pool = requireProtocol(a.chainId, "PAYROLL_ADVANCE");
      const allowance = (await c.pc.readContract({
        address: a.token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [c.signer.account, pool],
      })) as bigint;

      const steps: unknown[] = [];
      if (allowance < a.amount) {
        const ap = await simulateOrSend({
          publicClient: c.pc,
          wallet: c.wallet,
          account: c.signer.account,
          chain: c.chain,
          address: a.token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [pool, a.amount],
          label: `approve(${pool}, ${a.amount})`,
          explorerTxUrl: c.explorerTxUrl,
        });
        steps.push({ step: "approve", ...ap });
        if (ap.txHash) await c.pc.waitForTransactionReceipt({ hash: ap.txHash });
      }

      const fr = await simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: pool,
        abi: PAYROLL_ADVANCE_ABI,
        functionName: "fundLenderPool",
        args: [a.token, a.amount],
        label: `fundLenderPool(${a.token}, ${a.amount})`,
        explorerTxUrl: c.explorerTxUrl,
      });
      steps.push({ step: "fund", ...fr });
      if (fr.txHash) spend.record(a.amount);
      return serializeBigints({ chainId: a.chainId, steps });
    },
  },

  {
    name: "hashpay_attach_compliance_hook",
    description:
      "Attach a compliance hook (KYC, Jurisdiction, Sanctions, RateLimit, Timelock) to a payroll. Use hashpay_list_chains to discover hook addresses.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      hook: AddressSchema,
    }),
    handler: async (args) => {
      const a = args as { chainId: number; payrollId: bigint; hook: `0x${string}` };
      const c = await ctx(a.chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireProtocol(a.chainId, "COMPLIANCE_REGISTRY"),
        abi: COMPLIANCE_REGISTRY_ABI,
        functionName: "attachHook",
        args: [a.payrollId, a.hook],
        label: `attachHook(${a.payrollId}, ${a.hook})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_attest_cycle",
    description:
      "Create EAS attestations for a settled cycle, recording income on-chain and updating each recipient's ReputationRegistry score. Call after hashpay_execute_cycle; requires the attestor service role.",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      payrollId: PayrollIdSchema,
      cycleNumber: z.number().int().nonnegative(),
      employer: AddressSchema,
      token: AddressSchema,
      tokenSymbol: z.string(),
    }),
    handler: async (args) => {
      const a = args as {
        chainId: number;
        payrollId: bigint;
        cycleNumber: number;
        employer: `0x${string}`;
        token: `0x${string}`;
        tokenSymbol: string;
      };
      const c = await ctx(a.chainId);
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: requireCore(a.chainId, "PAYROLL_ATTESTOR"),
        abi: PAYROLL_ATTESTOR_ABI,
        functionName: "attestCycle",
        args: [a.payrollId, BigInt(a.cycleNumber), a.employer, a.token, a.tokenSymbol],
        label: `attestCycle(${a.payrollId}, #${a.cycleNumber})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },

  {
    name: "hashpay_mint_test_usdt",
    description:
      "DEV-ONLY: mint MockUSDT on testnets. Decimals=6. Only works on chains where MOCK_USDT is deployed and the mint() function is permissionless (testnets).",
    inputSchema: z.object({
      chainId: ChainIdSchema,
      to: AddressSchema,
      amount: AmountSchema,
    }),
    handler: async (args) => {
      const a = args as { chainId: number; to: `0x${string}`; amount: bigint };
      const c = await ctx(a.chainId);
      const token = requireCore(a.chainId, "MOCK_USDT");
      return simulateOrSend({
        publicClient: c.pc,
        wallet: c.wallet,
        account: c.signer.account,
        chain: c.chain,
        address: token,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [a.to, a.amount],
        label: `mint(${a.to}, ${a.amount})`,
        explorerTxUrl: c.explorerTxUrl,
      });
    },
  },
];
