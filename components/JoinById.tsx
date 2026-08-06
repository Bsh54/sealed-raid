"use client";

import { useState } from "react";

export function JoinById() {
  const [value, setValue] = useState("");

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      <span className="label-caps text-fg-dim">Join by ID</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0x..."
        className="data flex-1 border border-line bg-void px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-shard"
      />
      <button className="term-btn" disabled={!value}>
        Join
      </button>
    </div>
  );
}
