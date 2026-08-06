"use client";

import { useMemo, useState } from "react";

const GRID = 36;
const COLS = 6;
const TOTAL_SHARDS = 5;
const TOTAL_TRAPS = 6;

type Content = "void" | "shard" | "ice";

function buildEnemyBoard(): Content[] {
  const cells: Content[] = Array(GRID).fill("void");
  const indices = [...Array(GRID).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  indices.slice(0, TOTAL_SHARDS).forEach((k) => (cells[k] = "shard"));
  indices.slice(TOTAL_SHARDS, TOTAL_SHARDS + TOTAL_TRAPS).forEach((k) => (cells[k] = "ice"));
  return cells;
}

function ShardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

function IceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20M4 5l16 14M20 5 4 19M2 12h20" />
    </svg>
  );
}

function ScoreCard({
  name,
  score,
  active,
  accent,
}: {
  name: string;
  score: number;
  active: boolean;
  accent: "shard" | "ice";
}) {
  const color = accent === "shard" ? "text-shard" : "text-ice";
  return (
    <div className={`panel flex-1 p-4 ${active ? "border-fg/30" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="label-caps text-fg-dim">{name}</span>
        {active && <span className="label-caps text-fg-dim">Turn</span>}
      </div>
      <div className={`data mt-2 text-3xl font-bold ${color}`}>{score}</div>
    </div>
  );
}

export default function RaidPage() {
  const solution = useMemo(buildEnemyBoard, []);
  const [revealed, setRevealed] = useState<boolean[]>(Array(GRID).fill(false));
  const [myScore, setMyScore] = useState(0);
  const [oppScore] = useState(0);

  const foundShards = solution.filter((c, i) => c === "shard" && revealed[i]).length;
  const done = foundShards >= TOTAL_SHARDS;

  function raid(i: number) {
    if (revealed[i] || done) return;
    setRevealed((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
    if (solution[i] === "shard") setMyScore((s) => s + 1);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="label-caps text-fg-dim">Match ID</div>
          <div className="data mt-1 text-sm text-fg">0xA9...2F</div>
        </div>
        <div className="text-right">
          <div className="label-caps text-fg-dim">Vault Pot</div>
          <div className="data mt-1 text-sm text-shard">20 USDC</div>
        </div>
      </header>

      <div className="mb-6 flex gap-3">
        <ScoreCard name="You" score={myScore} active={!done} accent="shard" />
        <ScoreCard name="Vyper" score={oppScore} active={false} accent="ice" />
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold">Enemy Vault</span>
          <span className="label-caps flex items-center gap-2 text-shard">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Encrypted Onchain
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: GRID }).map((_, i) => {
            const isRevealed = revealed[i];
            const content = solution[i];
            return (
              <button
                key={i}
                onClick={() => raid(i)}
                disabled={isRevealed || done}
                className={`flex aspect-square items-center justify-center border transition-all ${
                  !isRevealed
                    ? "border-line bg-surface-2/40 text-muted hover:border-shard/60 hover:text-shard"
                    : content === "shard"
                      ? "border-shard bg-shard/10 text-shard glow-shard"
                      : content === "ice"
                        ? "border-ice bg-ice/10 text-ice glow-ice"
                        : "border-line bg-void text-muted"
                }`}
              >
                {!isRevealed && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {isRevealed && content === "shard" && <ShardIcon />}
                {isRevealed && content === "ice" && <IceIcon />}
                {isRevealed && content === "void" && <span className="data text-fg-dim">·</span>}
              </button>
            );
          })}
        </div>
      </div>

      <p className="label-caps mt-4 text-center text-fg-dim">
        {done ? "All shards recovered // match complete" : "Select a sealed cell to raid"}
      </p>
    </div>
  );
}
