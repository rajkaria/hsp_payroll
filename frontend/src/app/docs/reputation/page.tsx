import { DocShell } from "@/components/doc-shell";

export default function Page() {
  return (
    <DocShell title="Reputation" tagline="What receipts compose into" contract="ReputationRegistry.sol">
      <p>
        <strong>Reputation</strong> aggregates every EAS attestation from <code>PayrollAttestor</code>
        into a per-recipient stat block. Reads are permissionless. This is the primitive that
        other DeFi/PayFi protocols can build credit, KYC, and lending on top of — without asking
        anyone for keys.
      </p>
      <h2>Stats tracked</h2>
      <ul>
        <li>Total received (lifetime)</li>
        <li>Unique employer count</li>
        <li>On-time rate (within ±10% of cycle interval)</li>
        <li>First + last payment timestamps</li>
        <li>Full attestation UID list</li>
      </ul>
      <h2>Chainlink-compatible oracle</h2>
      <p>
        The registry exposes <code>latestRoundData()</code> and <code>latestAnswer()</code>,
        so any lending protocol expecting an AggregatorV3 can consume verified income as a price feed.
      </p>
      <h2>Permissionless eligibility check</h2>
      <pre><code>{`bool eligible = IReputation(REG).verifyMinimumIncome(
  applicant,
  50_000 * 1e6,  // $50k min
  90 days        // rolling window
);`}</code></pre>
      <h2>Milestones + Income NFTs</h2>
      <p>
        Hitting $1k / $10k / $50k / $100k / $500k / $1m emits a milestone event and bumps the
        shareable badge on the recipient's public reputation page.
      </p>
    </DocShell>
  );
}
