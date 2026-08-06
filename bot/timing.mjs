import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { handleTypes } from "@inco/lightning-js";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = process.env.RPC_URL || "https://sepolia.base.org";
const C = "0x3ecbf922e6315b8b5b1bb7af9123a8b771b57432";
const GRID = 36;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const host = privateKeyToAccount(process.env.PLAYER_KEY);
const guest = privateKeyToAccount(process.env.BOT_KEY);
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const hw = createWalletClient({ account: host, chain: baseSepolia, transport: http(RPC) });
const gw = createWalletClient({ account: guest, chain: baseSepolia, transport: http(RPC) });
const contract = { address: C, abi: sealedRaidAbi };
let zap;

async function getZap() {
  if (!zap) zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  return zap;
}
async function read(fn, args = []) {
  return pc.readContract({ ...contract, functionName: fn, args });
}
async function send(wc, fn, args, value) {
  const hash = await wc.writeContract({ ...contract, functionName: fn, args, value });
  await pc.waitForTransactionReceipt({ hash });
  return hash;
}
function board() {
  const idx = [...Array(GRID).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const c = Array(GRID).fill(0);
  idx.slice(0, 5).forEach((k) => (c[k] = 1));
  idx.slice(5, 11).forEach((k) => (c[k] = 2));
  return c;
}
async function commit(wc, acct, id) {
  const z = await getZap();
  const cells = [];
  for (const c of board()) {
    cells.push(
      await z.encrypt(BigInt(c), {
        accountAddress: acct.address,
        dappAddress: C,
        handleType: handleTypes.euint256,
      }),
    );
  }
  const fee = await read("placementFee");
  await send(wc, "commitPlacement", [BigInt(id), cells], fee);
}

async function main() {
  console.log("RPC:", RPC);
  await send(hw, "createMatch", [false], parseEther("0.001"));
  const nextId = await read("nextMatchId");
  const id = Number(nextId) - 1;
  console.log("match", id, "created; guest joining...");
  await send(gw, "joinMatch", [BigInt(id)], parseEther("0.001"));
  console.log("committing placements...");
  await commit(hw, host, id);
  await commit(gw, guest, id);
  console.log("raiding phase; host raids cell 0");

  await send(hw, "raid", [BigInt(id), BigInt(0)]);
  const handle = await read("pendingHandle", [BigInt(id)]);
  const t0 = Date.now();
  console.log("raid mined, polling reveal for handle", handle.slice(0, 12));

  const z = await getZap();
  while (true) {
    try {
      await z.attestedReveal([handle], {
        backoffConfig: { maxRetries: 0, baseDelayInMs: 100, backoffFactor: 1, errHandler: () => "continue" },
      });
      console.log(`\nREVEAL READY after ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      break;
    } catch {
      process.stdout.write(".");
      if (Date.now() - t0 > 900000) {
        console.log("\nTIMEOUT >15min");
        break;
      }
      await sleep(8000);
    }
  }
}

main().catch((e) => console.log("FATAL:", e.shortMessage || e.message));
