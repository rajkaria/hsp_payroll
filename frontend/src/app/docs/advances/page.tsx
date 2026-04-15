import { DocShell } from "@/components/doc-shell";

export default function Page() {
  return (
    <DocShell title="Advances" tagline="Receipt-backed credit" contract="PayrollAdvance.sol">
      <p>
        <strong>Advances</strong> close the PayFi loop: Income → Reputation → Credit → Settlement.
        Recipients borrow against their next confirmed payout. Repayment is auto-deducted
        during <code>executeCycle</code>. Lenders earn interest distributed pro-rata via shares.
      </p>
      <h2>Reputation-tiered LTV + APR</h2>
      <table>
        <thead><tr><th>Income</th><th>On-time rate</th><th>Max LTV</th><th>Interest</th></tr></thead>
        <tbody>
          <tr><td>≥ $10k</td><td>≥ 80%</td><td>70%</td><td>1% / cycle</td></tr>
          <tr><td>$1k – $10k</td><td>any</td><td>50%</td><td>1.5% / cycle</td></tr>
          <tr><td>$100 – $1k</td><td>any</td><td>30%</td><td>2% / cycle</td></tr>
          <tr><td>&lt; $100</td><td>—</td><td>0 (denied)</td><td>—</td></tr>
        </tbody>
      </table>
      <h2>Repayment flow</h2>
      <pre><code>{`executeCycle() {
  for each recipient:
    netAmount = onRepay(payrollId, recipient, grossAmount, token)
    // debt + interest deducted; net transferred to recipient
    // debt portion pushed to advance pool; interest = lender yield
}`}</code></pre>
      <h2>Lender pool</h2>
      <p>
        Lenders deposit USDT into the pool; receive shares. Interest from repaid advances
        grows pool TVL. Withdraw anytime at current share price.
      </p>
      <h2>Tokenized positions (bonus)</h2>
      <p>
        Lender shares can be minted as ERC-721 <code>AdvancePositionNFT</code> — tradeable on
        secondary markets without closing the underlying position.
      </p>
    </DocShell>
  );
}
