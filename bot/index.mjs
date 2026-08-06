import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  pad,
  toHex,
  bytesToHex,
  parseEther,
  nonceManager,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = process.env.RPC_URL || "https://sepolia.base.org";
const CONTRACT = process.env.CONTRACT_ADDRESS;
const KEY = process.env.BOT_PRIVATE_KEY;
const JOIN_DELAY_MS = Number(process.env.JOIN_DELAY_MS || 10000);

if (!CONTRACT || !KEY) {
  console.error("Missing CONTRACT_ADDRESS or BOT_PRIVATE_KEY in .env");
  process.exit(1);
}

const GRID = 36;
const BOT_SEAT = 1;
const ZERO_HANDLE = "0x" + "0".repeat(64);

const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`, { nonceManager });
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const contract = { address: CONTRACT, abi: sealedRaidAbi };

const active = new Set();
const firstSeen = new Map();
let zap = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getZap() {
  if (!zap) zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  return zap;
}

async function read(fn, args = []) {
  return publicClient.readContract({ ...contract, functionName: fn, args });
}

async function write(fn, args, value) {
  const hash = await walletClient.writeContract({ ...contract, functionName: fn, args, value });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function reveal(handle) {
  const z = await getZap();
  const deadline = Date.now() + 12 * 60 * 1000;
  let r = null;
  while (Date.now() < deadline) {
    try {
      [r] = await z.attestedReveal([handle], {
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
    if (!(await read("isRaided", [BigInt(id), BigInt(pos)]))) free.push(pos);
  }
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

async function playMatch(id) {
  while (true) {
    const m = await read("getMatch", [BigInt(id)]);
    const phase = m[3];
    const turn = m[4];
    if (phase === 2) {
      console.log(`[${id}] match ended`);
      break;
    }
    if (phase === 1 && turn === BOT_SEAT) {
      const pos = await pickCell(id);
      if (pos === null) {
        await sleep(2000);
        continue;
      }
      try {
        await write("raid", [BigInt(id), BigInt(pos)]);
        const handle = await read("pendingHandle", [BigInt(id)]);
        if (!handle || handle.toLowerCase() === ZERO_HANDLE) {
          await sleep(2000);
          continue;
        }
        const { attestation, signatures } = await reveal(handle);
        await write("settleRaid", [BigInt(id), attestation, signatures]);
        console.log(`[${id}] bot raided cell ${pos}`);
      } catch (e) {
        console.warn(`[${id}] raid error:`, e.shortMessage || e.message);
        await sleep(2000);
      }
    } else {
      await sleep(3000);
    }
  }
}

async function maybeJoin(id) {
  if (active.has(id)) return;
  active.add(id);
  try {
    const m = await read("getMatch", [BigInt(id)]);
    const host = m[0];
    const stake = m[2];
    const phase = m[3];
    const isPrivate = m[8];
    if (phase !== 0 || isPrivate || host.toLowerCase() === account.address.toLowerCase()) {
      active.delete(id);
      return;
    }
    console.log(`[${id}] bot joining (stake ${stake})`);
    await write("joinMatch", [BigInt(id)], stake + parseEther("0.008"));
    await playMatch(id);
  } catch (e) {
    console.warn(`[${id}] join/play error:`, e.shortMessage || e.message);
  } finally {
    active.delete(id);
  }
}

async function scan() {
  const nextId = await read("nextMatchId");
  const count = Number(nextId) - 1;
  for (let id = 1; id <= count; id++) {
    if (active.has(id)) continue;
    const m = await read("getMatch", [BigInt(id)]);
    const host = m[0];
    const phase = m[3];
    const isPrivate = m[8];
    if (phase !== 0 || isPrivate) {
      firstSeen.delete(id);
      continue;
    }
    if (host.toLowerCase() === account.address.toLowerCase()) continue;
    if (!firstSeen.has(id)) {
      firstSeen.set(id, Date.now());
      console.log(`public match ${id} seen, joining in ${JOIN_DELAY_MS}ms if still open`);
      continue;
    }
    if (Date.now() - firstSeen.get(id) >= JOIN_DELAY_MS) {
      maybeJoin(id);
    }
  }
}

async function main() {
  console.log("Sealed Raid bot online");
  console.log("bot address:", account.address);
  console.log("contract:", CONTRACT);
  const bal = await publicClient.getBalance({ address: account.address });
  console.log("balance:", bal.toString(), "wei");

  setInterval(() => {
    scan().catch((e) => console.warn("scan error:", e.shortMessage || e.message));
  }, 4000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
