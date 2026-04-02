"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, X, Check } from "lucide-react";
import { TokenIcon } from "./token-icon";
import { type TokenInfo, DEFAULT_TOKENS, getCustomTokens, saveCustomToken } from "@/config/tokens";
import { toast } from "sonner";

interface TokenSelectorProps {
  selected: TokenInfo;
  onSelect: (token: TokenInfo) => void;
}

export function TokenSelector({ selected, onSelect }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);
  const [customAddress, setCustomAddress] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDecimals, setCustomDecimals] = useState("18");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomTokens(getCustomTokens());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAddCustom(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allTokens = [...DEFAULT_TOKENS, ...customTokens];

  const handleSelect = (token: TokenInfo) => {
    if (!token.available && !token.isCustom) {
      toast.info(`${token.symbol} support coming soon`, {
        description: `${token.name} will be available in a future release.`,
      });
      return;
    }
    onSelect(token);
    setOpen(false);
  };

  const handleAddCustom = () => {
    if (!customAddress.startsWith("0x") || customAddress.length !== 42) {
      toast.error("Invalid address", { description: "Enter a valid ERC-20 contract address." });
      return;
    }
    if (!customSymbol) {
      toast.error("Symbol required");
      return;
    }

    const newToken: TokenInfo = {
      symbol: customSymbol.toUpperCase(),
      name: customName || customSymbol.toUpperCase(),
      address: customAddress,
      decimals: parseInt(customDecimals) || 18,
      color: "#8B5CF6",
      icon: customSymbol[0]?.toUpperCase() || "?",
      available: true,
      isCustom: true,
    };

    saveCustomToken(newToken);
    setCustomTokens([...customTokens.filter((t) => t.address.toLowerCase() !== newToken.address.toLowerCase()), newToken]);
    onSelect(newToken);
    setShowAddCustom(false);
    setCustomAddress("");
    setCustomSymbol("");
    setCustomName("");
    setCustomDecimals("18");
    setOpen(false);
    toast.success(`${newToken.symbol} added`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-[#0F1629] border border-[#1A2340] rounded-xl text-white flex items-center justify-between hover:border-[#8B5CF6]/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <TokenIcon symbol={selected.symbol} color={selected.color} icon={selected.icon} size="md" />
          <div className="text-left">
            <div className="font-medium text-sm">{selected.symbol}</div>
            <div className="text-xs text-[#525E75]">{selected.name}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#525E75] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 glass-strong rounded-xl overflow-hidden"
          >
            {!showAddCustom ? (
              <>
                <div className="p-1.5">
                  {allTokens.map((token) => (
                    <button
                      key={token.address + token.symbol}
                      onClick={() => handleSelect(token)}
                      className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between hover:bg-white/5 transition-colors ${
                        selected.address === token.address ? "bg-[#1E5EFF]/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <TokenIcon symbol={token.symbol} color={token.color} icon={token.icon} size="md" />
                        <div className="text-left">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {token.symbol}
                            {!token.available && !token.isCustom && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20">
                                Soon
                              </span>
                            )}
                            {token.isCustom && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#525E75]">{token.name}</div>
                        </div>
                      </div>
                      {selected.address === token.address && (
                        <Check className="w-4 h-4 text-[#8B5CF6]" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#1A2340]">
                  <button
                    onClick={() => setShowAddCustom(true)}
                    className="w-full px-4 py-2.5 text-sm text-[#8B5CF6] hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Custom Token
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 space-y-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Add Custom Token</span>
                  <button onClick={() => setShowAddCustom(false)} className="text-[#525E75] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Contract address (0x...)"
                  className="w-full px-3 py-2 bg-[#0A0E1A] border border-[#1A2340] rounded-lg text-white text-sm placeholder-[#525E75] focus:border-[#8B5CF6] focus:outline-none font-mono"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value.slice(0, 6))}
                    placeholder="Symbol"
                    className="flex-1 px-3 py-2 bg-[#0A0E1A] border border-[#1A2340] rounded-lg text-white text-sm placeholder-[#525E75] focus:border-[#8B5CF6] focus:outline-none"
                  />
                  <input
                    type="number"
                    value={customDecimals}
                    onChange={(e) => setCustomDecimals(e.target.value)}
                    placeholder="Decimals"
                    className="w-24 px-3 py-2 bg-[#0A0E1A] border border-[#1A2340] rounded-lg text-white text-sm placeholder-[#525E75] focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Token name (optional)"
                  className="w-full px-3 py-2 bg-[#0A0E1A] border border-[#1A2340] rounded-lg text-white text-sm placeholder-[#525E75] focus:border-[#8B5CF6] focus:outline-none"
                />
                <button
                  onClick={handleAddCustom}
                  className="w-full px-3 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-white rounded-lg text-sm font-medium hover:shadow-[0_0_15px_rgba(139,92,246,0.25)] transition-all"
                >
                  Add Token
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
