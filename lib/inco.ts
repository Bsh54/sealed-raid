import { handleTypes } from "@inco/lightning-js";
import { Lightning } from "@inco/lightning-js/lite";

let zapPromise: Promise<Awaited<ReturnType<typeof Lightning.baseSepoliaTestnet>>> | null =
  null;

function getZap() {
  if (!zapPromise) {
    zapPromise = Lightning.baseSepoliaTestnet({
      hostChainRpcUrls: ["https://sepolia.base.org"],
    });
  }
  return zapPromise;
}

export async function encryptCell(
  value: number,
  accountAddress: string,
  dappAddress: string,
): Promise<`0x${string}`> {
  const zap = await getZap();
  const ciphertext = await zap.encrypt(BigInt(value), {
    accountAddress,
    dappAddress,
    handleType: handleTypes.euint256,
  });
  return ciphertext as `0x${string}`;
}
