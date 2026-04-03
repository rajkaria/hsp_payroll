import { NextRequest, NextResponse } from "next/server";
import { createHSPPaymentOrder } from "@/lib/hsp-client";

export async function POST(req: NextRequest) {
  try {
    const { payrollId, cycleNumber, totalAmount, recipientCount, token } = await req.json();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hashpay.tech";

    const result = await createHSPPaymentOrder({
      orderId: `hashpay-${payrollId}-cycle-${cycleNumber}-${Date.now()}`,
      amount: totalAmount,
      currency: token || "USDC",
      description: `HashPay Payroll Cycle #${cycleNumber} — ${recipientCount} recipients`,
      returnUrl: `${appUrl}/employer?hsp_success=true&payrollId=${payrollId}&cycle=${cycleNumber}`,
      webhookUrl: `${appUrl}/api/hsp/webhook`,
      metadata: {
        payrollId: payrollId.toString(),
        cycleNumber: cycleNumber.toString(),
        recipientCount: recipientCount.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      hspOrderId: result.hspOrderId,
      isDemo: result.isDemo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
