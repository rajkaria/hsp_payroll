import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Reads `fhevm/deployments.json` and writes the matching
 * NEXT_PUBLIC_* env vars into `frontend/.env.local`. Idempotent —
 * preserves any unrelated keys the user already set.
 *
 * Run after `npm run deploy:sepolia`.
 */
function main() {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.error(
      "deployments.json not found. Run `npm run deploy:sepolia` first.",
    );
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const c = deployments.contracts;

  const wanted: Record<string, string> = {
    NEXT_PUBLIC_CONFIDENTIAL_USDT: c.ConfidentialUSDT,
    NEXT_PUBLIC_CONFIDENTIAL_SALARY_INDEX: c.ConfidentialSalaryIndex,
    NEXT_PUBLIC_CONFIDENTIAL_REPUTATION_REGISTRY:
      c.ConfidentialReputationRegistry,
    NEXT_PUBLIC_CONFIDENTIAL_ADVANCE: c.ConfidentialAdvance,
    NEXT_PUBLIC_PAYROLL_ATTESTOR_MIRROR: c.PayrollAttestorMirror,
    NEXT_PUBLIC_CONFIDENTIAL_COMPLIANCE: c.ConfidentialCompliance,
    NEXT_PUBLIC_CONFIDENTIAL_PAYROLL_ROSTER: c.ConfidentialPayrollRoster,
    NEXT_PUBLIC_INCOME_PROVER: c.IncomeProver,
    NEXT_PUBLIC_CONFIDENTIAL_EMPLOYER_RUNWAY: c.ConfidentialEmployerRunway,
    NEXT_PUBLIC_CONFIDENTIAL_ADVANCE_POSITION_NFT:
      c.ConfidentialAdvancePositionNFT,
    NEXT_PUBLIC_CONFIDENTIAL_FX_ORACLE: c.ConfidentialFXOracle,
  };

  const envPath = path.join(__dirname, "..", "..", "frontend", ".env.local");
  const existing = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";
  const lines = existing ? existing.split("\n") : [];
  const seen = new Set<string>();

  const updated = lines.map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (m && m[1] in wanted) {
      seen.add(m[1]);
      return `${m[1]}=${wanted[m[1]]}`;
    }
    return line;
  });

  for (const [k, v] of Object.entries(wanted)) {
    if (!seen.has(k)) updated.push(`${k}=${v}`);
  }

  // Trim trailing blank lines, ensure single trailing newline.
  while (updated.length && updated[updated.length - 1] === "") updated.pop();
  fs.writeFileSync(envPath, `${updated.join("\n")}\n`);
  console.log(`Wrote ${envPath}`);
  for (const k of Object.keys(wanted)) console.log(`  ${k}=${wanted[k]}`);
}

main();
