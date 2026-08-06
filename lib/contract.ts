import { sealedRaidAbi } from "@/lib/abi/sealedRaid";

export const SEALED_RAID_ADDRESS = (process.env.NEXT_PUBLIC_SEALED_RAID_ADDRESS ??
  "0x7d3eb98211f0b7e8511ad161e598ad87ee2a7b04") as `0x${string}`;

export const sealedRaidContract = {
  address: SEALED_RAID_ADDRESS,
  abi: sealedRaidAbi,
} as const;

export const isContractConfigured =
  SEALED_RAID_ADDRESS !== "0x0000000000000000000000000000000000000000";
