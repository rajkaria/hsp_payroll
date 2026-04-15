import { DocShell } from "@/components/doc-shell";

export default function Page() {
  return (
    <DocShell title="Salary Index" tagline="Fiat-denominated pay" contract="SalaryIndex.sol">
      <p>
        <strong>Salary Index</strong> lets employers quote salaries in INR, USD, EUR, or any fiat
        with a Chainlink price feed. At <code>executeCycle</code> time, the oracle resolves the fiat
        amount to tokens — perfect for emerging-market teams paid in stablecoins.
      </p>
      <h2>Flow</h2>
      <pre><code>{`// Employer stores INR-denominated salary
setFiatSalary(payrollId, recipient, "INR", 85_000 * 1e8)

// At execute time, SalaryIndex converts via ChainLink
uint256 usdt = tokenAmountFor("INR", 85_000 * 1e8, 6 /* decimals */);
// → ~1000 USDT at 85 INR/USD`}</code></pre>
      <h2>Why it matters</h2>
      <p>
        Indian contributors paid in USDT want their take-home in rupees to be stable month-to-month.
        Salary indexing absorbs FX volatility so the employee sees predictable pay in local terms.
      </p>
    </DocShell>
  );
}
