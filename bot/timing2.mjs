import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  decodeEventLog,
  nonceManager,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = "https://sepolia.base.org";
const C = process.env.CONTRACT_ADDRESS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const host = privateKeyToAccount(process.env.PLAYER_KEY, { nonceManager });
const guest = privateKeyToAccount(process.env.BOT_KEY, { nonceManager });
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const hw = createWalletClient({ account: host, chain: baseSepolia, transport: http(RPC) });
const gw = createWalletClient({ account: guest, chain: baseSepolia, transport: http(RPC) });
const contract = { address: C, abi: sealedRaidAbi };
let zap;

async function read(fn, args = []) {
  return pc.readContract({ ...contract, functionName: fn, args });
}
async function send(wc, fn, args, value) {
  const hash = await wc.writeContract({ ...contract, functionName: fn, args, value });
  return pc.waitForTransactionReceipt({ hash });
}

async function main() {
  console.log("contract:", C);
  const stake = parseEther("0.001");
  const r = await send(hw, "createMatch", [false], stake);
  let id = null;
  for (const log of r.logs) {
    try {
      const ev = decodeEventLog({ abi: sealedRaidAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "MatchCreated") { id = ev.args.id; break; }
    } catch {}
  }
  console.log("created match", id);
  const fee = await read("joinFee");
  console.log("joining (generates on-chain vault)...");
  await send(gw, "joinMatch", [id], stake + fee);
  while (true) {
    const m = await read("getMatch", [id]);
    if (Number(m[3]) === 1) break;
    await sleep(2000);
  }
  console.log("vault generated, raiding phase confirmed");

  await send(hw, "raid", [id, 0n]);
  const handle = await read("pendingHandle", [id]);
  const t0 = Date.now();
  console.log("raid mined, polling reveal for", handle.slice(0, 12));

  zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  while (Date.now() - t0 < 900000) {
    try {
      const [res] = await zap.attestedReveal([handle], {
        backoffConfig: { maxRetries: 0, baseDelayInMs: 100, backoffFactor: 1, errHandler: () => "continue" },
      });
      console.log(`\nREVEAL READY after ${((Date.now() - t0) / 1000).toFixed(0)}s | value=${res.plaintext.value}`);
      return;
    } catch {
      process.stdout.write(".");
      await sleep(8000);
    }
  }
  console.log("\nTIMEOUT >15min");
}

main().catch((e) => console.log("FATAL:", e.shortMessage || e.message));
