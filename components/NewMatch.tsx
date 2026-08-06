"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { sealedRaidContract, isContractConfigured } from "@/lib/contract";

const STAKES = [0.001, 0.005, 0.01];

export function NewMatch() {
  const [stake, setStake] = useState(STAKES[1]);
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  function createMatch() {
    writeContract({
      ...sealedRaidContract,
      functionName: "createMatch",
      value: parseEther(String(stake)),
    });
  }

  const disabled = !isConnected || !isContractConfigured || isPending;

  return (
    <div className="panel p-5">
      <div className="label-caps mb-4 text-fg-dim">Initiate New Match</div>
      <div className="label-caps mb-2 text-xs text-fg-dim">Stake (ETH)</div>
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
      <button
        onClick={createMatch}
        disabled={disabled}
        className="term-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Confirming..." : "Create Match"}
      </button>
      {!isContractConfigured && (
        <p className="label-caps mt-3 text-xs text-fg-dim">Contract not yet deployed</p>
      )}
    </div>
  );
}
