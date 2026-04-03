import { NextRequest, NextResponse } from "next/server";

interface PayrollData {
  payrollName: string;
  token: string;
  recipientCount: number;
  amountPerCycle: number;
  frequency: string;
  escrowBalance: number;
  cyclesExecuted: number;
}

function generateMockAnalysis(data: PayrollData) {
  const cyclesRemaining = data.amountPerCycle > 0
    ? Math.floor(data.escrowBalance / data.amountPerCycle)
    : 0;

  const freqDays = data.frequency === "Weekly" ? 7 : data.frequency === "Biweekly" ? 14 : 30;
  const daysRemaining = cyclesRemaining * freqDays;
  const depletionDate = new Date(Date.now() + daysRemaining * 86400000);

  return {
    summary: `${data.payrollName} has paid ${data.recipientCount} team members over ${data.cyclesExecuted} cycles. Current escrow covers approximately ${cyclesRemaining} more ${data.frequency.toLowerCase()} cycles. The payroll is operating within normal parameters.`,
    runway: {
      cyclesRemaining,
      estimatedDate: depletionDate.toISOString().split("T")[0],
      recommendation: cyclesRemaining <= 3
        ? `Low runway — consider topping up escrow before ${depletionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} to avoid missed payments.`
        : `Healthy runway of ${cyclesRemaining} cycles. Next recommended top-up in ${Math.max(1, cyclesRemaining - 3)} cycles.`,
    },
    anomalies: data.cyclesExecuted > 2
      ? [
          {
            type: "cost_variation" as const,
            description: `Cycle costs have been consistent at ${data.amountPerCycle.toLocaleString()} ${data.token} per cycle — no anomalies detected.`,
            severity: "low" as const,
          },
        ]
      : [],
    optimizations: [
      {
        title: "Batch Execution Timing",
        description: `Executing cycles during off-peak hours (UTC 02:00-06:00) could reduce gas costs by ~8-12% on HashKey Chain.`,
        impact: "~$0.002 per cycle",
      },
      {
        title: "Escrow Efficiency",
        description: `Current runway of ${cyclesRemaining} cycles is ${cyclesRemaining > 6 ? "above" : "near"} the recommended 6-cycle buffer. ${cyclesRemaining > 12 ? "Consider withdrawing excess to earn yield elsewhere." : ""}`,
        impact: cyclesRemaining > 12 ? "Capital efficiency" : "Risk mitigation",
      },
    ],
    healthScore: Math.min(100, Math.max(20, cyclesRemaining * 10 + data.cyclesExecuted * 5)),
    _meta: { mode: "demo" as const },
  };
}

export async function POST(req: NextRequest) {
  try {
    const payrollData: PayrollData = await req.json();

    // Check for real API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic({ apiKey });

        const prompt = `You are a financial analyst for on-chain payroll systems. Analyze this payroll data and provide actionable insights.

PAYROLL DATA:
- Name: ${payrollData.payrollName}
- Token: ${payrollData.token}
- Recipients: ${payrollData.recipientCount}
- Cost per cycle: ${payrollData.amountPerCycle} ${payrollData.token}
- Frequency: ${payrollData.frequency}
- Current escrow: ${payrollData.escrowBalance} ${payrollData.token}
- Cycles executed: ${payrollData.cyclesExecuted}

Respond with ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence summary",
  "runway": { "cyclesRemaining": number, "estimatedDate": "YYYY-MM-DD", "recommendation": "one sentence" },
  "anomalies": [{ "type": "string", "description": "string", "severity": "low|medium|high" }],
  "optimizations": [{ "title": "string", "description": "string", "impact": "string" }],
  "healthScore": 0-100
}`;

        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        const analysis = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
        return NextResponse.json({ success: true, ...analysis, _meta: { mode: "live" } });
      } catch {
        // Fall through to mock
      }
    }

    // Mock mode
    const analysis = generateMockAnalysis(payrollData);
    return NextResponse.json({ success: true, ...analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
