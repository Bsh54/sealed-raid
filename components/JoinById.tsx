"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { baseSepolia } from "wagmi/chains";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { sealedRaidContract } from "@/lib/contract";

export function JoinById() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const id = /^\d+$/.test(value) ? BigInt(value) : null;

  const { data: match } = useReadContract({
    ...sealedRaidContract,
    functionName: "getMatch",
    args: id !== null ? [id] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: id !== null },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt?.status === "success" && id !== null) {
      router.push(`/placement?id=${id.toString()}`);
    }
  }, [receipt, id, router]);

  function join() {
    if (id === null || !match) return;
    const stake = (match as readonly unknown[])[2] as bigint;
    writeContract({
      ...sealedRaidContract,
      functionName: "joinMatch",
      args: [id],
      value: stake,
      chainId: baseSepolia.id,
    });
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
      <button className="term-btn" disabled={id === null || isPending} onClick={join}>
        {isPending ? "..." : "Join"}
      </button>
    </div>
  );
}
