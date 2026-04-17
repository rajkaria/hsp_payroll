// Signer abstraction — private key, Ledger hardware wallet, or WalletConnect v2.
//
// The signer returns a viem-compatible WalletClient plus the account address.
// Ledger and WalletConnect are lazy-loaded (optional deps) so users who only
// need private-key signing don't pay the install cost.

import { createWalletClient, http, type Chain, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { rpcUrl } from "../chains.js";

export type SignerKind = "privateKey" | "ledger" | "walletconnect";

export type Signer = {
  kind: SignerKind;
  account: `0x${string}`;
  walletClientFor: (chain: Chain) => WalletClient;
};

export function getSignerKind(): SignerKind {
  const k = (process.env.HASHPAY_SIGNER ?? "privateKey").toLowerCase();
  if (k === "privatekey" || k === "private_key" || k === "privkey") return "privateKey";
  if (k === "ledger") return "ledger";
  if (k === "walletconnect" || k === "wc") return "walletconnect";
  throw new Error(
    `Unknown HASHPAY_SIGNER=${k}. Use "privateKey", "ledger", or "walletconnect".`,
  );
}

let cachedSigner: Signer | null = null;

export async function getSigner(): Promise<Signer> {
  if (cachedSigner) return cachedSigner;
  const kind = getSignerKind();
  switch (kind) {
    case "privateKey":
      cachedSigner = buildPrivateKeySigner();
      break;
    case "ledger":
      cachedSigner = await buildLedgerSigner();
      break;
    case "walletconnect":
      cachedSigner = await buildWalletConnectSigner();
      break;
  }
  return cachedSigner;
}

function buildPrivateKeySigner(): Signer {
  const pk = process.env.HASHPAY_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "HASHPAY_PRIVATE_KEY is required for HASHPAY_SIGNER=privateKey",
    );
  }
  const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
  const account = privateKeyToAccount(normalized as `0x${string}`);
  return {
    kind: "privateKey",
    account: account.address,
    walletClientFor: (chain) =>
      createWalletClient({
        account,
        chain,
        transport: http(rpcUrl(chain.id)),
      }),
  };
}

async function buildLedgerSigner(): Promise<Signer> {
  // Lazy-load optional deps. Dynamic imports via variable path so TS module
  // resolver doesn't require the packages at build time.
  const ethPath = "@ledgerhq/hw-app-eth";
  const hidPath = "@ledgerhq/hw-transport-node-hid";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let AppEth: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let TransportNodeHid: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethMod: any = await import(/* @vite-ignore */ ethPath);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hidMod: any = await import(/* @vite-ignore */ hidPath);
    AppEth = ethMod.default ?? ethMod;
    TransportNodeHid = hidMod.default ?? hidMod;
  } catch {
    throw new Error(
      "Ledger support requires optional deps. Install with:\n" +
        "  npm install @ledgerhq/hw-app-eth @ledgerhq/hw-transport-node-hid",
    );
  }

  const path = process.env.HASHPAY_LEDGER_PATH ?? "44'/60'/0'/0/0";
  const transport = await TransportNodeHid.create();
  const eth = new AppEth(transport);
  const { address } = await eth.getAddress(path);
  const accountAddr = address as `0x${string}`;

  // Build a viem-compatible custom account that delegates signing to the
  // Ledger device over its transport.
  const { toAccount } = await import("viem/accounts");
  const { serializeTransaction, keccak256, hashMessage, hashTypedData } =
    await import("viem");

  const account = toAccount({
    address: accountAddr,
    async signMessage({ message }) {
      const hash = hashMessage(message, "hex");
      const sig = await eth.signPersonalMessage(path, hash.slice(2));
      return `0x${sig.r}${sig.s}${sig.v.toString(16).padStart(2, "0")}` as `0x${string}`;
    },
    async signTypedData(typedData) {
      const hash = hashTypedData(typedData as never);
      const sig = await eth.signEIP712HashedMessage(
        path,
        hash.slice(2),
        hash.slice(2),
      );
      return `0x${sig.r}${sig.s}${sig.v.toString(16).padStart(2, "0")}` as `0x${string}`;
    },
    async signTransaction(tx) {
      const serialized = serializeTransaction(tx as never);
      const unsigned = serialized.slice(2);
      const sig = await eth.signTransaction(path, unsigned);
      return serializeTransaction(tx as never, {
        r: `0x${sig.r}`,
        s: `0x${sig.s}`,
        v: BigInt(`0x${sig.v}`),
      } as never);
    },
  });

  return {
    kind: "ledger",
    account: accountAddr,
    walletClientFor: (chain) =>
      createWalletClient({
        account,
        chain,
        transport: http(rpcUrl(chain.id)),
      }),
  };
}

async function buildWalletConnectSigner(): Promise<Signer> {
  // WalletConnect v2 CLI pairing. Emits the wc:// URI to stderr; user scans
  // it with their mobile wallet. Session persists for the MCP process lifetime.
  // The optional dep is loaded via dynamic import with a string variable so
  // TypeScript's module resolver doesn't require the package at build time.
  const wcPath = "@walletconnect/sign-client";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let SignClient: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ wcPath);
    SignClient = mod.default ?? mod;
  } catch {
    throw new Error(
      "WalletConnect support requires optional dep. Install with:\n" +
        "  npm install @walletconnect/sign-client",
    );
  }

  const projectId = process.env.HASHPAY_WC_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "HASHPAY_WC_PROJECT_ID is required for HASHPAY_SIGNER=walletconnect. " +
        "Get one free at https://cloud.reown.com",
    );
  }

  const client = await SignClient.init({
    projectId,
    metadata: {
      name: "HashPay MCP",
      description: "HashPay Income Protocol MCP server",
      url: "https://hashpay.xyz",
      icons: [],
    },
  });

  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      eip155: {
        methods: [
          "eth_sendTransaction",
          "personal_sign",
          "eth_signTypedData_v4",
        ],
        chains: ["eip155:11155111", "eip155:133"],
        events: ["accountsChanged", "chainChanged"],
      },
    },
  });

  if (uri) {
    process.stderr.write(
      `\n[HashPay MCP] Scan this with your WalletConnect-compatible wallet:\n\n${uri}\n\n`,
    );
  }

  const session = await approval();
  const accountStr = session.namespaces.eip155.accounts[0];
  const accountAddr = accountStr.split(":")[2] as `0x${string}`;

  const { toAccount } = await import("viem/accounts");

  const account = toAccount({
    address: accountAddr,
    async signMessage({ message }) {
      const msgStr =
        typeof message === "string" ? message : JSON.stringify(message);
      const result = await client.request<string>({
        topic: session.topic,
        chainId: "eip155:11155111",
        request: {
          method: "personal_sign",
          params: [msgStr, accountAddr],
        },
      });
      return result as `0x${string}`;
    },
    async signTypedData(typedData) {
      const result = await client.request<string>({
        topic: session.topic,
        chainId: "eip155:11155111",
        request: {
          method: "eth_signTypedData_v4",
          params: [accountAddr, JSON.stringify(typedData)],
        },
      });
      return result as `0x${string}`;
    },
    async signTransaction() {
      throw new Error(
        "WalletConnect signer uses eth_sendTransaction (handled in walletClient), " +
          "not signTransaction. This is a viem internal path and shouldn't be called.",
      );
    },
  });

  return {
    kind: "walletconnect",
    account: accountAddr,
    walletClientFor: (chain) =>
      createWalletClient({
        account,
        chain,
        transport: http(rpcUrl(chain.id)),
      }),
  };
}
