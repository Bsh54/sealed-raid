import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  pad,
  toHex,
  bytesToHex,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { handleTypes } from "@inco/lightning-js";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = "https://sepolia.base.org";
const CONTRACT = process.env.CONTRACT_ADDRESS;
const KEY = process.env.PLAYER_KEY;
const GRID = 36;
const SHARDS = 5;
const TRAPS = 6;
const HOST_SEAT = 0;
const OPP_SEAT = 1;

const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const contract = { address: CONTRACT, abi: sealedRaidAbi };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let zap = null;

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
    if (!(await read("isRaided", [BigInt(id), OPP_SEAT, BigInt(pos)]))) free.push(pos);
  }
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}
async function commitPlacement(id) {
  const board = randomBoard();
  const z = await getZap();
  const cells = [];
  for (const c of board) {
    cells.push(
      await z.encrypt(BigInt(c), {
        accountAddress: account.address,
        dappAddress: CONTRACT,
        handleType: handleTypes.euint256,
      }),
    );
  }
  const fee = await read("placementFee");
  await write("commitPlacement", [BigInt(id), cells], fee);
}

async function main() {
  console.log("player:", account.address);
  const stake = parseEther("0.001");
  const createHash = await walletClient.writeContract({
    ...contract,
    functionName: "createMatch",
    args: [false],
    value: stake,
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  let id = null;
  for (const log of createReceipt.logs) {
    try {
      const ev = decodeEventLog({ abi: sealedRaidAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "MatchCreated") {
        id = Number(ev.args.id);
        break;
      }
    } catch {
      continue;
    }
  }
  console.log("created public match", id, "| waiting for bot to join...");

  while (true) {
    const m = await read("getMatch", [BigInt(id)]);
    if (m[3] >= 1) {
      console.log("opponent joined:", m[1]);
      break;
    }
    await sleep(3000);
  }

  await commitPlacement(id);
  console.log("player committed placement | waiting for raiding phase...");

  while (true) {
    const m = await read("getMatch", [BigInt(id)]);
    if (m[3] === 2) break;
    if (m[3] === 3) {
      console.log("ended early");
      return;
    }
    await sleep(3000);
  }
  console.log("RAIDING PHASE STARTED");

  while (true) {
    const m = await read("getMatch", [BigInt(id)]);
    const phase = m[3];
    const turn = m[4];
    if (phase === 3) {
      console.log(`MATCH ENDED | host ${m[5]} - guest ${m[6]} | winner ${m[7]}`);
      break;
    }
    if (phase === 2 && turn === HOST_SEAT) {
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
        const mm = await read("getMatch", [BigInt(id)]);
        console.log(`player raided ${pos} | scores ${mm[5]}-${mm[6]}`);
      } catch (e) {
        console.warn("raid err:", e.shortMessage || e.message);
        await sleep(2000);
      }
    } else {
      await sleep(3000);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
