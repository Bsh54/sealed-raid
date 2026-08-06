"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type HexString } from "@inco/lightning-js";
import { baseSepolia } from "wagmi/chains";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { sealedRaidContract } from "@/lib/contract";
import { revealHandle } from "@/lib/inco-attestation";

const GRID = 36;

type Content = 0 | 1 | 2;

function ShardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

function IceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20M4 5l16 14M20 5 4 19M2 12h20" />
    </svg>
  );
}

function Raid() {
  const params = useSearchParams();
  const router = useRouter();
  const idParam = params.get("id");
  const matchId = idParam && /^\d+$/.test(idParam) ? BigInt(idParam) : null;

  const { address } = useAccount();
  const client = usePublicClient({ chainId: baseSepolia.id });
  const { writeContractAsync } = useWriteContract();

  const [host, setHost] = useState<string | null>(null);
  const [guest, setGuest] = useState<string | null>(null);
  const [phase, setPhase] = useState<number>(0);
  const [turn, setTurn] = useState<number>(0);
  const [hostScore, setHostScore] = useState<number>(0);
  const [guestScore, setGuestScore] = useState<number>(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<number, Content>>({});
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [step, setStep] = useState<"idle" | "raiding" | "revealing" | "settling">("idle");
  const [error, setError] = useState<string | null>(null);

  const mySeat = address
    ? address.toLowerCase() === host?.toLowerCase()
      ? 0
      : address.toLowerCase() === guest?.toLowerCase()
        ? 1
        : -1
    : -1;
  const oppSeat = mySeat === 0 ? 1 : 0;
  const isMyTurn = phase === 2 && turn === mySeat && step === "idle";

  const refresh = useCallback(async () => {
    if (!client || matchId === null) return;
    const m = (await client.readContract({
      ...sealedRaidContract,
      functionName: "getMatch",
      args: [matchId],
    })) as readonly [string, string, bigint, number, number, number, number, string, boolean];
    setHost(m[0]);
    setGuest(m[1]);
    setPhase(m[3]);
    setTurn(m[4]);
    setHostScore(m[5]);
    setGuestScore(m[6]);
    setWinner(m[7] === "0x0000000000000000000000000000000000000000" ? null : m[7]);

    const logs = await client.getContractEvents({
      ...sealedRaidContract,
      eventName: "CellRevealed",
      args: { id: matchId },
      fromBlock: BigInt(0),
    });
    const map: Record<number, Content> = {};
    for (const log of logs) {
      const a = log.args as { byPlayer: number; pos: bigint; content: bigint };
      if (Number(a.byPlayer) === mySeat) {
        map[Number(a.pos)] = Number(a.content) as Content;
      }
    }
    setOpened(map);
  }, [client, matchId, mySeat]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (phase === 3 && matchId !== null) {
      router.push(`/victory?id=${matchId.toString()}`);
    }
  }, [phase, matchId, router]);

  async function raidCell(pos: number) {
    if (!client || matchId === null || !isMyTurn) return;
    setError(null);
    setPending((p) => ({ ...p, [pos]: true }));
    try {
      setStep("raiding");
      const raidHash = await writeContractAsync({
        ...sealedRaidContract,
        functionName: "raid",
        args: [matchId, BigInt(pos)],
        chainId: baseSepolia.id,
      });
      await client.waitForTransactionReceipt({ hash: raidHash });

      const handle = (await client.readContract({
        ...sealedRaidContract,
        functionName: "pendingHandle",
        args: [matchId],
      })) as HexString;

      setStep("revealing");
      const { attestation, signatures } = await revealHandle(handle);

      setStep("settling");
      const settleHash = await writeContractAsync({
        ...sealedRaidContract,
        functionName: "settleRaid",
        args: [matchId, attestation, signatures],
        chainId: baseSepolia.id,
      });
      await client.waitForTransactionReceipt({ hash: settleHash });

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Raid failed");
    } finally {
      setStep("idle");
      setPending((p) => {
        const n = { ...p };
        delete n[pos];
        return n;
      });
    }
  }

  const myScore = mySeat === 0 ? hostScore : guestScore;
  const oppScore = mySeat === 0 ? guestScore : hostScore;

  const statusLabel =
    phase < 2
      ? "Waiting for both placements..."
      : step === "raiding"
        ? "Raiding cell..."
        : step === "revealing"
          ? "Decrypting via Inco (~1-2 min)..."
          : step === "settling"
            ? "Settling on-chain..."
            : isMyTurn
              ? "Your turn // select a cell"
              : "Opponent's turn...";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="label-caps text-fg-dim">Match</div>
          <div className="data mt-1 text-sm text-fg">#{matchId?.toString() ?? "-"}</div>
        </div>
        <div className="text-right">
          <div className="label-caps text-fg-dim">Status</div>
          <div className="label-caps mt-1 text-shard">{statusLabel}</div>
        </div>
      </header>

      <div className="mb-6 flex gap-3">
        <div className={`panel flex-1 p-4 ${isMyTurn ? "border-shard/40" : ""}`}>
          <div className="label-caps text-fg-dim">You</div>
          <div className="data mt-2 text-3xl font-bold text-shard">{myScore}</div>
        </div>
        <div className="panel flex-1 p-4">
          <div className="label-caps text-fg-dim">Opponent</div>
          <div className="data mt-2 text-3xl font-bold text-ice">{oppScore}</div>
        </div>
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
            const isOpen = i in opened;
            const content = opened[i];
            const isPending = pending[i];
            return (
              <button
                key={i}
                onClick={() => raidCell(i)}
                disabled={!isMyTurn || isOpen}
                className={`flex aspect-square items-center justify-center border transition-all ${
                  isPending
                    ? "animate-pulse border-shard text-shard"
                    : isOpen
                      ? content === 1
                        ? "border-shard bg-shard/10 text-shard glow-shard"
                        : content === 2
                          ? "border-ice bg-ice/10 text-ice glow-ice"
                          : "border-line bg-void text-muted"
                      : isMyTurn
                        ? "border-line bg-surface-2/40 text-muted hover:border-shard/60 hover:text-shard"
                        : "border-line bg-surface-2/40 text-muted"
                }`}
              >
                {!isOpen && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {isOpen && content === 1 && <ShardIcon />}
                {isOpen && content === 2 && <IceIcon />}
                {isOpen && content === 0 && <span className="data text-fg-dim">·</span>}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="label-caps mt-4 break-words text-center text-ice">{error}</p>}
      {winner && (
        <p className="label-caps mt-4 text-center text-shard">
          Winner: {winner.slice(0, 6)}...{winner.slice(-4)}
        </p>
      )}
    </div>
  );
}

export default function RaidPage() {
  return (
    <Suspense>
      <Raid />
    </Suspense>
  );
}
