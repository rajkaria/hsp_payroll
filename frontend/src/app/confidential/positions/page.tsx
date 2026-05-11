"use client";

import { useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { ConnectGate } from "@/components/connect-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileBadge2 } from "lucide-react";
import {
  FHEVM_ADDRESSES,
  FHEVM_CHAIN_ID,
  ConfidentialAdvancePositionNFTAbi,
} from "@/lib/fhevm/contracts";

/**
 * /confidential/positions
 *
 * View and transfer encrypted advance positions. The position metadata
 * (principal, rate, status) is encrypted; the holder can decrypt it
 * client-side. Transferring the NFT hands off the ACL.
 */
export default function ConfidentialPositionsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [tokenId, setTokenId] = useState("1");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const onWrongChain = isConnected && chainId !== FHEVM_CHAIN_ID;

  const { data: tokenOwner } = useReadContract({
    address: FHEVM_ADDRESSES.ConfidentialAdvancePositionNFT,
    abi: ConfidentialAdvancePositionNFTAbi,
    functionName: "ownerOf",
    args: [BigInt(tokenId || "1")],
    query: { enabled: isConnected },
  });

  if (!isConnected) {
    return (
      <ConnectGate
        eyebrow="Confidential"
        title="Encrypted"
        highlight="positions"
        message="Each advance is represented as an NFT with encrypted metadata. Transfer to hand off the position privately."
        backHref="/confidential"
        backLabel="Back to Confidential"
      />
    );
  }

  async function transfer() {
    if (!address) return;
    setBusy(true);
    try {
      await writeContractAsync({
        address: FHEVM_ADDRESSES.ConfidentialAdvancePositionNFT,
        abi: ConfidentialAdvancePositionNFTAbi,
        functionName: "transferFrom",
        args: [address, recipient as `0x${string}`, BigInt(tokenId)],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="container mx-auto max-w-3xl py-10 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-wider">
            <FileBadge2 className="size-3" /> Confidential advance positions
          </div>
          <h1 className="text-3xl font-semibold mt-2">Encrypted positions</h1>
          <p className="text-muted-foreground mt-1">
            Each advance is represented as an NFT with encrypted metadata.
            Transfer the NFT to hand off the position privately.
          </p>
        </header>
        {onWrongChain && (
          <Card className="border-amber-500/40">
            <CardContent className="pt-6 text-sm">
              Connect to Sepolia (chainId 11155111).
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Position lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
            <p className="text-sm">
              Holder:{" "}
              <code className="text-xs">
                {tokenOwner?.toString() ?? "—"}
              </code>
            </p>
            <Input
              placeholder="Recipient 0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <Button onClick={transfer} disabled={busy || !recipient}>
              Transfer (hands off ACL)
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
