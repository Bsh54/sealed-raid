"use client";

import { useState } from "react";

const STAKES = [1, 5, 10];

export function NewMatch() {
  const [stake, setStake] = useState(5);

  return (
    <div className="panel p-5">
      <div className="label-caps mb-4 text-fg-dim">Initiate New Match</div>
      <div className="label-caps mb-2 text-xs text-fg-dim">Stake (USDC)</div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {STAKES.map((v) => (
          <button
            key={v}
            onClick={() => setStake(v)}
            className={`data border py-2 text-sm ${
              stake === v
                ? "border-shard text-shard"
                : "border-line text-fg-dim hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <button className="term-btn w-full">Create Match</button>
    </div>
  );
}
