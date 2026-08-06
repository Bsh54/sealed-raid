import { ConnectWallet } from "@/components/ConnectWallet";
import { FindMatch } from "@/components/FindMatch";
import { WalletPanel } from "@/components/WalletPanel";
import { JoinById } from "@/components/JoinById";

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

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-line px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between">
          <Logo />
          <ConnectWallet />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
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

      <StatusBar />
    </main>
  );
}
