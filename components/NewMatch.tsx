"use client";

import { useState } from "react";

const STAKES = [1, 5, 10];

export function NewMatch() {
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState(5);

  if (!open) {
    return (
      <div className="flex justify-end">
        <button className="term-btn" onClick={() => setOpen(true)}>
          + New Match
        </button>
      </div>
    );
  }

  return (
    <div className="panel flex flex-wrap items-center gap-4 p-4">
      <span className="label-caps text-fg-dim">Stake (USDC)</span>
      <div className="flex gap-2">
        {STAKES.map((v) => (
          <button
            key={v}
            onClick={() => setStake(v)}
            className={`data border px-4 py-2 text-sm ${
              stake === v
                ? "border-shard text-shard"
                : "border-line text-fg-dim hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <button
          className="label-caps px-3 py-2 text-fg-dim hover:text-fg"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button className="term-btn">Create</button>
      </div>
    </div>
  );
}
