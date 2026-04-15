import { DocShell } from "@/components/doc-shell";

export default function Page() {
  return (
    <DocShell title="Compliance Hooks" tagline="Pluggable gating" contract="ComplianceHookRegistry.sol">
      <p>
        <strong>Compliance is configuration, not code.</strong> Employers attach any subset of
        hooks per-payroll. Each recipient passes through every hook during <code>executeCycle</code>.
        Failures short-circuit to <code>RecipientSkipped</code> — other recipients in the same cycle
        are paid normally.
      </p>
      <h2>Reference hooks shipped</h2>
      <ul>
        <li><strong>KYCSBTHook</strong> — requires recipient holds a Soulbound Token from a specified issuer.</li>
        <li><strong>JurisdictionHook</strong> — allowlist of country codes per recipient.</li>
        <li><strong>SanctionsHook</strong> — owner-maintained sanctioned address blocklist.</li>
        <li><strong>RateLimitHook</strong> — per-recipient daily cap across all payrolls (<em>bonus</em>).</li>
        <li><strong>TimelockHook</strong> — large payouts delayed by N hours (<em>bonus</em>).</li>
      </ul>
      <h2>Build your own</h2>
      <pre><code>{`interface IComplianceHook {
  function check(
    address employer,
    address recipient,
    uint256 amount,
    uint256 payrollId
  ) external view returns (bool passed, string memory reason);
}`}</code></pre>
      <h2>Limits</h2>
      <p>Max 5 hooks per payroll (gas protection). Hooks are pure <code>view</code>; cannot mutate state during settlement.</p>
    </DocShell>
  );
}
