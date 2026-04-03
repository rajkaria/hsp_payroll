import { NextRequest, NextResponse } from "next/server";
import { verifyHSPWebhook } from "@/lib/hsp-client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-hsp-signature") || "";

  // Verify in real mode
  if (process.env.HSP_API_SECRET) {
    const isValid = verifyHSPWebhook(body, signature, process.env.HSP_API_SECRET);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(body);

  if (payload.status === "completed") {
    console.log("HSP payment confirmed:", {
      orderId: payload.order_id,
      hspOrderId: payload.hsp_order_id,
      amount: payload.amount,
      currency: payload.currency,
      txHash: payload.tx_hash,
      metadata: payload.metadata,
    });
  }

  return NextResponse.json({ received: true });
}
