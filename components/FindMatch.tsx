"use client";

import { useEffect, useState } from "react";
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
  const [searching, setSearching] = useState(false);
  const [searchId, setSearchId] = useState<bigint | null>(null);
  const [privateId, setPrivateId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrongNetwork = isConnected && chainId !== baseSepolia.id;
  const stakeWei = parseEther(String(stake));

  const { data: nextId } = useReadContract({
    ...sealedRaidContract,
    functionName: "nextMatchId",
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
    query: { enabled: count > 0 && !searching },
  });

  const { data: watched } = useReadContract({
    ...sealedRaidContract,
    functionName: "getMatch",
    args: searchId ? [searchId] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: searchId !== null, refetchInterval: 3000 },
  });

  useEffect(() => {
    if (searchId === null || !watched) return;
    const m = watched as M;
    if (m[3] === 1) router.push(`/placement?id=${searchId.toString()}`);
  }, [watched, searchId, router]);

  async function start(isPrivate: boolean) {
    setError(null);
    setSearching(true);
    try {
      await burner.ensureFunded(stakeWei + GAS_BUFFER);
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
          await burner.writeGame("joinMatch", [BigInt(candidate.id)], candidate.m![2]);
          router.push(`/placement?id=${candidate.id}`);
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
      if (id !== null) {
        setSearchId(id);
        if (isPrivate) setPrivateId(id);
      }
    } catch (e) {
      setSearching(false);
      setError(e instanceof Error ? e.message.split("\n")[0] : "Failed");
    }
  }

  function cancel() {
    setSearching(false);
    setSearchId(null);
    setPrivateId(null);
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

  if (searching) {
    return (
      <div className="panel p-8 text-center">
        <div className="mx-auto mb-5 h-8 w-8 animate-spin border-2 border-shard border-t-transparent" />
        <div className="label-caps text-shard">Searching for opponent...</div>
        {privateId !== null && (
          <div className="mt-5">
            <div className="label-caps text-fg-dim">Share this match id</div>
            <div className="data mt-1 text-2xl text-fg">#{privateId.toString()}</div>
          </div>
        )}
        <button onClick={cancel} className="label-caps mt-6 text-fg-dim hover:text-fg">
          Cancel
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
            className={`data border py-2 text-sm ${
              stake === v ? "border-shard text-shard" : "border-line text-fg-dim hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <button onClick={() => start(false)} className="term-btn w-full">
        Find Match
      </button>
      <button
        onClick={() => start(true)}
        className="label-caps mt-3 w-full py-2 text-fg-dim hover:text-fg"
      >
        Create Private Match
      </button>
      {error && <p className="label-caps mt-3 break-words text-center text-xs text-ice">{error}</p>}
    </div>
  );
}
