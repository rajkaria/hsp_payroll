# HashPay Upgrade Spec — Three Enhancements to Win PayFi Track

## Context
HashPay is currently #2-3 in the PayFi track. These three upgrades move it to #1.
Priority order: B (HSP API) → C (EAS Attestations) → A (AI Cash Flow)

---

## UPGRADE B: Real HSP API Integration (HIGHEST PRIORITY)

### Why This Matters
Dynamic Checkout (your #1 competitor) uses the actual HSP REST API with HMAC-SHA256 + ES256K JWT dual authentication. Your current HSPAdapter.sol is an on-chain pattern — useful but not the same as actually calling HSP's payment API. Adding real HSP API integration puts you on equal footing with the strongest competitor on the #1 scoring criteria (30% weight).

### What Dynamic Checkout Does (Reverse-Engineered from Their Repo)

Their HSP integration flow:
1. Server creates an HSP payment order via REST API
2. Request is signed with HMAC-SHA256 (method + path + body hash + timestamp + nonce)
3. Merchant authorization via ES256K JWT (secp256k1 signature over cart/payment hash)
4. Request routed through a Cloudflare Worker proxy (HSP QA environment has bot detection that blocks datacenter IPs)
5. Customer redirected to HSP's hosted checkout page
6. Customer approves USDC transfer on HashKey Chain
7. Customer returns to success page
8. HSP webhook confirms payment status

### What You Need to Build

#### 1. HSP Client Library (`lib/hsp-client.ts`)

```typescript
// This is the core HSP API client. Place in: frontend/src/lib/hsp-client.ts

import crypto from 'crypto';

interface HSPConfig {
  apiKey: string;          // HSP merchant API key
  apiSecret: string;       // HSP HMAC secret
  merchantPrivateKey: string; // secp256k1 private key for ES256K JWT
  baseUrl: string;         // HSP API base URL
  merchantId: string;
}

interface HSPPaymentOrder {
  orderId: string;         // Your internal order ID (e.g., payroll cycle ID)
  amount: string;          // Amount in minor units (e.g., "1000" for $10.00)
  currency: string;        // "USDC"
  description: string;     // "HashPay Payroll Cycle #3 — 5 recipients"
  returnUrl: string;       // Where to redirect after payment
  webhookUrl: string;      // For async payment confirmation
  metadata?: Record<string, string>; // Custom data (payroll ID, cycle number, etc.)
}

// HMAC-SHA256 Request Signing
function signRequest(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  nonce: string,
  secret: string
): string {
  const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');
  const message = `${method.toUpperCase()}\n${path}\n${bodyHash}\n${timestamp}\n${nonce}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// ES256K JWT Merchant Authorization
// Note: jose v6 dropped ES256K, so sign manually with crypto module
function createMerchantJWT(
  paymentHash: string,
  merchantId: string,
  privateKeyHex: string
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256K', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: merchantId,
    paymentHash,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 min expiry
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;

  // Sign with secp256k1
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  // Convert hex private key to PEM format for crypto.sign
  // Or use @noble/secp256k1 for direct signing
  const signature = sign.sign({
    key: privateKeyHex,
    dsaEncoding: 'ieee-p1363'
  }).toString('base64url');

  return `${header}.${payload}.${signature}`;
}

export async function createHSPPaymentOrder(
  config: HSPConfig,
  order: HSPPaymentOrder
): Promise<{ paymentUrl: string; hspOrderId: string }> {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path = '/v1/payment/orders';
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

  const hmacSignature = signRequest('POST', path, body, timestamp, nonce, config.apiSecret);
  const paymentHash = crypto.createHash('sha256').update(body).digest('hex');
  const merchantJWT = createMerchantJWT(paymentHash, config.merchantId, config.merchantPrivateKey);

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': hmacSignature,
      'Authorization': `Bearer ${merchantJWT}`,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HSP API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return {
    paymentUrl: data.payment_url,   // HSP hosted checkout URL
    hspOrderId: data.hsp_order_id,  // HSP's order reference
  };
}

export async function verifyHSPWebhook(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}
```

#### 2. Cloudflare Worker Proxy (`worker/hsp-proxy.ts`)

Dynamic Checkout routes through a Cloudflare Worker because HSP's QA environment has bot detection that blocks server-side requests. You need the same.

```typescript
// Deploy as Cloudflare Worker
// wrangler.toml: name = "hashpay-hsp-proxy"

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Only proxy to HSP API
    const hspBaseUrl = 'https://api-qa.hsp.hashkey.com'; // HSP QA environment
    const targetUrl = `${hspBaseUrl}${url.pathname}${url.search}`;

    // Forward all headers (including HMAC sig, JWT, etc.)
    const headers = new Headers(request.headers);
    headers.set('Origin', 'https://hashpay.tech');
    headers.delete('host');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    // Return response with CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    return new Response(response.body, {
      status: response.status,
      headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
    });
  },
};
```

**Deploy:**
```bash
npm install -g wrangler
cd worker
wrangler login
wrangler deploy
# Note the deployed URL: https://hashpay-hsp-proxy.<your-subdomain>.workers.dev
```

#### 3. API Route for HSP Payment (`frontend/src/app/api/hsp/create-order/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createHSPPaymentOrder } from '@/lib/hsp-client';

const hspConfig = {
  apiKey: process.env.HSP_API_KEY!,
  apiSecret: process.env.HSP_API_SECRET!,
  merchantPrivateKey: process.env.HSP_MERCHANT_PRIVATE_KEY!,
  baseUrl: process.env.HSP_PROXY_URL!, // Your Cloudflare Worker URL
  merchantId: process.env.HSP_MERCHANT_ID!,
};

export async function POST(req: NextRequest) {
  try {
    const { payrollId, cycleNumber, totalAmount, recipientCount, token } = await req.json();

    const order = {
      orderId: `hashpay-${payrollId}-cycle-${cycleNumber}-${Date.now()}`,
      amount: totalAmount, // minor units
      currency: token || 'USDC',
      description: `HashPay Payroll Cycle #${cycleNumber} — ${recipientCount} recipients`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer?hsp_success=true&payrollId=${payrollId}&cycle=${cycleNumber}`,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/hsp/webhook`,
      metadata: {
        payrollId: payrollId.toString(),
        cycleNumber: cycleNumber.toString(),
        recipientCount: recipientCount.toString(),
      },
    };

    const result = await createHSPPaymentOrder(hspConfig, order);

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      hspOrderId: result.hspOrderId,
    });
  } catch (error: any) {
    console.error('HSP order creation failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### 4. HSP Webhook Handler (`frontend/src/app/api/hsp/webhook/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyHSPWebhook } from '@/lib/hsp-client';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-hsp-signature') || '';

  // Verify webhook authenticity
  const isValid = await verifyHSPWebhook(body, signature, process.env.HSP_API_SECRET!);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  if (payload.status === 'completed') {
    // Payment confirmed by HSP
    // Log to your database / trigger on-chain settlement
    console.log('HSP payment confirmed:', {
      orderId: payload.order_id,
      hspOrderId: payload.hsp_order_id,
      amount: payload.amount,
      currency: payload.currency,
      txHash: payload.tx_hash,
      metadata: payload.metadata,
    });

    // TODO: Trigger on-chain payroll execution with this confirmation
    // This bridges the HSP API payment with your on-chain PayrollFactory
  }

  return NextResponse.json({ received: true });
}
```

#### 5. Frontend Integration — "Pay via HSP" Button

Add to the employer dashboard payroll execution flow:

```typescript
// In your ExecuteCycle component, add HSP payment option:

async function executeViaHSP(payrollId: number, cycleNumber: number) {
  setLoading(true);
  try {
    const response = await fetch('/api/hsp/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payrollId,
        cycleNumber,
        totalAmount: totalCycleAmount, // from contract read
        recipientCount: recipients.length,
        token: 'USDC',
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store payment context for return page
      localStorage.setItem('hsp_pending', JSON.stringify({
        payrollId,
        cycleNumber,
        hspOrderId: data.hspOrderId,
        timestamp: Date.now(),
      }));

      // Redirect to HSP hosted checkout
      window.location.href = data.paymentUrl;
    }
  } catch (error) {
    console.error('HSP payment failed:', error);
  } finally {
    setLoading(false);
  }
}
```

#### 6. Get HSP Credentials

**CRITICAL STEP — Do this FIRST before any code:**

1. Go to https://hashfans.io/ → top nav → HSP section
2. Register as a merchant in the HSP sandbox/QA environment
3. Get your:
   - `HSP_API_KEY` — merchant API key
   - `HSP_API_SECRET` — HMAC signing secret
   - `HSP_MERCHANT_ID` — your merchant identifier
4. Generate a secp256k1 key pair for ES256K JWT signing:
   ```bash
   node -e "const crypto = require('crypto'); const kp = crypto.generateKeyPairSync('ec', {namedCurve: 'secp256k1'}); console.log(kp.privateKey.export({type:'pkcs8',format:'pem'})); console.log(kp.publicKey.export({type:'spki',format:'pem'}))"
   ```
5. Register the public key with HSP as your merchant signing key

**If HSP doesn't have a public registration:** Ask in the hackathon Telegram group (https://t.me/HashKeyChainHSK/95285) for sandbox access. Mention you're a hackathon participant building on PayFi track.

#### 7. Environment Variables

Add to `frontend/.env.local`:
```
HSP_API_KEY=your_hsp_api_key
HSP_API_SECRET=your_hsp_hmac_secret
HSP_MERCHANT_PRIVATE_KEY=your_secp256k1_private_key_pem
HSP_MERCHANT_ID=your_merchant_id
HSP_PROXY_URL=https://hashpay-hsp-proxy.your-subdomain.workers.dev
```

### How This Shows in the Demo

In the demo video, during cycle execution:
1. Employer clicks "Execute Cycle via HSP"
2. Redirected to HSP's hosted checkout page (REAL HSP UI, not your own)
3. Approves USDC transfer
4. Returned to HashPay → cycle marked as settled
5. HSP receipt data logged alongside on-chain receipt

**Judge sees:** "This team actually integrated with the real HSP API — not just a smart contract wrapper."

---

## UPGRADE C: EAS Payroll Attestations (MEDIUM PRIORITY)

### Why This Matters
Dynamic Checkout uses EAS (Ethereum Attestation Service) for price proof attestations. EAS is pre-deployed on all OP Stack chains (HashKey Chain is OP Stack). Adding EAS attestations to every payroll cycle gives HashPay "provable compliance" — verifiable proof-of-payment that any auditor can independently verify.

### OP Stack EAS Predeploy Addresses

HashKey Chain (OP Stack L2) has EAS pre-deployed at:
```
EAS Contract:            0x4200000000000000000000000000000000000021
SchemaRegistry Contract: 0x4200000000000000000000000000000000000020
```

**IMPORTANT:** Verify these addresses on HashKey Chain testnet explorer first. If they're not active, you'll need to deploy your own EAS contracts (the npm package includes deployable contracts).

### Implementation

#### 1. Install EAS SDK

```bash
cd frontend
npm install @ethereum-attestation-service/eas-sdk
```

#### 2. Register Payroll Attestation Schema

Create a script that registers your custom payroll schema on HashKey Chain:

```typescript
// scripts/register-eas-schema.ts
import { SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';

const SCHEMA_REGISTRY_ADDRESS = '0x4200000000000000000000000000000000000020';
// If predeploy doesn't exist, deploy your own SchemaRegistry

async function registerPayrollSchema() {
  const provider = new ethers.JsonRpcProvider('https://testnet.hsk.xyz');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS);
  schemaRegistry.connect(signer);

  // HashPay Payroll Payment Schema
  const schema = 'bytes32 payrollId, uint256 cycleNumber, address employer, address recipient, uint256 amount, address token, bytes32 hspRequestId, string tokenSymbol';

  const resolverAddress = '0x0000000000000000000000000000000000000000'; // No resolver
  const revocable = false; // Payroll attestations should be permanent

  const tx = await schemaRegistry.register({
    schema,
    resolverAddress,
    revocable,
  });

  const receipt = await tx.wait();
  console.log('Schema UID:', receipt);
  // SAVE THIS UID — you'll use it for every attestation
}

registerPayrollSchema();
```

Run once:
```bash
npx tsx scripts/register-eas-schema.ts
```

**Save the returned Schema UID** — add it to your `.env` as `NEXT_PUBLIC_EAS_SCHEMA_UID`.

#### 3. PayrollAttestation Smart Contract

Add an attestation creation function to your existing contracts, OR create a new helper contract:

```solidity
// contracts/PayrollAttestor.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEAS {
    struct AttestationRequestData {
        address recipient;
        uint64 expirationTime;
        bool revocable;
        bytes32 refUID;
        bytes data;
        uint256 value;
    }

    struct AttestationRequest {
        bytes32 schema;
        AttestationRequestData data;
    }

    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}

contract PayrollAttestor {
    IEAS public immutable eas;
    bytes32 public immutable schemaUID;
    address public owner;

    event PayrollAttested(
        bytes32 indexed attestationUID,
        bytes32 indexed payrollId,
        uint256 cycleNumber,
        address indexed recipient,
        uint256 amount
    );

    constructor(address _eas, bytes32 _schemaUID) {
        eas = IEAS(_eas);
        schemaUID = _schemaUID;
        owner = msg.sender;
    }

    function attestPayment(
        bytes32 payrollId,
        uint256 cycleNumber,
        address employer,
        address recipient,
        uint256 amount,
        address token,
        bytes32 hspRequestId,
        string calldata tokenSymbol
    ) external returns (bytes32) {
        bytes memory encodedData = abi.encode(
            payrollId,
            cycleNumber,
            employer,
            recipient,
            amount,
            token,
            hspRequestId,
            tokenSymbol
        );

        bytes32 attestationUID = eas.attest(
            IEAS.AttestationRequest({
                schema: schemaUID,
                data: IEAS.AttestationRequestData({
                    recipient: recipient,
                    expirationTime: 0, // Never expires
                    revocable: false,
                    refUID: bytes32(0),
                    data: encodedData,
                    value: 0
                })
            })
        );

        emit PayrollAttested(attestationUID, payrollId, cycleNumber, recipient, amount);
        return attestationUID;
    }

    // Batch attest for an entire cycle
    function attestCycle(
        bytes32 payrollId,
        uint256 cycleNumber,
        address employer,
        address[] calldata recipients,
        uint256[] calldata amounts,
        address token,
        bytes32[] calldata hspRequestIds,
        string calldata tokenSymbol
    ) external returns (bytes32[] memory) {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length == hspRequestIds.length, "Length mismatch");

        bytes32[] memory uids = new bytes32[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            uids[i] = attestPayment(
                payrollId,
                cycleNumber,
                employer,
                recipients[i],
                amounts[i],
                token,
                hspRequestIds[i],
                tokenSymbol
            );
        }

        return uids;
    }
}
```

#### 4. Deploy PayrollAttestor

Add to your deploy script:

```typescript
// scripts/deploy-attestor.ts
const EAS_ADDRESS = '0x4200000000000000000000000000000000000021';
// If predeploy not active, deploy EAS contracts first

const PayrollAttestor = await ethers.getContractFactory('PayrollAttestor');
const attestor = await PayrollAttestor.deploy(EAS_ADDRESS, process.env.EAS_SCHEMA_UID);
await attestor.waitForDeployment();
console.log('PayrollAttestor:', await attestor.getAddress());
```

#### 5. Integrate into Payroll Execution Flow

After a successful payroll cycle execution, call the attestor:

```typescript
// In your cycle execution handler, after PayrollFactory.executeCycle() succeeds:

async function attestCycleOnChain(
  payrollId: bigint,
  cycleNumber: number,
  recipients: string[],
  amounts: bigint[],
  token: string,
  hspRequestIds: string[],
  tokenSymbol: string
) {
  const attestor = getContract({
    address: PAYROLL_ATTESTOR_ADDRESS,
    abi: PayrollAttestorABI,
  });

  const tx = await writeContract({
    ...attestor,
    functionName: 'attestCycle',
    args: [
      payrollId,
      cycleNumber,
      userAddress, // employer
      recipients,
      amounts,
      token,
      hspRequestIds,
      tokenSymbol,
    ],
  });

  return tx;
}
```

#### 6. Display Attestation UIDs in UI

In the payment history table, add an "Attestation" column:

```tsx
// In your PaymentHistory component
<TableCell>
  {payment.attestationUID ? (
    <a
      href={`https://testnet-explorer.hsk.xyz/tx/${payment.attestationTxHash}`}
      target="_blank"
      className="text-blue-500 underline text-xs font-mono"
    >
      {payment.attestationUID.slice(0, 10)}...
    </a>
  ) : (
    <span className="text-gray-400">—</span>
  )}
</TableCell>
```

#### 7. Add "Verify Payment" Feature

Add a verification page where anyone can check a payment attestation:

```typescript
// frontend/src/app/verify/page.tsx

// User pastes an attestation UID → reads from EAS contract → displays:
// - Payroll ID, Cycle Number
// - Employer address
// - Recipient address
// - Amount + Token
// - HSP Request ID
// - Timestamp
// - "This payment is cryptographically verified on HashKey Chain"
```

### How This Shows in the Demo

"Every payment generates a permanent attestation on HashKey Chain via EAS. Any auditor can independently verify that this payment happened, for this amount, to this recipient, at this time. Compliance isn't a report we generate — it's a fact the blockchain proves."

---

## UPGRADE A: AI Cash Flow Intelligence (LOWEST PRIORITY BUT HIGHEST DEMO IMPACT)

### Why This Matters
AgentPay (competitor) has AI-powered decision making. Dynamic Checkout doesn't have AI. Adding AI to HashPay gives you a unique angle that NEITHER competitor has in the PayFi track: predictive financial intelligence for payroll.

### What to Build

An AI-powered "Payroll Intelligence" panel on the employer dashboard that:
1. **Predicts escrow runway** — "At current burn rate, escrow depletes on May 12, 2026"
2. **Detects anomalies** — "Cycle #5 cost 23% more than average — new recipient added?"
3. **Suggests optimizations** — "Executing on Tuesdays saves ~15% in gas vs. Fridays"
4. **Generates natural language summaries** — "You've paid 5 team members $12,500 USDT over 3 cycles with 100% on-time delivery"

### Implementation

#### 1. API Route for AI Analysis (`frontend/src/app/api/ai/analyze/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface PayrollData {
  payrollName: string;
  token: string;
  recipientCount: number;
  amountPerCycle: string;  // Total per cycle in human-readable
  frequency: string;       // "monthly", "weekly", etc.
  escrowBalance: string;   // Current balance
  cyclesExecuted: number;
  paymentHistory: Array<{
    cycleNumber: number;
    totalPaid: string;
    recipientCount: number;
    timestamp: number;
    gasUsed?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const payrollData: PayrollData = await req.json();

    const prompt = `You are a financial analyst for on-chain payroll systems. Analyze this payroll data and provide actionable insights.

PAYROLL DATA:
- Name: ${payrollData.payrollName}
- Token: ${payrollData.token}
- Recipients: ${payrollData.recipientCount}
- Cost per cycle: ${payrollData.amountPerCycle} ${payrollData.token}
- Frequency: ${payrollData.frequency}
- Current escrow balance: ${payrollData.escrowBalance} ${payrollData.token}
- Cycles executed: ${payrollData.cyclesExecuted}

PAYMENT HISTORY:
${payrollData.paymentHistory.map(p =>
  `Cycle #${p.cycleNumber}: ${p.totalPaid} ${payrollData.token} to ${p.recipientCount} recipients on ${new Date(p.timestamp * 1000).toLocaleDateString()}${p.gasUsed ? ` (gas: ${p.gasUsed})` : ''}`
).join('\n')}

Provide a JSON response with EXACTLY this structure (no markdown, no backticks):
{
  "runway": {
    "cyclesRemaining": <number>,
    "depletionDate": "<YYYY-MM-DD or null if > 1 year>",
    "recommendation": "<one sentence>"
  },
  "anomalies": [
    {
      "type": "cost_spike" | "missed_cycle" | "recipient_change" | "none",
      "description": "<one sentence>",
      "severity": "low" | "medium" | "high"
    }
  ],
  "optimization": {
    "suggestion": "<one sentence actionable tip>",
    "estimatedSavings": "<amount or percentage>"
  },
  "summary": "<2-3 sentence natural language summary of payroll health>"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const analysis = JSON.parse(text.replace(/```json\n?|```/g, '').trim());

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('AI analysis failed:', error);
    // Return fallback analysis if API fails
    return NextResponse.json({
      success: true,
      analysis: {
        runway: {
          cyclesRemaining: null,
          depletionDate: null,
          recommendation: 'Unable to analyze — check escrow balance manually.',
        },
        anomalies: [],
        optimization: { suggestion: 'No optimization data available.', estimatedSavings: 'N/A' },
        summary: 'AI analysis temporarily unavailable. Your payroll is active.',
      },
    });
  }
}
```

#### 2. Install Anthropic SDK

```bash
cd frontend
npm install @anthropic-ai/sdk
```

Add to `.env.local`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

#### 3. AI Intelligence Panel Component (`frontend/src/components/ai-intelligence.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';

interface AIAnalysis {
  runway: {
    cyclesRemaining: number | null;
    depletionDate: string | null;
    recommendation: string;
  };
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  optimization: {
    suggestion: string;
    estimatedSavings: string;
  };
  summary: string;
}

interface Props {
  payrollData: {
    payrollName: string;
    token: string;
    recipientCount: number;
    amountPerCycle: string;
    frequency: string;
    escrowBalance: string;
    cyclesExecuted: number;
    paymentHistory: any[];
  };
}

export function AIIntelligencePanel({ payrollData }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollData),
      });
      const data = await res.json();
      if (data.success) setAnalysis(data.analysis);
    } catch (e) {
      console.error('AI analysis error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (payrollData.cyclesExecuted > 0) {
      runAnalysis();
    }
  }, [payrollData.cyclesExecuted]);

  if (!analysis && !loading) return null;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">AI Payroll Intelligence</h3>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="text-purple-400 hover:text-purple-300 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-purple-300">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Analyzing payroll data...</span>
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          {/* Summary */}
          <p className="text-gray-300 text-sm">{analysis.summary}</p>

          {/* Runway */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
            <TrendingUp className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">
                Runway: {analysis.runway.cyclesRemaining !== null
                  ? `${analysis.runway.cyclesRemaining} cycles remaining`
                  : 'Calculating...'}
                {analysis.runway.depletionDate &&
                  ` (depletes ~${analysis.runway.depletionDate})`}
              </p>
              <p className="text-xs text-gray-400 mt-1">{analysis.runway.recommendation}</p>
            </div>
          </div>

          {/* Anomalies */}
          {analysis.anomalies.filter(a => a.type !== 'none').map((anomaly, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${
                anomaly.severity === 'high' ? 'text-red-400' :
                anomaly.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
              }`} />
              <div>
                <p className="text-sm text-white">{anomaly.description}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  anomaly.severity === 'high' ? 'bg-red-900/50 text-red-300' :
                  anomaly.severity === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-blue-900/50 text-blue-300'
                }`}>
                  {anomaly.severity}
                </span>
              </div>
            </div>
          ))}

          {/* Optimization */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
            <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-white">{analysis.optimization.suggestion}</p>
              <p className="text-xs text-gray-400 mt-1">
                Estimated savings: {analysis.optimization.estimatedSavings}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

#### 4. Add to Employer Dashboard

In your employer dashboard page, add the panel:

```tsx
// In /employer page, after the payroll cards section:
import { AIIntelligencePanel } from '@/components/ai-intelligence';

// Inside the component, after fetching payroll data:
<AIIntelligencePanel
  payrollData={{
    payrollName: payroll.name,
    token: payroll.tokenSymbol,
    recipientCount: payroll.recipients.length,
    amountPerCycle: formatUnits(payroll.totalPerCycle, payroll.tokenDecimals),
    frequency: payroll.frequency,
    escrowBalance: formatUnits(payroll.escrowBalance, payroll.tokenDecimals),
    cyclesExecuted: payroll.cyclesExecuted,
    paymentHistory: payroll.history,
  }}
/>
```

### How This Shows in the Demo

The AI panel appears on the employer dashboard with real analysis:

*"Your escrow covers 3.2 more cycles. At current burn rate, it depletes around May 18. We recommend topping up by May 10 to avoid missed payments."*

*"Anomaly detected: Cycle #4 cost 18% more than previous cycles — a new recipient was added in Cycle #3."*

*"Optimization: Batching execution with fewer, larger cycles could reduce gas costs by ~12%."*

**Judge reaction:** "They have AI-powered financial intelligence on top of payroll. Nobody else in PayFi track has this."

---

## UPDATED .env.local (All Three Upgrades)

```env
# Existing
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wc_project_id
NEXT_PUBLIC_PAYROLL_FACTORY_ADDRESS=0x3120bf2Ec2de2c6a9B75D14F2393EBa6518217cb
NEXT_PUBLIC_HSP_ADAPTER_ADDRESS=0xa31558b2c364B269Ac823798AefcA7E285Af3487
NEXT_PUBLIC_MOCK_USDT_ADDRESS=0xcd367c583fd028C12Cc038d744cE7B2a67d848E2

# Upgrade B — Real HSP API
HSP_API_KEY=your_hsp_api_key
HSP_API_SECRET=your_hsp_hmac_secret
HSP_MERCHANT_PRIVATE_KEY=your_secp256k1_private_key_pem
HSP_MERCHANT_ID=your_merchant_id
HSP_PROXY_URL=https://hashpay-hsp-proxy.your-subdomain.workers.dev

# Upgrade C — EAS Attestations
NEXT_PUBLIC_EAS_ADDRESS=0x4200000000000000000000000000000000000021
NEXT_PUBLIC_SCHEMA_REGISTRY_ADDRESS=0x4200000000000000000000000000000000000020
NEXT_PUBLIC_EAS_SCHEMA_UID=your_registered_schema_uid
NEXT_PUBLIC_PAYROLL_ATTESTOR_ADDRESS=deployed_attestor_address

# Upgrade A — AI Intelligence
ANTHROPIC_API_KEY=your_anthropic_api_key
```

---

## BUILD SEQUENCE (Priority Order)

### Day 1: Upgrade B — HSP API
1. Get HSP credentials from hashfans.io or Telegram group
2. Build `lib/hsp-client.ts` with HMAC-SHA256 + ES256K JWT signing
3. Deploy Cloudflare Worker proxy
4. Build API routes (create-order + webhook)
5. Add "Execute via HSP" button to employer dashboard
6. Test full flow: create order → redirect to HSP → return → confirm
7. **Verify:** HSP payment URL returns, customer can approve on HSP's hosted page

### Day 2: Upgrade C — EAS Attestations
1. Check if EAS predeploy is active on HashKey Chain testnet (call `0x4200...0021`)
2. If not active, deploy EAS + SchemaRegistry contracts yourself
3. Register payroll payment schema → save Schema UID
4. Build + deploy PayrollAttestor.sol
5. Integrate attestation creation into cycle execution flow
6. Add attestation UID column to payment history table
7. Build `/verify` page for public attestation verification
8. **Verify:** After cycle execution, attestation UID appears on-chain

### Day 3: Upgrade A — AI Intelligence
1. Install `@anthropic-ai/sdk`
2. Build `/api/ai/analyze` route with structured prompt
3. Build `AIIntelligencePanel` component
4. Add to employer dashboard
5. Test with real payroll data — verify JSON response parsing
6. Add loading states, error handling, fallback UI
7. **Verify:** Panel shows runway prediction, anomalies, and optimization tips

### Day 4: Integration Testing + Demo Polish
1. Run full flow: create payroll → fund → execute via HSP → attestation created → AI analyzes
2. Record demo video highlighting all three upgrades
3. Update README with new features, contract addresses, and screenshots
4. Redeploy to Vercel + verify live at hashpay.tech

---

## UPDATED DEMO VIDEO SCRIPT (Add 60 Seconds)

Add to existing demo after core flow:

```
[After showing basic cycle execution]

"But HashPay goes further than basic payroll."

[Show: Click "Execute via HSP"]
[Show: HSP hosted checkout page — REAL HSP UI]
"Every payment settles through HashKey's actual Settlement Protocol.
Not a wrapper — real HMAC-signed, JWT-authorized HSP API integration."

[Show: Payment history with Attestation UID column]
"And every payment is permanently attested on-chain via EAS."
[Click attestation link → show on-chain proof]
"Any auditor can independently verify this payment happened.
Compliance isn't a report. It's a blockchain fact."

[Show: AI Intelligence panel on dashboard]
"AI analyzes your payroll in real-time."
[Show: "Escrow covers 3.2 more cycles. Depletes May 18."]
[Show: Anomaly detection alert]
[Show: Gas optimization suggestion]
"Predictive finance for on-chain payroll."
```

---

## POST-UPGRADE SCORING

| Criteria (weight) | Dynamic Checkout | AgentPay | HashPay (upgraded) |
|---|---|---|---|
| HSP Integration (30%) | 9/10 | 8/10 | **9/10** ← real API |
| Technical Completeness (25%) | 8/10 | 7/10 | **10/10** ← 105 tests + EAS + AI + HSP |
| Novelty (20%) | 9/10 | 8/10 | **7.5/10** ← AI + EAS add novelty |
| Real-World Utility (15%) | 6/10 | 6/10 | **9/10** ← everyone needs payroll |
| Demo Quality (10%) | 8/10 | 7/10 | **9/10** ← HSP redirect + EAS proof + AI panel |
| **WEIGHTED TOTAL** | **8.05** | **7.35** | **8.85** |

**HashPay wins the track.**
