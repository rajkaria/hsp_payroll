"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { parseAbiItem, formatUnits, type Address } from "viem";
import { useContracts } from "@/hooks/useContracts";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";

const settledEvt = parseAbiItem(
  "event PaymentSettled(uint256 indexed payrollId, address indexed recipient, uint256 amount, bytes32 hspRequestId)"
);
const cycleEvt = parseAbiItem(
  "event CycleExecuted(uint256 indexed payrollId, uint256 cycleNumber, uint256 totalPaid)"
);
const fundedEvt = parseAbiItem(
  "event PayrollFunded(uint256 indexed payrollId, uint256 amount, uint256 newBalance)"
);

export type LiveStats = {
  totalPaid: number;
  activePayrolls: number;
  avgCycleCost: number;
  totalEmployees: number;
  runwayMonths: number;
  nextPayout: string;
};

export type VolumePoint = { month: string; volume: number };
export type BurnPoint = { week: string; balance: number; burn: number };
export type CostPoint = { name: string; amount: number; role: string };

export type LiveAnalytics = {
  loading: boolean;
  hasData: boolean;
  lastUpdated: number | null;
  stats: LiveStats;
  volume: VolumePoint[];
  burn: BurnPoint[];
  costs: CostPoint[];
  refresh: () => void;
};

const emptyStats: LiveStats = {
  totalPaid: 0,
  activePayrolls: 0,
  avgCycleCost: 0,
  totalEmployees: 0,
  runwayMonths: 0,
  nextPayout: "—",
};

function toUsd(raw: bigint): number {
  return Number(formatUnits(raw, 6));
}

function monthKey(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function weekKey(ts: number, now: number): string {
  const weeksAgo = Math.floor((now - ts) / (7 * 86400));
  return `W-${weeksAgo}`;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function useLiveAnalytics(): LiveAnalytics {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const contracts = useContracts();

  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<{
    hasData: boolean;
    lastUpdated: number | null;
    stats: LiveStats;
    volume: VolumePoint[];
    burn: BurnPoint[];
    costs: CostPoint[];
  }>({
    hasData: false,
    lastUpdated: null,
    stats: emptyStats,
    volume: [],
    burn: [],
    costs: [],
  });

  useEffect(() => {
    if (!publicClient || !address || !contracts.PAYROLL_FACTORY) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const factory = contracts.PAYROLL_FACTORY as Address;
        const count = (await publicClient!.readContract({
          address: factory,
          abi: PAYROLL_FACTORY_ABI,
          functionName: "payrollCount",
        })) as bigint;

        const owned: {
          id: bigint;
          active: boolean;
          frequency: bigint;
          lastExecuted: bigint;
          cycleCount: bigint;
          totalPaid: bigint;
          recipients: number;
          escrow: bigint;
        }[] = [];

        for (let i = 1n; i <= count; i++) {
          try {
            const details = (await publicClient!.readContract({
              address: factory,
              abi: PAYROLL_FACTORY_ABI,
              functionName: "getPayrollDetails",
              args: [i],
            })) as readonly [
              Address, Address, string, readonly Address[], readonly bigint[],
              bigint, bigint, bigint, bigint, bigint, bigint, boolean
            ];
            if (details[0].toLowerCase() !== address!.toLowerCase()) continue;
            const escrow = (await publicClient!.readContract({
              address: factory,
              abi: PAYROLL_FACTORY_ABI,
              functionName: "escrowBalances",
              args: [i],
            })) as bigint;
            owned.push({
              id: i,
              active: details[11],
              frequency: details[5],
              lastExecuted: details[7],
              cycleCount: details[8],
              totalPaid: details[10],
              recipients: details[3].length,
              escrow,
            });
          } catch {}
        }

        if (cancelled) return;
        if (owned.length === 0) {
          setState({
            hasData: false,
            lastUpdated: Math.floor(Date.now() / 1000),
            stats: emptyStats,
            volume: [],
            burn: [],
            costs: [],
          });
          setLoading(false);
          return;
        }

        const ids = owned.map((o) => o.id);
        const latest = await publicClient!.getBlockNumber();
        const fromBlock = latest > 500_000n ? latest - 500_000n : 0n;

        const [settled, cycles] = await Promise.all([
          publicClient!.getLogs({
            address: factory,
            event: settledEvt,
            args: { payrollId: ids },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient!.getLogs({
            address: factory,
            event: cycleEvt,
            args: { payrollId: ids },
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        const uniqueBlocks = Array.from(
          new Set(
            [...settled, ...cycles].map((l) => l.blockNumber!.toString())
          )
        );
        const blockTimes = new Map<string, number>();
        await Promise.all(
          uniqueBlocks.map(async (bn) => {
            try {
              const block = await publicClient!.getBlock({ blockNumber: BigInt(bn) });
              blockTimes.set(bn, Number(block.timestamp));
            } catch {}
          })
        );

        let totalPaidRaw = 0n;
        const recipientTotals = new Map<string, bigint>();
        const settledWithTs = settled
          .map((l) => ({
            amount: l.args.amount!,
            recipient: l.args.recipient!,
            ts: blockTimes.get(l.blockNumber!.toString()),
          }))
          .filter((r): r is { amount: bigint; recipient: Address; ts: number } => !!r.ts);

        for (const s of settledWithTs) {
          totalPaidRaw += s.amount;
          const key = s.recipient.toLowerCase();
          recipientTotals.set(key, (recipientTotals.get(key) ?? 0n) + s.amount);
        }

        const now = Math.floor(Date.now() / 1000);

        const monthBuckets = new Map<string, number>();
        const monthOrder: string[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          monthOrder.push(key);
          monthBuckets.set(key, 0);
        }
        for (const s of settledWithTs) {
          const key = monthKey(s.ts);
          if (monthBuckets.has(key)) {
            monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + toUsd(s.amount));
          }
        }
        const volume: VolumePoint[] = monthOrder.map((m) => ({
          month: m.split(" ")[0],
          volume: Math.round(monthBuckets.get(m) ?? 0),
        }));

        const weekBuckets = new Map<string, number>();
        const weekOrder: string[] = [];
        for (let i = 11; i >= 0; i--) {
          const key = `W-${i}`;
          weekOrder.push(key);
          weekBuckets.set(key, 0);
        }
        for (const s of settledWithTs) {
          const key = weekKey(s.ts, now);
          if (weekBuckets.has(key)) {
            weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + toUsd(s.amount));
          }
        }
        const totalEscrow = owned.reduce((acc, o) => acc + toUsd(o.escrow), 0);
        let runningBalance = totalEscrow;
        const orderedForward = [...weekOrder].reverse();
        const balanceByWeekFromLatest = new Map<string, number>();
        for (const key of orderedForward) {
          balanceByWeekFromLatest.set(key, runningBalance);
          runningBalance += weekBuckets.get(key) ?? 0;
        }
        const burn: BurnPoint[] = weekOrder.map((key, idx) => ({
          week: `W${idx + 1}`,
          balance: Math.round(balanceByWeekFromLatest.get(key) ?? 0),
          burn: Math.round(weekBuckets.get(key) ?? 0),
        }));

        const totalPaid = toUsd(totalPaidRaw);
        const cycleTotals = cycles.map((c) => toUsd(c.args.totalPaid!));
        const avgCycleCost = cycleTotals.length
          ? cycleTotals.reduce((a, b) => a + b, 0) / cycleTotals.length
          : 0;
        const activePayrolls = owned.filter((o) => o.active).length;
        const totalEmployees = recipientTotals.size;

        const totalEscrowUsd = totalEscrow;
        const monthlyBurn = owned.reduce((acc, o) => {
          if (!o.active || o.frequency === 0n) return acc;
          const cycleUsd = toUsd(o.totalPaid) / Math.max(Number(o.cycleCount || 1n), 1);
          const cyclesPerMonth = (30 * 86400) / Number(o.frequency);
          return acc + cycleUsd * cyclesPerMonth;
        }, 0);
        const runwayMonths = monthlyBurn > 0
          ? Math.round((totalEscrowUsd / monthlyBurn) * 10) / 10
          : 0;

        let nextPayoutTs = Infinity;
        for (const o of owned) {
          if (!o.active) continue;
          const next = Number(o.lastExecuted + o.frequency);
          if (next < nextPayoutTs) nextPayoutTs = next;
        }
        const nextPayout = Number.isFinite(nextPayoutTs)
          ? new Date(nextPayoutTs * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—";

        const costs: CostPoint[] = Array.from(recipientTotals.entries())
          .map(([addr, raw]) => ({
            name: shortAddr(addr),
            amount: Math.round(toUsd(raw)),
            role: "Recipient",
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 8);

        if (cancelled) return;
        setState({
          hasData: settledWithTs.length > 0 || cycles.length > 0,
          lastUpdated: Math.floor(Date.now() / 1000),
          stats: {
            totalPaid: Math.round(totalPaid),
            activePayrolls,
            avgCycleCost: Math.round(avgCycleCost),
            totalEmployees,
            runwayMonths,
            nextPayout,
          },
          volume,
          burn,
          costs,
        });
      } catch (e) {
        console.error("live analytics load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, contracts.PAYROLL_FACTORY, nonce]);

  return {
    loading,
    ...state,
    refresh: () => setNonce((n) => n + 1),
  };
}
