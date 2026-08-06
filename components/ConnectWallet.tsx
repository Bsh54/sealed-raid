"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

function shorten(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button className="term-btn" onClick={() => disconnect()}>
        {shorten(address)}
      </button>
    );
  }

  return (
    <button
      className="term-btn disabled:opacity-50"
      disabled={isPending}
      onClick={() => connect({ connector: injected() })}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
