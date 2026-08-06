import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  pad,
  toHex,
  bytesToHex,
  decodeEventLog,
  nonceManager,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = "https://sepolia.base.org";
const C = process.env.CONTRACT_ADDRESS;
const GRID = 36;
const HOST_SEAT = 0;
const ZERO = "0x" + "0".repeat(64);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const account = privateKeyToAccount(process.env.PLAYER_KEY, { nonceManager });
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const contract = { address: C, abi: sealedRaidAbi };
let zap;

async function read(fn, args = []) {
  return pc.readContract({ ...contract, functionName: fn, args });
}
async function send(fn, args, value) {
  const hash = await wc.writeContract({ ...contract, functionName: fn, args, value });
  return pc.waitForTransactionReceipt({ hash });
}
async function reveal(handle) {
  if (!zap) zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  const deadline = Date.now() + 12 * 60 * 1000;
  let r = null;
  while (Date.now() < deadline) {
    try {
      [r] = await zap.attestedReveal([handle], {
        backoffConfig: { maxRetries: 2, baseDelayInMs: 1000, backoffFactor: 1.2, errHandler: () => "continue" },
      });
      break;
    } catch {
      await sleep(8000);
    }
  }
  if (!r) throw new Error("reveal timed out");
  const raw = r.plaintext.value;
  const numeric = typeof raw === "boolean" ? (raw ? 1 : 0) : raw;
  return {
    attestation: { handle: r.handle, value: pad(toHex(numeric), { size: 32 }) },
    signatures: r.covalidatorSignatures.map((s) => bytesToHex(s)),
  };
}
async function pickCell(id) {
  const free = [];
  for (let pos = 0; pos < GRID; pos++) {
    if (!(await read("isRaided", [id, BigInt(pos)]))) free.push(pos);
  }
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

async function main() {
  console.log("player:", account.address);
  const r = await send("createMatch", [false], parseEther("0.001"));
  let id = null;
  for (const log of r.logs) {
    try {
      const ev = decodeEventLog({ abi: sealedRaidAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "MatchCreated") { id = ev.args.id; break; }
    } catch {}
  }
  console.log("created match", id, "| waiting for bot to join & generate vault...");
  while (true) {
    const m = await read("getMatch", [id]);
    if (Number(m[3]) === 1) { console.log("vault ready, raiding phase"); break; }
    if (Number(m[3]) === 2) { console.log("ended early"); return; }
    await sleep(3000);
  }

  while (true) {
    const m = await read("getMatch", [id]);
    const phase = Number(m[3]);
    const turn = Number(m[4]);
    if (phase === 2) {
      console.log(`MATCH ENDED | host ${m[5]} - guest ${m[6]} | winner ${m[7]}`);
      break;
    }
    if (phase === 1 && turn === HOST_SEAT) {
      const pos = await pickCell(id);
      if (pos === null) { await sleep(2000); continue; }
      try {
        const t0 = Date.now();
        await send("raid", [id, BigInt(pos)]);
        const handle = await read("pendingHandle", [id]);
        if (!handle || handle.toLowerCase() === ZERO) { await sleep(2000); continue; }
        const { attestation, signatures } = await reveal(handle);
        await send("settleRaid", [id, attestation, signatures]);
        const mm = await read("getMatch", [id]);
        console.log(`raided ${pos} in ${((Date.now() - t0) / 1000).toFixed(0)}s | scores ${mm[5]}-${mm[6]}`);
      } catch (e) {
        console.warn("raid err:", e.shortMessage || e.message);
        await sleep(2000);
      }
    } else {
      await sleep(3000);
    }
  }
}

main().catch((e) => console.log("FATAL:", e.shortMessage || e.message));
