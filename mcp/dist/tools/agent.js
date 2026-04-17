// Tier 3 — Agent sugar. High-level composition of Tier 2 primitives tailored
// for agent-manager-pays-sub-agents use cases.
import { z } from "zod";
import { decodeEventLog } from "viem";
import { explorerUrl, requireCore, requireProtocol, getChainEntry, } from "../chains.js";
import { publicClient } from "../clients.js";
import { requireWrite, simulateOrSend, spend, getMode, serializeBigints, } from "../safety.js";
import { getSigner } from "../signers/index.js";
import { PAYROLL_FACTORY_ABI, ERC20_ABI, PAYROLL_ADVANCE_ABI, ADAPTIVE_CADENCE_ABI, PAYROLL_ATTESTOR_ABI, } from "../abis.js";
import { AddressSchema, AmountSchema, CadenceModeSchema, ChainIdSchema, PayrollIdSchema, } from "../schemas.js";
async function ctx(chainId) {
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
        explorerTxUrl: (h) => explorerUrl(chainId, h),
    };
}
export const agentTools = [
    {
        name: "hashpay_spawn_agent_team",
        description: "One-shot setup for an agent manager: creates a payroll in STREAM cadence (per-second accrual), funds it with the given budget, and returns the teamId. Recipients start empty — add sub-agents with hashpay_hire_agent.",
        inputSchema: z.object({
            chainId: ChainIdSchema,
            teamName: z.string().min(1),
            token: AddressSchema,
            budget: AmountSchema.describe("Total budget to lock into escrow up-front, in token base units"),
            defaultCadence: CadenceModeSchema.default("STREAM"),
            hybridStreamBps: z.number().int().min(0).max(10000).default(0),
            frequencySeconds: z.number().int().positive().default(604800),
        }),
        handler: async (args) => {
            const a = args;
            spend.check(a.budget, `spawnAgentTeam(${a.teamName})`);
            const c = await ctx(a.chainId);
            const factory = requireCore(a.chainId, "PAYROLL_FACTORY");
            // 1. Create payroll with a placeholder self-recipient of 0 — factory requires
            //    ≥1 recipient. We use the manager's own address; remove later or ignore.
            const steps = [];
            const createRes = await simulateOrSend({
                publicClient: c.pc,
                wallet: c.wallet,
                account: c.signer.account,
                chain: c.chain,
                address: factory,
                abi: PAYROLL_FACTORY_ABI,
                functionName: "createPayroll",
                args: [
                    a.teamName,
                    a.token,
                    [c.signer.account],
                    [0n],
                    BigInt(a.frequencySeconds),
                ],
                label: `createPayroll(${a.teamName})`,
                explorerTxUrl: c.explorerTxUrl,
            });
            steps.push({ step: "create", ...createRes });
            if (getMode() === "dry-run" || !createRes.txHash) {
                return {
                    chainId: a.chainId,
                    teamName: a.teamName,
                    mode: getMode(),
                    steps,
                    teamId: null,
                    note: "Dry-run: no teamId produced. Set HASHPAY_MODE=write to actually deploy.",
                };
            }
            const receipt = await c.pc.waitForTransactionReceipt({ hash: createRes.txHash });
            let teamId;
            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: PAYROLL_FACTORY_ABI,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "PayrollCreated") {
                        teamId = decoded.args.payrollId;
                        break;
                    }
                }
                catch {
                    /* ignore */
                }
            }
            if (teamId === undefined)
                throw new Error("Could not parse teamId from receipt");
            // 2. Approve + fund the payroll with the full budget
            const allowance = (await c.pc.readContract({
                address: a.token,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [c.signer.account, factory],
            }));
            if (allowance < a.budget) {
                const ap = await simulateOrSend({
                    publicClient: c.pc,
                    wallet: c.wallet,
                    account: c.signer.account,
                    chain: c.chain,
                    address: a.token,
                    abi: ERC20_ABI,
                    functionName: "approve",
                    args: [factory, a.budget],
                    label: `approve(factory, ${a.budget})`,
                    explorerTxUrl: c.explorerTxUrl,
                });
                steps.push({ step: "approve", ...ap });
                if (ap.txHash)
                    await c.pc.waitForTransactionReceipt({ hash: ap.txHash });
            }
            const fundRes = await simulateOrSend({
                publicClient: c.pc,
                wallet: c.wallet,
                account: c.signer.account,
                chain: c.chain,
                address: factory,
                abi: PAYROLL_FACTORY_ABI,
                functionName: "fundPayroll",
                args: [teamId, a.budget],
                label: `fundPayroll(${teamId}, ${a.budget})`,
                explorerTxUrl: c.explorerTxUrl,
            });
            steps.push({ step: "fund", ...fundRes });
            if (fundRes.txHash) {
                spend.record(a.budget);
                await c.pc.waitForTransactionReceipt({ hash: fundRes.txHash });
            }
            return serializeBigints({
                chainId: a.chainId,
                teamId,
                teamName: a.teamName,
                manager: c.signer.account,
                budget: a.budget.toString(),
                defaultCadence: a.defaultCadence,
                steps,
            });
        },
    },
    {
        name: "hashpay_hire_agent",
        description: "Add a sub-agent to an existing team (payroll). Sets their per-cycle rate and optionally their cadence mode (defaults to the team's default — typically STREAM so they earn per-second).",
        inputSchema: z.object({
            chainId: ChainIdSchema,
            teamId: PayrollIdSchema,
            agent: AddressSchema,
            ratePerCycle: AmountSchema,
            cadence: CadenceModeSchema.optional(),
            hybridStreamBps: z.number().int().min(0).max(10000).default(0),
        }),
        handler: async (args) => {
            const a = args;
            const c = await ctx(a.chainId);
            const steps = [];
            const addRes = await simulateOrSend({
                publicClient: c.pc,
                wallet: c.wallet,
                account: c.signer.account,
                chain: c.chain,
                address: requireCore(a.chainId, "PAYROLL_FACTORY"),
                abi: PAYROLL_FACTORY_ABI,
                functionName: "addRecipient",
                args: [a.teamId, a.agent, a.ratePerCycle],
                label: `addRecipient(${a.teamId}, ${a.agent})`,
                explorerTxUrl: c.explorerTxUrl,
            });
            steps.push({ step: "addRecipient", ...addRes });
            if (addRes.txHash)
                await c.pc.waitForTransactionReceipt({ hash: addRes.txHash });
            if (a.cadence !== undefined) {
                const cadRes = await simulateOrSend({
                    publicClient: c.pc,
                    wallet: c.wallet,
                    account: c.signer.account,
                    chain: c.chain,
                    address: requireProtocol(a.chainId, "ADAPTIVE_CADENCE"),
                    abi: ADAPTIVE_CADENCE_ABI,
                    functionName: "setCadencePolicy",
                    args: [a.teamId, a.agent, a.cadence, true, BigInt(a.hybridStreamBps)],
                    label: `setCadencePolicy(${a.teamId}, ${a.agent})`,
                    explorerTxUrl: c.explorerTxUrl,
                });
                steps.push({ step: "setCadence", ...cadRes });
            }
            return serializeBigints({
                chainId: a.chainId,
                teamId: a.teamId,
                agent: a.agent,
                ratePerCycle: a.ratePerCycle.toString(),
                steps,
            });
        },
    },
    {
        name: "hashpay_complete_agent_task",
        description: "Atomic 'agent finished a task, pay them now' flow. Calls executeCycle (triggers settlement under active cadence) then attests the cycle on EAS (updates ReputationRegistry). The result includes the new reputation snapshot for the agent.",
        inputSchema: z.object({
            chainId: ChainIdSchema,
            teamId: PayrollIdSchema,
            agent: AddressSchema,
            taskSummary: z.string().optional(),
        }),
        handler: async (args) => {
            const a = args;
            const c = await ctx(a.chainId);
            const factory = requireCore(a.chainId, "PAYROLL_FACTORY");
            const attestor = requireCore(a.chainId, "PAYROLL_ATTESTOR");
            const steps = [];
            const execRes = await simulateOrSend({
                publicClient: c.pc,
                wallet: c.wallet,
                account: c.signer.account,
                chain: c.chain,
                address: factory,
                abi: PAYROLL_FACTORY_ABI,
                functionName: "executeCycle",
                args: [a.teamId],
                label: `executeCycle(${a.teamId})`,
                explorerTxUrl: c.explorerTxUrl,
            });
            steps.push({ step: "execute", ...execRes });
            if (execRes.txHash)
                await c.pc.waitForTransactionReceipt({ hash: execRes.txHash });
            // Read post-exec details for the attestor args + new cycle number
            const details = (await c.pc.readContract({
                address: factory,
                abi: PAYROLL_FACTORY_ABI,
                functionName: "getPayrollDetails",
                args: [a.teamId],
            }));
            const token = details[1];
            const cycleNumber = details[8];
            // Symbol is best-effort (safe to fail silently)
            let symbol = "TOKEN";
            try {
                symbol = (await c.pc.readContract({
                    address: token,
                    abi: ERC20_ABI,
                    functionName: "symbol",
                }));
            }
            catch {
                /* ignore */
            }
            const attRes = await simulateOrSend({
                publicClient: c.pc,
                wallet: c.wallet,
                account: c.signer.account,
                chain: c.chain,
                address: attestor,
                abi: PAYROLL_ATTESTOR_ABI,
                functionName: "attestCycle",
                args: [a.teamId, cycleNumber, c.signer.account, token, symbol],
                label: `attestCycle(${a.teamId}, #${cycleNumber})`,
                explorerTxUrl: c.explorerTxUrl,
            });
            steps.push({ step: "attest", ...attRes });
            return serializeBigints({
                chainId: a.chainId,
                teamId: a.teamId,
                agent: a.agent,
                taskSummary: a.taskSummary ?? null,
                cycleNumber,
                steps,
            });
        },
    },
    {
        name: "hashpay_agent_pay_for_compute",
        description: "Agent-initiated: a sub-agent borrows a just-in-time advance against its expected earnings to pay for mid-task expenses (API/compute). Must be called by the agent itself (the active signer must be the sub-agent wallet).",
        inputSchema: z.object({
            chainId: ChainIdSchema,
            teamId: PayrollIdSchema,
            amount: AmountSchema,
            purpose: z.string().optional(),
        }),
        handler: async (args) => {
            const a = args;
            const c = await ctx(a.chainId);
            return {
                ...(await simulateOrSend({
                    publicClient: c.pc,
                    wallet: c.wallet,
                    account: c.signer.account,
                    chain: c.chain,
                    address: requireProtocol(a.chainId, "PAYROLL_ADVANCE"),
                    abi: PAYROLL_ADVANCE_ABI,
                    functionName: "requestAdvance",
                    args: [a.teamId, a.amount],
                    label: `requestAdvance(${a.teamId}, ${a.amount})`,
                    explorerTxUrl: c.explorerTxUrl,
                })),
                purpose: a.purpose ?? null,
            };
        },
    },
    {
        name: "hashpay_fire_agent",
        description: "Remove a sub-agent from a team. Requires the zero-based index of the agent in the recipients array — fetch it via hashpay_get_payroll.",
        inputSchema: z.object({
            chainId: ChainIdSchema,
            teamId: PayrollIdSchema,
            agentIndex: z.number().int().nonnegative(),
        }),
        handler: async (args) => {
            const a = args;
            const c = await ctx(a.chainId);
            return simulateOrSend({
                publicClient: c.pc,
                wallet: c.wallet,
                account: c.signer.account,
                chain: c.chain,
                address: requireCore(a.chainId, "PAYROLL_FACTORY"),
                abi: PAYROLL_FACTORY_ABI,
                functionName: "removeRecipient",
                args: [a.teamId, BigInt(a.agentIndex)],
                label: `removeRecipient(${a.teamId}, idx=${a.agentIndex})`,
                explorerTxUrl: c.explorerTxUrl,
            });
        },
    },
];
