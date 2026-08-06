"use client";

import { Suspense } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useAccount, useReadContract } from "wagmi";
import { sealedRaidContract } from "@/lib/contract";

type M = readonly [
  string,
  string,
  bigint,
  number,
  number,
  number,
  number,
  string,
  boolean,
];

function Victory() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const idStr = params.get("id");
  const matchId = idStr && /^\d+$/.test(idStr) ? BigInt(idStr) : null;

  const { address } = useAccount();
  const { data } = useReadContract({
    ...sealedRaidContract,
    functionName: "getMatch",
    args: matchId !== null ? [matchId] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: matchId !== null },
  });

  const m = data as M | undefined;
  const mySeat = m && address
    ? address.toLowerCase() === m[0].toLowerCase()
      ? 0
      : 1
    : 0;
  const myScore = m ? (mySeat === 0 ? m[5] : m[6]) : 0;
  const oppScore = m ? (mySeat === 0 ? m[6] : m[5]) : 0;
  const winner = m?.[7] ?? null;
  const pot = m ? m[2] * BigInt(2) : BigInt(0);
  const didWin = !!winner && !!address && winner.toLowerCase() === address.toLowerCase();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center px-4 py-12">
      <h1 className={`text-center text-3xl font-extrabold tracking-tight ${didWin ? "text-shard" : "text-ice"}`}>
        {didWin ? "DECRYPTION COMPLETE — VICTORY" : "MATCH COMPLETE — DEFEAT"}
      </h1>
      <p className="label-caps mt-3 text-fg-dim">Match #{matchId?.toString() ?? "-"}</p>

      <div className="mt-8 grid w-full max-w-lg gap-6">
        <div className="panel p-6">
          <div className="label-caps mb-4 text-fg-dim">Final Tally</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="label-caps text-fg-dim">You</div>
              <div className="data mt-1 text-4xl font-bold text-shard">{myScore}</div>
              <div className="label-caps mt-1 text-fg-dim">Shards</div>
            </div>
            <div className="data text-2xl text-muted">vs</div>
            <div className="text-right">
              <div className="label-caps text-fg-dim">Opponent</div>
              <div className="data mt-1 text-4xl font-bold text-ice">{oppScore}</div>
              <div className="label-caps mt-1 text-fg-dim">Shards</div>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="label-caps mb-2 text-fg-dim">Pot</div>
          <div className={`data text-3xl font-bold ${didWin ? "text-shard" : "text-fg-dim"}`}>
            {didWin ? "+" : ""}
            {formatEther(pot)} ETH
          </div>
          <div className="label-caps mt-3 text-fg-dim">
            {didWin ? "Routed to your wallet" : "Routed to opponent"}
          </div>
        </div>
      </div>

      <Link href="/" className="term-btn mt-8">
        New Raid
      </Link>
    </div>
  );
}

export default function VictoryPage() {
  return (
    <Suspense>
      <Victory />
    </Suspense>
  );
}
