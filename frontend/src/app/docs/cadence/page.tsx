import { DocShell } from "@/components/doc-shell";

export default function Page() {
  return (
    <DocShell title="Cadence" tagline="How money flows" contract="AdaptiveCadence.sol">
      <p>
        <strong>Cadence</strong> is the primitive that decides how settled funds are delivered to a recipient.
        Employer funds the escrow once; each recipient picks their mode independently (within
        employer-permitted bounds).
      </p>
      <h2>Modes</h2>
      <ul>
        <li><strong>Batch</strong> — full cycle amount delivered at <code>executeCycle</code>.</li>
        <li><strong>Stream</strong> — committed balance ticks per-second; recipient claims anytime.</li>
        <li><strong>Pull</strong> — cycles accumulate; recipient claims on-demand.</li>
        <li><strong>Hybrid</strong> — split payout: configurable bps streams, remainder batches.</li>
      </ul>
      <h2>Math</h2>
      <pre><code>{`streamRate = amountPerCycle / cyclePeriod
accrued(t) = min(
  (t - lastClaimTime) * streamRate,
  committedBalance - alreadyClaimed
)`}</code></pre>
      <h2>Key functions</h2>
      <pre><code>{`setCadencePolicy(payrollId, recipient, mode, canSwitch, hybridBps)
setRecipientCadence(payrollId, mode) // if canSwitch
claim(payrollId) returns (uint256)
accruedFor(payrollId, recipient) view returns (uint256)`}</code></pre>
      <h2>Guarantees</h2>
      <ul>
        <li>Accrued never exceeds committed.</li>
        <li>Mode switch preserves accrued balance.</li>
        <li>Reentrancy-guarded claim.</li>
      </ul>
    </DocShell>
  );
}
