// Chain registry — testnets + mainnets, with deployment addresses where available.
// Mainnet deployments currently empty; contracts ship ready, addresses populated on first deploy.

import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  type Chain,
} from "viem/chains";

// HashKey Chain (mainnet + testnet). Not in viem's default export, so we define inline.
export const hashkeyChain: Chain = {
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "Hashkey EcoPoints", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.hsk.xyz"] } },
  blockExplorers: {
    default: { name: "HashKey Explorer", url: "https://explorer.hsk.xyz" },
  },
};

export const hashkeyTestnet: Chain = {
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "Hashkey EcoPoints", symbol: "tHSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://hashkeychain-testnet.alt.technology"] } },
  blockExplorers: {
    default: {
      name: "HashKey Testnet Explorer",
      url: "https://hashkeychain-testnet-explorer.alt.technology",
    },
  },
  testnet: true,
};

export type CoreAddresses = {
  HSP_ADAPTER?: `0x${string}`;
  PAYROLL_FACTORY?: `0x${string}`;
  MOCK_USDT?: `0x${string}`;
  PAYROLL_ATTESTOR?: `0x${string}`;
  EAS?: `0x${string}`;
  EAS_SCHEMA_UID?: `0x${string}`;
};

export type ProtocolAddresses = {
  REPUTATION_REGISTRY?: `0x${string}`;
  ADAPTIVE_CADENCE?: `0x${string}`;
  MOCK_YIELD_VAULT?: `0x${string}`;
  YIELD_ESCROW?: `0x${string}`;
  PAYROLL_ADVANCE?: `0x${string}`;
  COMPLIANCE_REGISTRY?: `0x${string}`;
  KYC_SBT?: `0x${string}`;
  KYC_HOOK?: `0x${string}`;
  JURISDICTION_HOOK?: `0x${string}`;
  SANCTIONS_HOOK?: `0x${string}`;
  SALARY_INDEX?: `0x${string}`;
};

export type ChainEntry = {
  chain: Chain;
  rpcUrlEnv?: string;
  core: CoreAddresses;
  protocol: ProtocolAddresses;
  status: "deployed" | "partial" | "undeployed";
};

// Deployment registry. Addresses for Sepolia + HashKey Testnet are live;
// mainnets + other testnets are scaffolded and will populate on first deploy.
export const CHAIN_REGISTRY: Record<number, ChainEntry> = {
  // ==================== TESTNETS ====================
  11155111: {
    chain: sepolia,
    rpcUrlEnv: "SEPOLIA_RPC_URL",
    core: {
      HSP_ADAPTER: "0x083b4713c7D90506ABD165CeFB59F744522Ac523",
      PAYROLL_FACTORY: "0xD15E9249103E9399eF4FBba85f8e695AA36c3b54",
      MOCK_USDT: "0xCa52178fa3bE627fa51378Be5ef11C8015D1ec23",
      PAYROLL_ATTESTOR: "0x93437997BF08bE7572a503E4CbE4fee70E6DF25B",
      EAS: "0xc2679fBd37d54388cE493f1db75e8dAD8e0b84D5",
      EAS_SCHEMA_UID:
        "0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4",
    },
    protocol: {
      REPUTATION_REGISTRY: "0x91821068e7B7F433261E677D7d16e07d644F12BC",
      ADAPTIVE_CADENCE: "0x2e17e724762946553B1B1A4538735B96ed94Ac1D",
      MOCK_YIELD_VAULT: "0xF442340eA470FA4f5521457d73e46d218833C145",
      YIELD_ESCROW: "0x1A0b9B180a386323D10BA6CD3501c3B981592EdA",
      PAYROLL_ADVANCE: "0xFE16F215499eAee41Dff836d42b220188FD72eCa",
      COMPLIANCE_REGISTRY: "0x666E5102A67023f780aee7563922600f994b35A4",
      KYC_SBT: "0xC5ffc11D030540Aca23cEfe265328061De502316",
      KYC_HOOK: "0x5494fc9A4AeE20d5a8877eFDd9Fb136E5d1D23e7",
      JURISDICTION_HOOK: "0xf88B9C498076C8752055f4b517f074DD8763Cf1a",
      SANCTIONS_HOOK: "0xB028Ff64Aef20F7d4282FDEB971bFcefa540BBc5",
      SALARY_INDEX: "0xf8204556b63137BfeDD3F655F9D10cb2431de334",
    },
    status: "deployed",
  },
  133: {
    chain: hashkeyTestnet,
    rpcUrlEnv: "HASHKEY_TESTNET_RPC_URL",
    core: {
      HSP_ADAPTER: "0xCE3D31f8170E8f253F457C1Dd4C9D27344028cF7",
      PAYROLL_FACTORY: "0xA601F99D4161062E4d424189376E49C5249792A8",
      MOCK_USDT: "0x85466F956A7d29650042846C916da2ae9eB84d5c",
      PAYROLL_ATTESTOR: "0x7d19a8EfC0df51853D44B51C88ea9B783Ac7D255",
      EAS: "0x4200000000000000000000000000000000000021",
      EAS_SCHEMA_UID:
        "0x4d0972424d71fca626f8a29bfa961af74be2be30f248401e80046998fe80ccd4",
    },
    protocol: {
      REPUTATION_REGISTRY: "0x083b4713c7D90506ABD165CeFB59F744522Ac523",
      ADAPTIVE_CADENCE: "0xCa52178fa3bE627fa51378Be5ef11C8015D1ec23",
      MOCK_YIELD_VAULT: "0xABD74CD87F754A25bd4333d497BD7E4F76aB3712",
      YIELD_ESCROW: "0x91821068e7B7F433261E677D7d16e07d644F12BC",
      PAYROLL_ADVANCE: "0x443E38833125591eE7395a54842cfBc916d2B449",
      COMPLIANCE_REGISTRY: "0x59551F3FAe5D86Fd54888DCC15F514183176A702",
      KYC_SBT: "0x1A0b9B180a386323D10BA6CD3501c3B981592EdA",
      KYC_HOOK: "0xffb188d9419c632645f92C74B5e5214E660549D7",
      JURISDICTION_HOOK: "0xFE16F215499eAee41Dff836d42b220188FD72eCa",
      SANCTIONS_HOOK: "0xc4825E8EFc12923a7822D4d519B95DDc44d51aBd",
      SALARY_INDEX: "0x666E5102A67023f780aee7563922600f994b35A4",
    },
    status: "deployed",
  },
  84532: {
    chain: baseSepolia,
    rpcUrlEnv: "BASE_SEPOLIA_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  421614: {
    chain: arbitrumSepolia,
    rpcUrlEnv: "ARBITRUM_SEPOLIA_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  11155420: {
    chain: optimismSepolia,
    rpcUrlEnv: "OPTIMISM_SEPOLIA_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  80002: {
    chain: polygonAmoy,
    rpcUrlEnv: "POLYGON_AMOY_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  // ==================== MAINNETS ====================
  1: {
    chain: mainnet,
    rpcUrlEnv: "ETHEREUM_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  8453: {
    chain: base,
    rpcUrlEnv: "BASE_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  42161: {
    chain: arbitrum,
    rpcUrlEnv: "ARBITRUM_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  10: {
    chain: optimism,
    rpcUrlEnv: "OPTIMISM_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  137: {
    chain: polygon,
    rpcUrlEnv: "POLYGON_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
  177: {
    chain: hashkeyChain,
    rpcUrlEnv: "HASHKEY_RPC_URL",
    core: {},
    protocol: {},
    status: "undeployed",
  },
};

export const DEFAULT_CHAIN_ID = Number(
  process.env.HASHPAY_DEFAULT_CHAIN ?? "11155111",
);

export function allowedChainIds(): number[] {
  const raw = process.env.HASHPAY_ALLOWED_CHAINS;
  if (!raw) return Object.keys(CHAIN_REGISTRY).map(Number);
  return raw.split(",").map((s) => Number(s.trim())).filter(Boolean);
}

export function getChainEntry(chainId: number): ChainEntry {
  const entry = CHAIN_REGISTRY[chainId];
  if (!entry) throw new Error(`Unknown chain id: ${chainId}`);
  if (!allowedChainIds().includes(chainId)) {
    throw new Error(
      `Chain ${chainId} not in HASHPAY_ALLOWED_CHAINS allowlist`,
    );
  }
  return entry;
}

export function requireProtocol(
  chainId: number,
  key: keyof ProtocolAddresses,
): `0x${string}` {
  const { protocol, status } = getChainEntry(chainId);
  const addr = protocol[key];
  if (!addr) {
    throw new Error(
      `${key} not deployed on chain ${chainId} (status: ${status}). ` +
        `Run contracts/scripts/deploy-protocol.ts on this network to enable.`,
    );
  }
  return addr;
}

export function requireCore(
  chainId: number,
  key: keyof CoreAddresses,
): `0x${string}` {
  const { core, status } = getChainEntry(chainId);
  const addr = core[key];
  if (!addr) {
    throw new Error(
      `${key} not deployed on chain ${chainId} (status: ${status})`,
    );
  }
  return addr;
}

export function explorerUrl(chainId: number, txHash: string): string {
  const base = getChainEntry(chainId).chain.blockExplorers?.default.url;
  return base ? `${base}/tx/${txHash}` : txHash;
}

export function addressUrl(chainId: number, address: string): string {
  const base = getChainEntry(chainId).chain.blockExplorers?.default.url;
  return base ? `${base}/address/${address}` : address;
}

export function rpcUrl(chainId: number): string {
  const entry = getChainEntry(chainId);
  if (entry.rpcUrlEnv && process.env[entry.rpcUrlEnv]) {
    return process.env[entry.rpcUrlEnv]!;
  }
  return entry.chain.rpcUrls.default.http[0];
}
