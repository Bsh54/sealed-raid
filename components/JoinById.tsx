"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { useReadContract } from "wagmi";
import { sealedRaidContract } from "@/lib/contract";
import { useBurner } from "@/lib/burner";

const GAS_BUFFER = parseEther("0.02");
const JOIN_BUFFER = parseEther("0.008");

export function JoinById() {
  const router = useRouter();
  const burner = useBurner();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const id = /^\d+$/.test(value) ? BigInt(value) : null;

  const { data: match } = useReadContract({
    ...sealedRaidContract,
    functionName: "getMatch",
    args: id !== null ? [id] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: id !== null },
  });

  async function join() {
    if (id === null || !match || !burner.ready) return;
    const stake = (match as readonly unknown[])[2] as bigint;
    setBusy(true);
    try {
      await burner.ensureFunded(stake + JOIN_BUFFER + GAS_BUFFER);
      await burner.writeGame("joinMatch", [id], stake + JOIN_BUFFER);
      router.push(`/raid?id=${id.toString()}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="panel flex flex-wrap items-center gap-3 p-4">
      <span className="label-caps text-fg-dim">Join by ID</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 3"
        className="data flex-1 border border-line bg-void px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-shard"
      />
      <button className="term-btn" disabled={id === null || busy || !burner.ready} onClick={join}>
        {busy ? "..." : "Join"}
      </button>
    </div>
  );
}
