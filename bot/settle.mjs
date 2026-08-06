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
import { sealedRaidAbi } from "./abi.mjs";

const RPC = "https://sepolia.base.org";
const C = "0x3ecbf922e6315b8b5b1bb7af9123a8b771b57432";
const MID = BigInt(process.env.MID || 4);
const KEY = process.env.PLAYER_KEY;

async function main() {
  const account = privateKeyToAccount(KEY.startsWith("0x") ? KEY : `0x${KEY}`);
  const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const wc = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
  const contract = { address: C, abi: sealedRaidAbi };

  const before = await pc.readContract({ ...contract, functionName: "getMatch", args: [MID] });
  console.log("BEFORE  phase", before[3], "turn", before[4], "scores", before[5], before[6]);

  const handle = await pc.readContract({ ...contract, functionName: "pendingHandle", args: [MID] });
  console.log("pendingHandle:", handle);

  const zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  const [r] = await zap.attestedReveal([handle], {
    backoffConfig: { maxRetries: 10, baseDelayInMs: 1000, backoffFactor: 1.2, errHandler: () => "continue" },
  });
  const raw = r.plaintext.value;
  const numeric = typeof raw === "boolean" ? (raw ? 1 : 0) : raw;
  const attestation = { handle: r.handle, value: pad(toHex(numeric), { size: 32 }) };
  const signatures = r.covalidatorSignatures.map((s) => bytesToHex(s));
  console.log("revealed content:", numeric.toString(), "| signatures:", signatures.length);

  const hash = await wc.writeContract({
    ...contract,
    functionName: "settleRaid",
    args: [MID, attestation, signatures],
  });
  console.log("settleRaid tx:", hash);
  await pc.waitForTransactionReceipt({ hash });

  const after = await pc.readContract({ ...contract, functionName: "getMatch", args: [MID] });
  const ph = await pc.readContract({ ...contract, functionName: "pendingHandle", args: [MID] });
  console.log("AFTER   phase", after[3], "turn", after[4], "scores", after[5], after[6]);
  console.log("pendingHandle cleared:", ph === "0x" + "0".repeat(64));
  console.log("SETTLE SUCCESS");
}

main().catch((e) => console.log("FAILED:", e.shortMessage || e.message));
