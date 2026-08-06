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
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sealedRaidContract } from "@/lib/contract";

const STAKES = [0.001, 0.005, 0.01];

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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [stake, setStake] = useState(STAKES[1]);
  const [searching, setSearching] = useState(false);
  const [searchId, setSearchId] = useState<bigint | null>(null);
  const [privateId, setPrivateId] = useState<bigint | null>(null);

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

  const { writeContract, data: hash } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });

  const { data: watched } = useReadContract({
    ...sealedRaidContract,
    functionName: "getMatch",
    args: searchId ? [searchId] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: searchId !== null, refetchInterval: 3000 },
  });

  useEffect(() => {
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({
          abi: sealedRaidContract.abi,
          data: log.data,
          topics: log.topics,
        });
        if (ev.eventName === "MatchJoined") {
          const args = ev.args as { id: bigint };
          router.push(`/placement?id=${args.id.toString()}`);
          return;
        }
        if (ev.eventName === "MatchCreated") {
          const args = ev.args as { id: bigint; isPrivate: boolean };
          setSearchId(args.id);
          if (args.isPrivate) setPrivateId(args.id);
          return;
        }
      } catch {
        continue;
      }
    }
  }, [receipt, router]);

  useEffect(() => {
    if (searchId === null || !watched) return;
    const m = watched as M;
    if (m[3] === 1) {
      router.push(`/placement?id=${searchId.toString()}`);
    }
  }, [watched, searchId, router]);

  function findMatch() {
    const candidate = (all ?? [])
      .map((r, i) => ({ id: i + 1, m: r.result as M | undefined }))
      .find(
        (x) =>
          x.m &&
          x.m[3] === 0 &&
          x.m[8] === false &&
          x.m[2] === stakeWei &&
          address &&
          x.m[0].toLowerCase() !== address.toLowerCase(),
      );
    setSearching(true);
    if (candidate) {
      writeContract({
        ...sealedRaidContract,
        functionName: "joinMatch",
        args: [BigInt(candidate.id)],
        value: candidate.m![2],
        chainId: baseSepolia.id,
      });
    } else {
      writeContract({
        ...sealedRaidContract,
        functionName: "createMatch",
        args: [false],
        value: stakeWei,
        chainId: baseSepolia.id,
      });
    }
  }

  function createPrivate() {
    setSearching(true);
    writeContract({
      ...sealedRaidContract,
      functionName: "createMatch",
      args: [true],
      value: stakeWei,
      chainId: baseSepolia.id,
    });
  }

  function cancel() {
    setSearching(false);
    setSearchId(null);
    setPrivateId(null);
  }

  if (wrongNetwork) {
    return (
      <div className="panel p-6">
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          className="term-btn w-full"
        >
          Switch to Base Sepolia
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
        <button
          onClick={cancel}
          className="label-caps mt-6 text-fg-dim hover:text-fg"
        >
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
      <button
        onClick={findMatch}
        disabled={!isConnected}
        className="term-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
      >
        Find Match
      </button>
      <button
        onClick={createPrivate}
        disabled={!isConnected}
        className="label-caps mt-3 w-full py-2 text-fg-dim hover:text-fg disabled:opacity-40"
      >
        Create Private Match
      </button>
      {!isConnected && (
        <p className="label-caps mt-3 text-center text-xs text-fg-dim">Connect wallet to play</p>
      )}
    </div>
  );
}
