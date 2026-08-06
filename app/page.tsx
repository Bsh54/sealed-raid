import { ConnectWallet } from "@/components/ConnectWallet";

const activeMatches = [
  {
    opponent: "Vyper",
    stake: 10,
    id: "0xA9...2F",
    status: "YOUR TURN REQUIRED",
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

const navItems = ["Terminal", "Arena", "Leaderboard", "Vault"];

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

function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-line p-4 lg:flex">
      <div>
        <div className="mb-8 flex items-center gap-3 panel p-3">
          <div className="h-8 w-8 border border-line bg-surface-2" />
          <div className="leading-tight">
            <div className="label-caps text-fg-dim">Operator_0x1</div>
            <div className="data mt-1 text-sm text-shard">2,450.00 USDC</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item, i) => (
            <button
              key={item}
              className={`label-caps flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                i === 0
                  ? "border-l-2 border-shard bg-surface text-shard"
                  : "text-fg-dim hover:text-fg"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-1">
        <button className="label-caps px-3 py-2 text-left text-fg-dim hover:text-fg">Settings</button>
        <button className="label-caps px-3 py-2 text-left text-fg-dim hover:text-fg">Support</button>
      </div>
    </aside>
  );
}

function JackpotBanner() {
  return (
    <div className="panel relative overflow-hidden p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="label-caps text-fg-dim">Total Megapot Jackpot</div>
          <div className="data mt-2 text-4xl font-bold text-shard">$25,430.12</div>
        </div>
        <button className="term-btn">Play Now</button>
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
          <div
            className={`label-caps mt-1 ${
              match.live ? "text-shard" : "text-fg-dim"
            }`}
          >
            {match.status}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden text-right sm:block">
          <div className="data text-sm text-fg">{match.stake} USDC</div>
          <div className="data mt-1 text-xs text-fg-dim">ID: {match.id}</div>
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

function NewMatchPanel() {
  return (
    <div className="panel p-5">
      <div className="label-caps mb-4 text-fg-dim">Initiate New Match</div>
      <div className="label-caps mb-2 text-xs text-fg-dim">Select Staking Parameter (USDC)</div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[1, 5, 10].map((v, i) => (
          <button
            key={v}
            className={`data border py-2 text-sm ${
              i === 1
                ? "border-shard text-shard"
                : "border-line text-fg-dim hover:text-fg"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <button className="term-btn w-full">Quick Match</button>
    </div>
  );
}

function JackpotStatus() {
  return (
    <div className="panel p-5">
      <div className="label-caps mb-3 text-fg-dim">Daily Jackpot Status</div>
      <div className="label-caps text-ice">Entry Secured</div>
      <div className="data mt-2 text-xs text-fg-dim">Next draw in 14h 22m</div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 ${i < 6 ? "bg-ice" : "bg-muted/30"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
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
            <JackpotStatus />
            <NewMatchPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
