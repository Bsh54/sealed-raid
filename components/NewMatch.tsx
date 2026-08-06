"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeEventLog, parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sealedRaidContract, isContractConfigured } from "@/lib/contract";

const STAKES = [0.001, 0.005, 0.01];

export function NewMatch() {
  const router = useRouter();
  const [stake, setStake] = useState(STAKES[1]);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { data: receipt, isLoading: isMining } = useWaitForTransactionReceipt({ hash });

  const wrongNetwork = isConnected && chainId !== baseSepolia.id;

  useEffect(() => {
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: sealedRaidContract.abi,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "MatchCreated") {
          const id = (event.args as { id: bigint }).id;
          router.push(`/placement?id=${id.toString()}`);
          return;
        }
      } catch {
        continue;
      }
    }
  }, [receipt, router]);

  function createMatch() {
    writeContract({
      ...sealedRaidContract,
      functionName: "createMatch",
      value: parseEther(String(stake)),
      chainId: baseSepolia.id,
    });
  }

  const busy = isPending || isMining;

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
              stake === v ? "border-shard text-shard" : "border-line text-fg-dim hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {wrongNetwork ? (
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          className="term-btn w-full"
        >
          Switch to Base Sepolia
        </button>
      ) : (
        <button
          onClick={createMatch}
          disabled={!isConnected || !isContractConfigured || busy}
          className="term-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "Confirm in wallet..." : isMining ? "Creating..." : "Create Match"}
        </button>
      )}

      {!isConnected && (
        <p className="label-caps mt-3 text-xs text-fg-dim">Connect wallet to create</p>
      )}
    </div>
  );
}
