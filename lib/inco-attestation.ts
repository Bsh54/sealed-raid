import { Lightning } from "@inco/lightning-js/lite";
import { type HexString } from "@inco/lightning-js";
import { type Hex, pad, toHex, bytesToHex } from "viem";

let zapPromise: ReturnType<typeof Lightning.baseSepoliaTestnet> | null = null;

export function getZap() {
  if (!zapPromise) {
    zapPromise = Lightning.baseSepoliaTestnet({
      hostChainRpcUrls: ["https://sepolia.base.org"],
    });
  }
  return zapPromise;
}

export interface AttestationResult {
  handle: HexString;
  value: boolean | bigint;
  signatures: Hex[];
  attestation: { handle: HexString; value: Hex };
}

type RevealRaw = {
  handle: HexString;
  plaintext: { value: boolean | bigint };
  covalidatorSignatures: Uint8Array[];
};

const REVEAL_DEADLINE_MS = 12 * 60 * 1000;
const POLL_INTERVAL_MS = 8000;

export async function revealHandle(handle: HexString): Promise<AttestationResult> {
  const zap = await getZap();
  const deadline = Date.now() + REVEAL_DEADLINE_MS;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const results = await zap.attestedReveal([handle], {
        backoffConfig: {
          maxRetries: 2,
          baseDelayInMs: 1000,
          backoffFactor: 1.2,
          errHandler: () => "continue",
        },
      });
      const r = (results as RevealRaw[])[0];
      const raw = r.plaintext.value;
      const numeric = typeof raw === "boolean" ? (raw ? 1 : 0) : raw;
      return {
        handle: r.handle,
        value: raw,
        signatures: r.covalidatorSignatures.map((sig) => bytesToHex(sig)),
        attestation: {
          handle: r.handle,
          value: pad(toHex(numeric), { size: 32 }),
        },
      };
    } catch (e) {
      lastError = e;
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Reveal timed out");
}
