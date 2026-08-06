import { ConnectWallet } from "@/components/ConnectWallet";
import { NewMatch } from "@/components/NewMatch";
import { WalletPanel } from "@/components/WalletPanel";
import { JoinById } from "@/components/JoinById";

const openMatches = [
  { host: "Nyx", stake: 5, id: "0x7C...1A" },
  { host: "Echo", stake: 1, id: "0x2D...8B" },
  { host: "Raven", stake: 10, id: "0x9F...4E" },
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

function SectionHeader({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="label-caps text-fg-dim">{note}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="panel p-6 text-center">
      <span className="label-caps text-fg-dim">{label}</span>
    </div>
  );
}

function OpenMatchRow({ match }: { match: (typeof openMatches)[number] }) {
  return (
    <div className="panel flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 border border-line bg-surface-2" />
        <div>
          <div className="font-semibold">{match.host}</div>
          <div className="label-caps mt-1 text-fg-dim">Open Challenge</div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden text-right sm:block">
          <div className="data text-sm text-fg">{match.stake} USDC</div>
          <div className="data mt-1 text-xs text-fg-dim">{match.id}</div>
        </div>
        <button className="term-btn">Join</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-line px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
          <Logo />
          <ConnectWallet />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] flex-1 content-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-10">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <JackpotBanner />

          <section>
            <SectionHeader title="Open Matches" note={`${openMatches.length} Awaiting`} />
            <div className="flex flex-col gap-3">
              <JoinById />
              {openMatches.length === 0 ? (
                <EmptyState label="No open challenges — create one" />
              ) : (
                openMatches.map((m) => <OpenMatchRow key={m.id} match={m} />)
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <WalletPanel />
          <NewMatch />
        </div>
      </div>

      <StatusBar />
    </main>
  );
}

function StatusBar() {
  return (
    <footer className="border-t border-line px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
        <span className="label-caps flex items-center gap-2 text-fg-dim">
          <span className="h-1.5 w-1.5 bg-shard" />
          L1 // Encrypted Session
        </span>
        <div className="label-caps flex items-center gap-6 text-fg-dim">
          <span className="hover:text-fg">Docs</span>
          <span className="hover:text-fg">Security</span>
          <span className="text-shard">Status</span>
        </div>
      </div>
    </footer>
  );
}
