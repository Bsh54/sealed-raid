"use client";

import { Fragment, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useAccount, useReadContract } from "wagmi";
import { sealedRaidContract, SEALED_RAID_ADDRESS } from "@/lib/contract";
import { encryptCell } from "@/lib/inco";
import { useBurner } from "@/lib/burner";

const GRID = 36;
const COLS = 6;
const TOTAL_SHARDS = 5;
const TOTAL_TRAPS = 6;
const ROW_LABELS = ["A", "B", "C", "D", "E", "F"];

type Kind = "shard" | "ice";
type Cell = Kind | null;

function ShardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

function IceIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20M4 5l16 14M20 5 4 19M2 12h20" />
    </svg>
  );
}

function Placement() {
  const params = useSearchParams();
  const router = useRouter();
  const matchId = params.get("id");

  const { address, isConnected } = useAccount();
  const burner = useBurner();
  const [board, setBoard] = useState<Cell[]>(Array(GRID).fill(null));
  const [tool, setTool] = useState<Kind>("shard");
  const [status, setStatus] = useState<"idle" | "encrypting" | "committing">("idle");
  const [error, setError] = useState<string | null>(null);

  const { data: fee } = useReadContract({
    ...sealedRaidContract,
    functionName: "placementFee",
    chainId: baseSepolia.id,
  });

  const placedShards = board.filter((c) => c === "shard").length;
  const placedTraps = board.filter((c) => c === "ice").length;
  const ready = placedShards === TOTAL_SHARDS && placedTraps === TOTAL_TRAPS;
  const busy = status !== "idle";

  function toggle(i: number) {
    if (busy) return;
    setBoard((prev) => {
      const next = [...prev];
      if (next[i] === tool) {
        next[i] = null;
        return next;
      }
      if (next[i] !== null) return prev;
      if (tool === "shard" && placedShards >= TOTAL_SHARDS) return prev;
      if (tool === "ice" && placedTraps >= TOTAL_TRAPS) return prev;
      next[i] = tool;
      return next;
    });
  }

  async function commit() {
    if (!address || !matchId || fee === undefined || !burner.ready) return;
    setError(null);
    setStatus("encrypting");
    try {
      const cells = await Promise.all(
        Array.from({ length: GRID }, (_, i) => {
          const content = board[i] === "shard" ? 1 : board[i] === "ice" ? 2 : 0;
          return encryptCell(content, address, SEALED_RAID_ADDRESS);
        }),
      );
      setStatus("committing");
      await burner.ensureFunded((fee as bigint) + parseEther("0.01"));
      const receipt = await burner.writeGame(
        "commitPlacement",
        [BigInt(matchId), cells],
        fee as bigint,
      );
      if (receipt.status === "success") {
        router.push(`/raid?id=${matchId}`);
      } else {
        setStatus("idle");
        setError("Commit transaction reverted");
      }
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message.split("\n")[0] : "Encryption failed");
    }
  }

  const label = !isConnected
    ? "Connect wallet"
    : !burner.ready
      ? "Create game key first"
      : status === "encrypting"
        ? "Encrypting placement..."
        : status === "committing"
          ? "Committing on-chain..."
          : "Encrypt & Commit";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center px-4 py-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-shard">
          PHASE 1 // DEPLOYMENT
        </h1>
      </header>

      <div className="grid items-center gap-8 lg:grid-cols-[240px_1fr]">
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <button
            onClick={() => setTool("shard")}
            disabled={busy}
            className={`panel flex flex-col items-center gap-2 p-6 transition-colors ${
              tool === "shard" ? "border-shard text-shard glow-shard" : "text-fg-dim"
            }`}
          >
            <ShardIcon />
            <span className="label-caps">Shard</span>
            <span className="label-caps text-fg-dim">Remaining</span>
            <span className="data text-2xl text-fg">{TOTAL_SHARDS - placedShards}</span>
          </button>

          <button
            onClick={() => setTool("ice")}
            disabled={busy}
            className={`panel flex flex-col items-center gap-2 p-6 transition-colors ${
              tool === "ice" ? "border-ice text-ice glow-ice" : "text-fg-dim"
            }`}
          >
            <IceIcon />
            <span className="label-caps">Ice Trap</span>
            <span className="label-caps text-fg-dim">Remaining</span>
            <span className="data text-2xl text-fg">{TOTAL_TRAPS - placedTraps}</span>
          </button>

          <button
            onClick={commit}
            disabled={!ready || !isConnected || busy || !matchId}
            className="term-btn mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {label}
          </button>
          {error && <p className="label-caps text-xs break-words text-ice">{error}</p>}
          {!matchId && <p className="label-caps text-xs text-ice">No match id in URL</p>}
        </div>

        <div
          className="panel order-1 w-full p-3 sm:p-4 lg:order-2"
          style={{ maxWidth: "min(90vw, 56vh)" }}
        >
          <div className="mb-1.5 grid grid-cols-[18px_repeat(6,1fr)] gap-1.5">
            <span />
            {Array.from({ length: COLS }).map((_, c) => (
              <span key={c} className="label-caps text-center text-fg-dim">
                {String(c).padStart(2, "0")}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[18px_repeat(6,1fr)] gap-1.5">
            {Array.from({ length: GRID }).map((_, i) => {
              const isRowStart = i % COLS === 0;
              return (
                <Fragment key={i}>
                  {isRowStart && (
                    <span className="label-caps flex items-center justify-center text-fg-dim">
                      {ROW_LABELS[i / COLS]}
                    </span>
                  )}
                  <button
                    onClick={() => toggle(i)}
                    className={`flex aspect-square items-center justify-center border transition-colors ${
                      board[i] === "shard"
                        ? "border-shard bg-shard/10 text-shard glow-shard"
                        : board[i] === "ice"
                          ? "border-ice bg-ice/10 text-ice glow-ice"
                          : "border-line bg-surface-2/40 text-muted hover:border-shard/50"
                    }`}
                  >
                    {board[i] === "shard" && <ShardIcon />}
                    {board[i] === "ice" && <IceIcon />}
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlacementPage() {
  return (
    <Suspense>
      <Placement />
    </Suspense>
  );
}
