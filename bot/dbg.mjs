import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { Lightning } from "@inco/lightning-js/lite";
import { sealedRaidAbi } from "./abi.mjs";

const RPC = "https://sepolia.base.org";
const C = "0x3ecbf922e6315b8b5b1bb7af9123a8b771b57432";

async function main() {
  const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const handle = await pc.readContract({
    address: C,
    abi: sealedRaidAbi,
    functionName: "pendingHandle",
    args: [BigInt(process.env.MID||4)],
  });
  console.log("pendingHandle[3]:", handle);
  const zap = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: [RPC] });
  try {
    const r = await zap.attestedReveal([handle], {
      backoffConfig: {
        maxRetries: 4,
        baseDelayInMs: 500,
        backoffFactor: 1.3,
        errHandler: (e) => {
          console.log("retry err:", e.message);
          return "continue";
        },
      },
    });
    console.log("RESULT:", JSON.stringify(r, (k, v) => (typeof v === "bigint" ? v.toString() : v)));
  } catch (e) {
    console.log("REVEAL FAILED:", e.message);
    if (e.cause) console.log("cause:", e.cause.message || e.cause);
  }
}

main().catch((e) => console.log("fatal", e.message));
