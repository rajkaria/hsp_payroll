"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Shield, Search, CheckCircle2, ExternalLink, Copy, Check } from "lucide-react";
import { useAttestationData } from "@/hooks/useAttestation";
import { formatAmount, shortenAddress, formatDate } from "@/lib/utils";
import { getExplorerAddressUrl } from "@/config/wagmi";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputUid, setInputUid] = useState(searchParams.get("uid") || "");
  const [searchUid, setSearchUid] = useState<`0x${string}` | undefined>(
    searchParams.get("uid") ? (searchParams.get("uid") as `0x${string}`) : undefined
  );
  const [copied, setCopied] = useState(false);

  const { attestation, decoded, isLoading, error } = useAttestationData(searchUid);

  const handleSearch = () => {
    if (inputUid.startsWith("0x") && inputUid.length === 66) {
      setSearchUid(inputUid as `0x${string}`);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-grid pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#8B5CF6]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 py-8 relative">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[#5A6178] hover:text-white transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-[family-name:var(--font-space-grotesk)]">
              Verify <span className="gradient-text">Payment</span>
            </h1>
          </div>
          <p className="text-[#9BA3B7] mt-1.5 text-sm">Independently verify any HashPay payment attestation on-chain</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUid}
              onChange={(e) => setInputUid(e.target.value)}
              placeholder="Paste attestation UID (0x...)"
              className="flex-1 px-4 py-3 bg-[#0E1025] border border-[#1C1E3A] rounded-xl text-white placeholder-[#5A6178] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 focus:outline-none transition-colors font-mono text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={!inputUid.startsWith("0x") || inputUid.length !== 66}
              className="px-5 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all disabled:opacity-40 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Verify
            </button>
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading && searchUid && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#9BA3B7] text-sm">Reading attestation from HashKey Chain...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass rounded-2xl p-8 text-center">
            <Shield className="w-8 h-8 text-[#EF4444] mx-auto mb-3" />
            <p className="text-[#EF4444] font-medium mb-1">Attestation Not Found</p>
            <p className="text-sm text-[#5A6178]">This UID does not match any on-chain attestation.</p>
          </div>
        )}

        {/* Result */}
        {attestation && decoded && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Verified badge */}
            <div className="glass rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto mb-3" />
              <h2 className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)] mb-1">
                Payment <span className="text-[#10B981]">Verified</span>
              </h2>
              <p className="text-xs text-[#5A6178]">
                This payment is cryptographically attested on HashKey Chain via EAS
              </p>
            </div>

            {/* Payment details */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#9BA3B7] uppercase tracking-wider">Payment Details</h3>

              {[
                { label: "Payroll ID", value: decoded.payrollId.toString().slice(0, 10) + "..." },
                { label: "Cycle", value: `#${decoded.cycleNumber}` },
                { label: "Amount", value: `${formatAmount(decoded.amount)} ${decoded.tokenSymbol}` },
                { label: "Recipient", value: shortenAddress(decoded.recipient), link: getExplorerAddressUrl(decoded.recipient) },
                { label: "Employer", value: shortenAddress(decoded.employer), link: getExplorerAddressUrl(decoded.employer) },
                { label: "Token Contract", value: shortenAddress(decoded.token), link: getExplorerAddressUrl(decoded.token) },
                { label: "HSP Receipt", value: decoded.hspRequestId.toString().slice(0, 18) + "..." },
                { label: "Attested At", value: attestation.time ? formatDate(Number(attestation.time)) : "—" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1C1E3A]/50 last:border-0">
                  <span className="text-xs text-[#5A6178]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-white">
                      {"link" in item ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#C084FC] flex items-center gap-1">
                          {item.value} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        item.value
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Attestation metadata */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-[#9BA3B7] uppercase tracking-wider">Attestation Metadata</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A6178]">Attestation UID</span>
                <button onClick={() => handleCopy(attestation.uid)} className="flex items-center gap-1.5 text-xs font-mono text-[#8B5CF6]">
                  {attestation.uid.toString().slice(0, 18)}...
                  {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A6178]">Schema</span>
                <span className="text-xs font-mono text-[#5A6178]">{attestation.schema.toString().slice(0, 18)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A6178]">Revocable</span>
                <span className="text-xs text-[#10B981]">No — Permanent</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!searchUid && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-12 text-center">
            <Shield className="w-10 h-10 text-[#8B5CF6] mx-auto mb-4" />
            <p className="text-[#9BA3B7] mb-2">Enter an attestation UID to verify a payment</p>
            <p className="text-xs text-[#5A6178]">
              Every HashPay payment creates a permanent on-chain attestation via EAS.
              Anyone can independently verify the payment occurred.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
