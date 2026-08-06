const finalBoard = [
  "void", "ice", "void", "shard", "void", "void",
  "void", "void", "shard", "void", "ice", "void",
  "ice", "void", "void", "void", "void", "shard",
  "void", "shard", "void", "ice", "void", "void",
  "void", "void", "ice", "void", "void", "shard",
  "void", "void", "void", "void", "ice", "void",
] as const;

function ShardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

function IceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20M4 5l16 14M20 5 4 19M2 12h20" />
    </svg>
  );
}

export default function VictoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-12">
      <h1 className="text-center text-3xl font-extrabold tracking-tight text-shard">
        DECRYPTION COMPLETE — VICTORY
      </h1>
      <p className="label-caps mt-3 text-fg-dim">Match ID 0xA9...2F // Status: Secured</p>

      <div className="mt-8 grid w-full gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="panel p-6">
            <div className="label-caps mb-4 text-fg-dim">Final Tally</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="label-caps text-fg-dim">You</div>
                <div className="data mt-1 text-4xl font-bold text-shard">3</div>
                <div className="label-caps mt-1 text-fg-dim">Shards</div>
              </div>
              <div className="data text-2xl text-muted">vs</div>
              <div className="text-right">
                <div className="label-caps text-fg-dim">Opponent</div>
                <div className="data mt-1 text-4xl font-bold text-ice">2</div>
                <div className="label-caps mt-1 text-fg-dim">Shards</div>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <div className="label-caps mb-4 text-fg-dim">Winnings Routed</div>
            <div className="data text-3xl font-bold text-shard">+18.00 USDC</div>
            <div className="label-caps mt-3 flex items-center gap-2 text-ice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Daily Jackpot Entry Confirmed
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="label-caps mb-4 text-fg-dim">Opponent Vault // Decrypted</div>
          <div className="grid grid-cols-6 gap-2">
            {finalBoard.map((content, i) => (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center border ${
                  content === "shard"
                    ? "border-shard/60 bg-shard/10 text-shard"
                    : content === "ice"
                      ? "border-ice/60 bg-ice/10 text-ice"
                      : "border-line bg-void text-muted"
                }`}
              >
                {content === "shard" && <ShardIcon />}
                {content === "ice" && <IceIcon />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-md gap-3">
        <button className="term-btn flex-1">View Leaderboard</button>
        <button className="term-btn flex-1">New Raid</button>
      </div>
    </div>
  );
}
