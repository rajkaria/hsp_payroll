import crypto from "crypto";

interface HSPConfig {
  apiKey: string;
  apiSecret: string;
  merchantPrivateKey: string;
  baseUrl: string;
  merchantId: string;
}

interface HSPPaymentOrder {
  orderId: string;
  amount: string;
  currency: string;
  description: string;
  returnUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}

function signRequest(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  nonce: string,
  secret: string
): string {
  const bodyHash = crypto.createHash("sha256").update(body || "").digest("hex");
  const message = `${method.toUpperCase()}\n${path}\n${bodyHash}\n${timestamp}\n${nonce}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export function isDemoMode(): boolean {
  return !process.env.HSP_API_KEY || !process.env.HSP_API_SECRET;
}

export async function createHSPPaymentOrder(
  order: HSPPaymentOrder
): Promise<{ paymentUrl: string; hspOrderId: string; isDemo: boolean }> {
  if (isDemoMode()) {
    // Demo mode — return simulated response
    const demoOrderId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      paymentUrl: `https://pay-qa.hsp.hashkey.com/checkout/${demoOrderId}`,
      hspOrderId: demoOrderId,
      isDemo: true,
    };
  }

  // Real mode
  const config: HSPConfig = {
    apiKey: process.env.HSP_API_KEY!,
    apiSecret: process.env.HSP_API_SECRET!,
    merchantPrivateKey: process.env.HSP_MERCHANT_PRIVATE_KEY || "",
    baseUrl: process.env.HSP_PROXY_URL || "https://api-qa.hsp.hashkey.com",
    merchantId: process.env.HSP_MERCHANT_ID || "",
  };

  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path = "/v1/payment/orders";
  const body = JSON.stringify({
    merchant_id: config.merchantId,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
    description: order.description,
    return_url: order.returnUrl,
    webhook_url: order.webhookUrl,
    metadata: order.metadata,
  });

  const hmacSignature = signRequest("POST", path, body, timestamp, nonce, config.apiSecret);

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": hmacSignature,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HSP API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return {
    paymentUrl: data.payment_url,
    hspOrderId: data.hsp_order_id,
    isDemo: false,
  };
}

export function verifyHSPWebhook(body: string, signature: string, secret: string): boolean {
  const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
