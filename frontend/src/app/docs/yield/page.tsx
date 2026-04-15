import { DocShell } from "@/components/doc-shell";

export default function Page() {
  return (
    <DocShell title="Yield" tagline="What idle money does" contract="YieldEscrow.sol + MockYieldVault.sol">
      <p>
        <strong>Yield</strong> routes idle escrow into an ERC-4626 vault.
        On <code>executeCycle</code>, YieldEscrow withdraws the exact amount needed
        and returns it to PayrollFactory. Everything else keeps earning.
      </p>
      <h2>Runway extension</h2>
      <p>
        A 100k USDT escrow at 4.5% APY earns 4,500/yr. A 6-month base runway becomes ~7.2 months
        without any operational change.
      </p>
      <h2>Modes</h2>
      <ul>
        <li><strong>Auto-compound</strong> — yield stays in vault, extending runway.</li>
        <li><strong>Manual</strong> — employer claims yield via <code>claimYield()</code>.</li>
      </ul>
      <h2>Interface</h2>
      <pre><code>{`enableYield(payrollId, vault, autoCompound)
disableYield(payrollId)
claimYield(payrollId) returns (uint256)
availableBalance(payrollId) view returns (uint256)
accruedYield(payrollId) view returns (uint256)
runwayWithYield(payrollId, cycleCost) view returns (base, extended)`}</code></pre>
      <h2>Swap for any ERC-4626</h2>
      <p>
        MockYieldVault ships with 4.5% simulated APY. In production, pass any ERC-4626 vault address
        to <code>enableYield()</code>.
      </p>
    </DocShell>
  );
}
