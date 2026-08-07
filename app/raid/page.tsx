"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type HexString } from "@inco/lightning-js";
import { baseSepolia } from "wagmi/chains";
import { useAccount, usePublicClient } from "wagmi";
import { sealedRaidContract } from "@/lib/contract";
import { useBurner } from "@/lib/burner";
import { revealHandle } from "@/lib/inco-attestation";
import { Spinner } from "@/components/Spinner";

const GRID = 36;
const ZERO_HANDLE = "0x" + "0".repeat(64);
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function ShardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

function Raid() {
  const params = useSearchParams();
  const router = useRouter();
  const idParam = params.get("id");
  const matchId = idParam && /^\d+$/.test(idParam) ? BigInt(idParam) : null;

  const { address } = useAccount();
  const burner = useBurner();
  const client = usePublicClient({ chainId: baseSepolia.id });

  const [host, setHost] = useState<string | null>(null);
  const [guest, setGuest] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const [turn, setTurn] = useState(0);
  const [hostScore, setHostScore] = useState(0);
  const [guestScore, setGuestScore] = useState(0);
  const [opened, setOpened] = useState<Record<number, number>>({});
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [step, setStep] = useState<"idle" | "raiding" | "revealing" | "settling">("idle");
  const [error, setError] = useState<string | null>(null);

  const me = burner.address ?? address;
  const mySeat = me
    ? me.toLowerCase() === host?.toLowerCase()
      ? 0
      : me.toLowerCase() === guest?.toLowerCase()
        ? 1
        : -1
    : -1;
  const isMyTurn = phase === 1 && turn === mySeat && step === "idle";

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

    const cells = (await client.readContract({
      ...sealedRaidContract,
      functionName: "getRevealedBoard",
      args: [matchId],
    })) as readonly number[];
    const map: Record<number, number> = {};
    cells.forEach((v, i) => {
      if (v > 0) map[i] = v;
    });
    setOpened(map);
  }, [client, matchId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (phase === 2 && matchId !== null) router.push(`/victory?id=${matchId.toString()}`);
  }, [phase, matchId, router]);

  async function readPending() {
    if (!client || matchId === null) return ZERO_HANDLE as HexString;
    return (await client.readContract({
      ...sealedRaidContract,
      functionName: "pendingHandle",
      args: [matchId],
    })) as HexString;
  }

  async function revealAndSettle(handle: HexString) {
    if (matchId === null) return;
    setStep("revealing");
    const { attestation, signatures } = await revealHandle(handle);
    setStep("settling");
    await burner.writeGame("settleRaid", [matchId, attestation, signatures]);
    await refresh();
  }

  async function raidCell(pos: number) {
    if (!client || matchId === null || !isMyTurn || !burner.ready) return;
    if (pos in opened) return;
    setError(null);
    setPending((p) => ({ ...p, [pos]: true }));
    try {
      const existing = await readPending();
      if (existing && existing.toLowerCase() !== ZERO_HANDLE) {
        await revealAndSettle(existing);
        return;
      }

      setStep("raiding");
      await burner.writeGame("raid", [matchId, BigInt(pos)]);

      let handle = ZERO_HANDLE as HexString;
      for (let i = 0; i < 20; i++) {
        handle = await readPending();
        if (handle && handle.toLowerCase() !== ZERO_HANDLE) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!handle || handle.toLowerCase() === ZERO_HANDLE) {
        throw new Error("No pending handle after raid");
      }

      await revealAndSettle(handle);
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
  const waiting = phase === 0;

  const statusLabel = waiting
    ? "Waiting for opponent..."
    : step === "raiding"
      ? "Raiding cell..."
      : step === "revealing"
        ? "Decrypting via Inco (~1-2 min)..."
        : step === "settling"
          ? "Settling on-chain..."
          : isMyTurn
            ? "Your turn // raid a cell"
            : "Opponent's turn...";

  if (!burner.ready) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-4">
        <Spinner size={48} />
        <div className="label-caps mt-6 text-fg-dim">Restoring game session...</div>
      </div>
    );
  }

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

      {waiting ? (
        <div className="panel flex flex-col items-center p-12 text-center">
          <Spinner size={56} />
          <div className="label-caps mt-6 text-shard">Searching for opponent</div>
          <div className="mt-6">
            <div className="label-caps text-fg-dim">Share this match id</div>
            <div className="data mt-1 text-3xl text-fg">#{matchId?.toString() ?? "-"}</div>
          </div>
          {guest && guest !== ZERO_ADDR && (
            <div className="label-caps mt-4 text-fg-dim">Generating encrypted vault...</div>
          )}
        </div>
      ) : (
        <>
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
              <span className="font-semibold">Encrypted Vault</span>
              <span className="label-caps flex items-center gap-2 text-shard">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {SHARDS_LEFT(myScore, oppScore)} shards left
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: GRID }).map((_, i) => {
                const val = opened[i];
                const isOpen = val !== undefined;
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
                          ? val === 2
                            ? "border-shard bg-shard/10 text-shard glow-shard"
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
                    {isOpen && val === 2 && <ShardIcon />}
                    {isOpen && val === 1 && <span className="data text-fg-dim">·</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="label-caps mt-4 break-words text-center text-ice">{error}</p>}
        </>
      )}
    </div>
  );
}

function SHARDS_LEFT(a: number, b: number) {
  const left = 5 - a - b;
  return left < 0 ? 0 : left;
}

export default function RaidPage() {
  return (
    <Suspense>
      <Raid />
    </Suspense>
  );
}
