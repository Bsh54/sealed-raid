import { sealedRaidAbi } from "@/lib/abi/sealedRaid";

export const SEALED_RAID_ADDRESS = (process.env.NEXT_PUBLIC_SEALED_RAID_ADDRESS ??
  "0x4755fe7b50ed7de2e8970bad32e5ae8fb9fdfc37") as `0x${string}`;

export const sealedRaidContract = {
  address: SEALED_RAID_ADDRESS,
  abi: sealedRaidAbi,
} as const;

export const isContractConfigured =
  SEALED_RAID_ADDRESS !== "0x0000000000000000000000000000000000000000";
