import { ConnectWallet } from "@/components/ConnectWallet";
import { NewMatch } from "@/components/NewMatch";

const activeMatches = [
  {
    opponent: "Vyper",
    stake: 10,
    id: "0xA9...2F",
    status: "YOUR TURN",
    live: true,
  },
  {
    opponent: "Cipher",
    stake: 5,
    id: "0x4B...9C",
    status: "AWAITING OPPONENT",
    live: false,
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center border border-shard/60 glow-shard">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="leading-none">
        <div className="text-lg font-extrabold tracking-wide text-shard">SEALED RAID</div>
        <div className="label-caps mt-1 text-fg-dim">Encrypted PvP // Base</div>
      </div>
    </div>
  );
}

function JackpotBanner() {
  return (
    <div className="panel relative overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="label-caps text-fg-dim">Total Megapot Jackpot</div>
          <div className="data mt-2 text-4xl font-bold text-shard">$25,430.12</div>
        </div>
        <div className="text-right">
          <div className="label-caps text-fg-dim">Next Draw</div>
          <div className="data mt-2 text-lg text-fg">14h 22m</div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: (typeof activeMatches)[number] }) {
  return (
    <div className="panel flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 border border-line bg-surface-2" />
        <div>
          <div className="font-semibold">VS. {match.opponent}</div>
          <div className={`label-caps mt-1 ${match.live ? "text-shard" : "text-fg-dim"}`}>
            {match.status}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden text-right sm:block">
          <div className="data text-sm text-fg">{match.stake} USDC</div>
          <div className="data mt-1 text-xs text-fg-dim">{match.id}</div>
        </div>
        {match.live ? (
          <button className="term-btn">Enter</button>
        ) : (
          <span className="label-caps text-fg-dim">Waiting</span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="flex-1">
      <header className="flex items-center justify-between border-b border-line p-4 lg:px-8">
        <Logo />
        <ConnectWallet />
      </header>

      <div className="grid gap-6 p-4 lg:grid-cols-3 lg:p-8">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <JackpotBanner />
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Matches</h2>
              <span className="label-caps text-fg-dim">
                {activeMatches.length} Encrypted Sessions
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {activeMatches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <NewMatch />
        </div>
      </div>
    </main>
  );
}
