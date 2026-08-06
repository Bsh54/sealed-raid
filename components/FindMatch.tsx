"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decodeEventLog, parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSwitchChain,
} from "wagmi";
import { sealedRaidContract } from "@/lib/contract";
import { useBurner } from "@/lib/burner";

const STAKES = [0.001, 0.005, 0.01];
const GAS_BUFFER = parseEther("0.02");

type M = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
  number,
  number,
  number,
  number,
  `0x${string}`,
  boolean,
];

export function FindMatch() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const burner = useBurner();

  const [stake, setStake] = useState(STAKES[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrongNetwork = isConnected && chainId !== baseSepolia.id;
  const stakeWei = parseEther(String(stake));

  const { data: nextId } = useReadContract({
    ...sealedRaidContract,
    functionName: "nextMatchId",
    chainId: baseSepolia.id,
  });
  const { data: fee } = useReadContract({
    ...sealedRaidContract,
    functionName: "joinFee",
    chainId: baseSepolia.id,
  });
  const count = nextId ? Number(nextId) - 1 : 0;

  const { data: all } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      ...sealedRaidContract,
      functionName: "getMatch" as const,
      args: [BigInt(i + 1)] as const,
      chainId: baseSepolia.id,
    })),
    query: { enabled: count > 0 && !busy },
  });

  async function start(isPrivate: boolean) {
    setError(null);
    setBusy(true);
    try {
      const joinFee = (fee as bigint) ?? parseEther("0.001");
      await burner.ensureFunded(stakeWei + joinFee + GAS_BUFFER);

      if (!isPrivate) {
        const candidate = (all ?? [])
          .map((r, i) => ({ id: i + 1, m: r.result as M | undefined }))
          .find(
            (x) =>
              x.m &&
              x.m[3] === 0 &&
              x.m[8] === false &&
              x.m[2] === stakeWei &&
              x.m[0].toLowerCase() !== burner.address?.toLowerCase(),
          );
        if (candidate) {
          await burner.writeGame("joinMatch", [BigInt(candidate.id)], candidate.m![2] + joinFee);
          router.push(`/raid?id=${candidate.id}`);
          return;
        }
      }

      const receipt = await burner.writeGame("createMatch", [isPrivate], stakeWei);
      let id: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: sealedRaidContract.abi,
            data: log.data,
            topics: log.topics,
          });
          if (ev.eventName === "MatchCreated") {
            id = (ev.args as { id: bigint }).id;
            break;
          }
        } catch {
          continue;
        }
      }
      if (id !== null) router.push(`/raid?id=${id.toString()}`);
      else setBusy(false);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message.split("\n")[0] : "Failed");
    }
  }

  if (wrongNetwork) {
    return (
      <div className="panel p-6">
        <button onClick={() => switchChain({ chainId: baseSepolia.id })} className="term-btn w-full">
          Switch to Base Sepolia
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="panel p-6 text-center">
        <p className="label-caps text-fg-dim">Connect wallet to play</p>
      </div>
    );
  }

  if (!burner.ready) {
    return (
      <div className="panel p-6 text-center">
        <div className="label-caps mb-3 text-fg-dim">One-time setup</div>
        <p className="mb-5 text-sm text-fg-dim">
          Sign once to create your in-browser game key. After that you play with no wallet
          popups — only a single top-up covers your stakes.
        </p>
        <button onClick={() => burner.create()} disabled={burner.creating} className="term-btn w-full">
          {burner.creating ? "Signing..." : "Create Game Key"}
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div className="label-caps mb-4 text-fg-dim">New Match</div>
      <div className="label-caps mb-2 text-xs text-fg-dim">Stake (ETH)</div>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {STAKES.map((v) => (
          <button
            key={v}
            onClick={() => setStake(v)}
            disabled={busy}
            className={`data border py-2 text-sm ${
              stake === v ? "border-shard text-shard" : "border-line text-fg-dim hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <button onClick={() => start(false)} disabled={busy} className="term-btn w-full disabled:opacity-50">
        {busy ? "Entering..." : "Find Match"}
      </button>
      <button
        onClick={() => start(true)}
        disabled={busy}
        className="label-caps mt-3 w-full py-2 text-fg-dim hover:text-fg disabled:opacity-50"
      >
        Create Private Match
      </button>
      {error && <p className="label-caps mt-3 break-words text-center text-xs text-ice">{error}</p>}
    </div>
  );
}
