"use client";

import { useState } from "react";
import { useCreatePayroll } from "@/hooks/useCreatePayroll";
import { useApproveToken, useFundPayroll } from "@/hooks/useFundPayroll";
import { CONTRACTS } from "@/config/contracts";
import { parseUnits } from "viem";
import { useRouter } from "next/navigation";

const FREQUENCIES = [
  { label: "Weekly", value: 604800 },
  { label: "Biweekly", value: 1209600 },
  { label: "Monthly", value: 2592000 },
  { label: "Test (5 min)", value: 300 },
];

interface Recipient {
  address: string;
  amount: string;
}

export function CreatePayrollForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState(2592000);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: "", amount: "" },
  ]);
  const [fundAmount, setFundAmount] = useState("");

  const { create, isPending: isCreating, isConfirming: isCreatingConfirm, isSuccess: createSuccess } = useCreatePayroll();
  const { approve, isPending: isApproving, isConfirming: isApprovingConfirm, isSuccess: approveSuccess } = useApproveToken();
  const { fund, isPending: isFunding, isConfirming: isFundingConfirm, isSuccess: fundSuccess } = useFundPayroll();

  const addRecipient = () => setRecipients([...recipients, { address: "", amount: "" }]);
  const removeRecipient = (index: number) => setRecipients(recipients.filter((_, i) => i !== index));
  const updateRecipient = (index: number, field: "address" | "amount", value: string) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const totalPerCycle = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const handleCreate = () => {
    const addrs = recipients.map((r) => r.address as `0x${string}`);
    const amts = recipients.map((r) => parseUnits(r.amount, 6));
    create(name, CONTRACTS.MOCK_USDT as `0x${string}`, addrs, amts, BigInt(frequency));
  };

  const handleApprove = () => {
    approve(CONTRACTS.MOCK_USDT as `0x${string}`, parseUnits(fundAmount, 6));
  };

  const handleFund = () => {
    fund(1n, parseUnits(fundAmount, 6));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded ${s <= step ? "bg-[#1E5EFF]" : "bg-[#1F2937]"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Payroll Details
          </h2>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Payroll Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Alpha Monthly"
              className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white focus:border-[#1E5EFF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Token</label>
            <div className="px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white">
              Mock USDT (Testnet)
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    frequency === f.value
                      ? "bg-[#1E5EFF] text-white"
                      : "bg-[#111827] border border-[#1F2937] text-[#9CA3AF] hover:border-[#1E5EFF]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!name}
            className="w-full px-4 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50"
          >
            Next: Add Recipients
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Add Recipients
          </h2>

          {recipients.map((r, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={r.address}
                  onChange={(e) => updateRecipient(i, "address", e.target.value)}
                  placeholder="0x... wallet address"
                  className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white text-sm focus:border-[#1E5EFF] focus:outline-none"
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  value={r.amount}
                  onChange={(e) => updateRecipient(i, "amount", e.target.value)}
                  placeholder="Amount"
                  className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white text-sm focus:border-[#1E5EFF] focus:outline-none"
                />
              </div>
              {recipients.length > 1 && (
                <button
                  onClick={() => removeRecipient(i)}
                  className="px-3 py-3 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg"
                >
                  X
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addRecipient}
            className="text-[#1E5EFF] text-sm font-medium hover:underline"
          >
            + Add another recipient
          </button>

          <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-lg">
            <div className="text-sm text-[#9CA3AF]">Total per cycle</div>
            <div className="text-xl font-bold">{totalPerCycle.toLocaleString()} USDT</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-3 bg-[#111827] border border-[#1F2937] text-white rounded-lg font-medium hover:bg-[#1F2937] transition"
            >
              Back
            </button>
            <button
              onClick={() => { handleCreate(); setStep(3); }}
              disabled={recipients.some((r) => !r.address || !r.amount)}
              className="flex-1 px-4 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50"
            >
              {isCreating ? "Confirm in wallet..." : "Create Payroll"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">
            Fund Escrow
          </h2>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Deposit Amount (USDT)</label>
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="e.g., 10000"
              className="w-full px-4 py-3 bg-[#111827] border border-[#1F2937] rounded-lg text-white focus:border-[#1E5EFF] focus:outline-none"
            />
            {totalPerCycle > 0 && fundAmount && (
              <div className="mt-2 text-sm text-[#9CA3AF]">
                Runway: ~{Math.floor(parseFloat(fundAmount) / totalPerCycle)} cycles
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleApprove}
              disabled={!fundAmount || isApproving || isApprovingConfirm}
              className="w-full px-4 py-3 bg-[#111827] border border-[#1E5EFF] text-[#1E5EFF] rounded-lg font-medium hover:bg-[#1E5EFF]/10 transition disabled:opacity-50"
            >
              {isApproving ? "Confirm in wallet..." : isApprovingConfirm ? "Approving..." : approveSuccess ? "Approved!" : "Step 1: Approve USDT"}
            </button>
            <button
              onClick={handleFund}
              disabled={!approveSuccess || isFunding || isFundingConfirm}
              className="w-full px-4 py-3 bg-[#1E5EFF] text-white rounded-lg font-medium hover:bg-[#1E5EFF]/90 transition disabled:opacity-50"
            >
              {isFunding ? "Confirm in wallet..." : isFundingConfirm ? "Depositing..." : fundSuccess ? "Funded!" : "Step 2: Fund Payroll"}
            </button>
          </div>

          {fundSuccess && (
            <button
              onClick={() => router.push("/employer")}
              className="w-full px-4 py-3 bg-[#10B981] text-white rounded-lg font-medium hover:bg-[#10B981]/90 transition"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
