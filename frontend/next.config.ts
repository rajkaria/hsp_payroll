import type { NextConfig } from "next";

/**
 * Cross-origin isolation headers — required for SharedArrayBuffer,
 * which the Zama relayer SDK uses to multi-thread the FHE ZK input
 * proof. Without these, the SDK falls back to single-threaded WASM
 * and an encryption takes 30-90s instead of 5-15s.
 *
 * Scoped to /confidential* paths only so the rest of the app
 * (employer, employee, faucet, lender, etc.) isn't subject to COEP's
 * stricter resource loading rules — those pages embed third-party
 * resources that don't ship the required CORP/CORS headers.
 */
const COOP_COEP_HEADERS = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      { source: "/confidential", headers: COOP_COEP_HEADERS },
      { source: "/confidential/:path*", headers: COOP_COEP_HEADERS },
      // Same-origin resources loaded by the isolated pages also need
      // Cross-Origin-Resource-Policy so COEP's require-corp accepts them.
      {
        source: "/zama/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }],
      },
      {
        source: "/:file(tfhe_bg.wasm|kms_lib_bg.wasm|workerHelpers.js)",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }],
      },
    ];
  },
};

export default nextConfig;
