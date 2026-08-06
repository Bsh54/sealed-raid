import { sealedRaidAbi } from "@/lib/abi/sealedRaid";

export const SEALED_RAID_ADDRESS = (process.env.NEXT_PUBLIC_SEALED_RAID_ADDRESS ??
  "0x962bc21b08b31bf23fee5613a0a92ff75c6a2352") as `0x${string}`;

export const sealedRaidContract = {
  address: SEALED_RAID_ADDRESS,
  abi: sealedRaidAbi,
} as const;

export const isContractConfigured =
  SEALED_RAID_ADDRESS !== "0x0000000000000000000000000000000000000000";
