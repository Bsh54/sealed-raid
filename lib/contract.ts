import { sealedRaidAbi } from "@/lib/abi/sealedRaid";

export const SEALED_RAID_ADDRESS = (process.env.NEXT_PUBLIC_SEALED_RAID_ADDRESS ??
  "0x3ecbf922e6315b8b5b1bb7af9123a8b771b57432") as `0x${string}`;

export const sealedRaidContract = {
  address: SEALED_RAID_ADDRESS,
  abi: sealedRaidAbi,
} as const;

export const isContractConfigured =
  SEALED_RAID_ADDRESS !== "0x0000000000000000000000000000000000000000";
