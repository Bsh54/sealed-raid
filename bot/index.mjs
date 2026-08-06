import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  pad,
  toHex,
  bytesToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { handleTypes } from "@inco/lightning-js";
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
const SHARDS = 5;
const TRAPS = 6;
const BOT_SEAT = 1;
const OPP_SEAT = 0;

const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const contract = { address: CONTRACT, abi: sealedRaidAbi };

const active = new Set();
let zap = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getZap() {
  if (!zap) zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  return zap;
}

async function read(fn, args = []) {
  return publicClient.readContract({ ...contract, functionName: fn, args });
}

let writeLock = Promise.resolve();

function serialize(task) {
  const run = writeLock.then(task, task);
  writeLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function write(fn, args, value) {
  return serialize(async () => {
    const hash = await walletClient.writeContract({ ...contract, functionName: fn, args, value });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  });
}

function randomBoard() {
  const idx = [...Array(GRID).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const content = Array(GRID).fill(0);
  idx.slice(0, SHARDS).forEach((k) => (content[k] = 1));
  idx.slice(SHARDS, SHARDS + TRAPS).forEach((k) => (content[k] = 2));
  return content;
}

async function reveal(handle) {
  const z = await getZap();
  const [r] = await z.attestedReveal([handle], {
    backoffConfig: {
      maxRetries: 40,
      baseDelayInMs: 3000,
      backoffFactor: 1.05,
      errHandler: () => "continue",
    },
  });
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
    const raided = await read("isRaided", [BigInt(id), OPP_SEAT, BigInt(pos)]);
    if (!raided) free.push(pos);
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

async function commitPlacement(id) {
  const board = randomBoard();
  const z = await getZap();
  const cells = await Promise.all(
    board.map((c) =>
      z.encrypt(BigInt(c), {
        accountAddress: account.address,
        dappAddress: CONTRACT,
        handleType: handleTypes.euint256,
      }),
    ),
  );
  const fee = await read("placementFee");
  await write("commitPlacement", [BigInt(id), cells], fee);
  console.log(`[${id}] bot committed placement`);
}

async function playMatch(id) {
  await commitPlacement(id);
  while (true) {
    const m = await read("getMatch", [BigInt(id)]);
    const phase = m[3];
    const turn = m[4];
    if (phase === 3) {
      console.log(`[${id}] match ended`);
      break;
    }
    if (phase === 2 && turn === BOT_SEAT) {
      const pos = await pickCell(id);
      if (pos === null) {
        await sleep(2000);
        continue;
      }
      try {
        await write("raid", [BigInt(id), BigInt(pos)]);
        const handle = await read("pendingHandle", [BigInt(id)]);
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
  const m = await read("getMatch", [BigInt(id)]);
  const host = m[0];
  const stake = m[2];
  const phase = m[3];
  const isPrivate = m[8];
  if (phase !== 0 || isPrivate) return;
  if (host.toLowerCase() === account.address.toLowerCase()) return;

  active.add(id);
  console.log(`[${id}] bot joining (stake ${stake})`);
  try {
    await write("joinMatch", [BigInt(id)], stake);
    await playMatch(id);
  } catch (e) {
    console.warn(`[${id}] join/play error:`, e.shortMessage || e.message);
  } finally {
    active.delete(id);
  }
}

const firstSeen = new Map();

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
