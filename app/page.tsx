import { ConnectWallet } from "@/components/ConnectWallet";
import { FindMatch } from "@/components/FindMatch";
import { WalletPanel } from "@/components/WalletPanel";
import { JoinById } from "@/components/JoinById";

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
    <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-line p-4 pt-10 lg:flex">
      <nav className="mt-8 flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
        <button className="label-caps px-3 py-2 text-left text-fg-dim hover:text-fg">Settings</button>
        <button className="label-caps px-3 py-2 text-left text-fg-dim hover:text-fg">Support</button>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line p-4 lg:px-8">
          <Logo />
          <ConnectWallet />
        </header>

        <div className="grid flex-1 items-center gap-8 p-4 lg:grid-cols-3 lg:p-8">
          <div className="lg:col-span-2">
            <div className="mx-auto max-w-md">
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-shard">
                  ENTER THE ARENA
                </h1>
                <p className="label-caps mt-3 text-fg-dim">
                  Hide your vault. Raid theirs. Winner takes the pot.
                </p>
              </div>
              <FindMatch />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <WalletPanel />
            <JoinById />
          </div>
        </div>
      </main>
    </div>
  );
}
