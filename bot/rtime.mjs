import { createPublicClient, createWalletClient, http, nonceManager } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = "https://sepolia.base.org";
const C = process.env.CONTRACT_ADDRESS;
const ID = BigInt(process.env.MID || 1);
const POS = BigInt(process.env.POS || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const acct = privateKeyToAccount(process.env.PLAYER_KEY, { nonceManager });
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wc = createWalletClient({ account: acct, chain: baseSepolia, transport: http(RPC) });
const contract = { address: C, abi: sealedRaidAbi };

async function main() {
  const hash = await wc.writeContract({ ...contract, functionName: "raid", args: [ID, POS] });
  await pc.waitForTransactionReceipt({ hash });
  const handle = await pc.readContract({ ...contract, functionName: "pendingHandle", args: [ID] });
  const t0 = Date.now();
  console.log("raid mined, handle", handle.slice(0, 12), "- polling reveal...");
  const zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  while (Date.now() - t0 < 900000) {
    try {
      const [r] = await zap.attestedReveal([handle], {
        backoffConfig: { maxRetries: 0, baseDelayInMs: 100, backoffFactor: 1, errHandler: () => "continue" },
      });
      console.log(`\nREVEAL READY after ${((Date.now() - t0) / 1000).toFixed(0)}s | value=${r.plaintext.value}`);
      return;
    } catch {
      process.stdout.write(".");
      await sleep(6000);
    }
  }
  console.log("\nTIMEOUT");
}
main().catch((e) => console.log("FATAL:", e.shortMessage || e.message));
