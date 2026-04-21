"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, ExternalLink, ArrowDownToLine, Zap, DollarSign, Loader2 } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { useContracts } from "@/hooks/useContracts";
import { PAYROLL_FACTORY_ABI } from "@/config/contracts";
import { getExplorerTxUrl } from "@/config/wagmi";
import { formatAmount, formatDate } from "@/lib/utils";
import { parseAbiItem, type Address } from "viem";

type EventRow = {
  kind: "settled" | "cycle" | "funded";
  payrollId: bigint;
  recipient?: Address;
  amount: bigint;
  extra?: string;
  txHash: string;
  blockNumber: bigint;
  timestamp?: number;
};

const settledEvt = parseAbiItem(
  "event PaymentSettled(uint256 indexed payrollId, address indexed recipient, uint256 amount, bytes32 hspRequestId)"
);
const cycleEvt = parseAbiItem(
  "event CycleExecuted(uint256 indexed payrollId, uint256 cycleNumber, uint256 totalPaid)"
);
const fundedEvt = parseAbiItem(
  "event PayrollFunded(uint256 indexed payrollId, uint256 amount, uint256 newBalance)"
);

export default function HistoryPage() {
  const { isConnected, address, chain } = useAccount();
  const router = useRouter();
  const publicClient = usePublicClient();
  const contracts = useContracts();

  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "settled" | "cycle" | "funded">("all");

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

        const owned = new Set<string>();
        const ids: bigint[] = [];
        for (let i = 1n; i <= count; i++) {
          try {
            const details = (await publicClient!.readContract({
              address: factory,
              abi: PAYROLL_FACTORY_ABI,
              functionName: "getPayrollDetails",
              args: [i],
            })) as readonly [Address, ...unknown[]];
            if (details[0].toLowerCase() === address!.toLowerCase()) {
              owned.add(i.toString());
              ids.push(i);
            }
          } catch {}
        }
        if (cancelled) return;
        setOwnedIds(owned);

        if (ids.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const latest = await publicClient!.getBlockNumber();
        const fromBlock = latest > 500_000n ? latest - 500_000n : 0n;

        const [settled, cycles, funded] = await Promise.all([
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
          publicClient!.getLogs({
            address: factory,
            event: fundedEvt,
            args: { payrollId: ids },
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        const all: EventRow[] = [
          ...settled.map((l) => ({
            kind: "settled" as const,
            payrollId: l.args.payrollId!,
            recipient: l.args.recipient,
            amount: l.args.amount!,
            txHash: l.transactionHash!,
            blockNumber: l.blockNumber!,
          })),
          ...cycles.map((l) => ({
            kind: "cycle" as const,
            payrollId: l.args.payrollId!,
            amount: l.args.totalPaid!,
            extra: `Cycle #${l.args.cycleNumber}`,
            txHash: l.transactionHash!,
            blockNumber: l.blockNumber!,
          })),
          ...funded.map((l) => ({
            kind: "funded" as const,
            payrollId: l.args.payrollId!,
            amount: l.args.amount!,
            extra: `New balance: ${formatAmount(l.args.newBalance!)}`,
            txHash: l.transactionHash!,
            blockNumber: l.blockNumber!,
          })),
        ];

        const uniqueBlocks = Array.from(new Set(all.map((r) => r.blockNumber.toString())));
        const blockTimes = new Map<string, number>();
        await Promise.all(
          uniqueBlocks.map(async (bn) => {
            try {
              const block = await publicClient!.getBlock({ blockNumber: BigInt(bn) });
              blockTimes.set(bn, Number(block.timestamp));
            } catch {}
          })
        );

        const withTimes = all.map((r) => ({
          ...r,
          timestamp: blockTimes.get(r.blockNumber.toString()),
        }));
        withTimes.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) setRows(withTimes);
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, contracts.PAYROLL_FACTORY]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.kind === filter)),
    [rows, filter]
  );

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen relative">
        <div className="fixed inset-0 bg-grid pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-10 text-center relative"
        >
          <Wallet className="w-10 h-10 text-[#8B5CF6] mx-auto mb-4" />
          <p className="text-[#8B95A9] mb-6">Connect your wallet to view transaction history</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-8 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => router.push("/employer")}
            className="flex items-center gap-1.5 text-sm text-[#525E75] hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Transaction <span className="gradient-text">History</span>
          </h1>
          <p className="text-[#8B95A9] mt-1.5 text-sm">
            On-chain record of every payment, cycle, and funding event across your payrolls
          </p>
        </motion.div>

        <div className="flex gap-2 mb-5 flex-wrap">
          {(["all", "settled", "cycle", "funded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-[#8B5CF6]/20 text-[#C084FC] border border-[#8B5CF6]/30"
                  : "glass text-[#8B95A9] hover:text-white"
              }`}
            >
              {f === "all"
                ? `All (${rows.length})`
                : f === "settled"
                ? `Payments (${rows.filter((r) => r.kind === "settled").length})`
                : f === "cycle"
                ? `Cycles (${rows.filter((r) => r.kind === "cycle").length})`
                : `Funding (${rows.filter((r) => r.kind === "funded").length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Loader2 className="w-6 h-6 text-[#8B5CF6] mx-auto mb-3 animate-spin" />
            <p className="text-[#8B95A9] text-sm">Scanning on-chain events…</p>
          </div>
        ) : ownedIds.size === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-[#8B95A9]">No payrolls found for this wallet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-[#8B95A9]">No transactions yet.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-[#5A6178] border-b border-white/5 bg-[#0A0B14]/40">
              <div className="col-span-2">Type</div>
              <div className="col-span-1">Payroll</div>
              <div className="col-span-4">Recipient / Detail</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-1 text-right">Tx</div>
            </div>
            {filtered.map((r, i) => (
              <div
                key={`${r.txHash}-${i}`}
                className="grid grid-cols-12 gap-3 px-5 py-3 text-sm border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-2 flex items-center gap-1.5">
                  {r.kind === "settled" && <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />}
                  {r.kind === "cycle" && <Zap className="w-3.5 h-3.5 text-[#8B5CF6]" />}
                  {r.kind === "funded" && <ArrowDownToLine className="w-3.5 h-3.5 text-[#06B6D4]" />}
                  <span className="text-xs">
                    {r.kind === "settled" ? "Payment" : r.kind === "cycle" ? "Cycle" : "Funded"}
                  </span>
                </div>
                <div className="col-span-1 text-[#9BA3B7]">#{r.payrollId.toString()}</div>
                <div className="col-span-4 text-[#9BA3B7] font-mono text-xs truncate">
                  {r.recipient ? `${r.recipient.slice(0, 10)}…${r.recipient.slice(-6)}` : r.extra}
                </div>
                <div className="col-span-2 font-medium">{formatAmount(r.amount)} USDT</div>
                <div className="col-span-2 text-[#5A6178] text-xs">
                  {r.timestamp ? formatDate(r.timestamp) : `Block ${r.blockNumber.toString()}`}
                </div>
                <div className="col-span-1 flex justify-end">
                  <a
                    href={getExplorerTxUrl(r.txHash, chain?.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8B5CF6] hover:text-[#C084FC] transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
