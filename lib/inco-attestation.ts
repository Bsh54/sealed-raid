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

const REVEAL_BACKOFF = {
  maxRetries: 20,
  baseDelayInMs: 300,
  backoffFactor: 1.3,
  errHandler: (error: Error) => {
    console.warn(`Retrying reveal: ${error.message}`);
    return "continue" as const;
  },
};

export interface AttestationResult {
  handle: HexString;
  value: boolean | bigint;
  signatures: Hex[];
  attestation: { handle: HexString; value: Hex };
}

export async function revealHandle(handle: HexString): Promise<AttestationResult> {
  const zap = await getZap();
  const results = await zap.attestedReveal([handle], { backoffConfig: REVEAL_BACKOFF });

  type RevealRaw = {
    handle: HexString;
    plaintext: { value: boolean | bigint };
    covalidatorSignatures: Uint8Array[];
  };

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
}
