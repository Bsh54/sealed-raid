import { sealedRaidAbi } from "@/lib/abi/sealedRaid";

export const SEALED_RAID_ADDRESS = (process.env.NEXT_PUBLIC_SEALED_RAID_ADDRESS ??
  "0x852a9463b4074157f80a8100b715bda8a056071b") as `0x${string}`;

export const sealedRaidContract = {
  address: SEALED_RAID_ADDRESS,
  abi: sealedRaidAbi,
} as const;

export const isContractConfigured =
  SEALED_RAID_ADDRESS !== "0x0000000000000000000000000000000000000000";
