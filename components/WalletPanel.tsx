"use client";

import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { formatUnits } from "viem";

export function WalletPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const wrongNetwork = isConnected && chainId !== baseSepolia.id;

  if (!isConnected) {
    return (
      <div className="panel p-5">
        <div className="label-caps mb-3 text-fg-dim">Operator</div>
        <p className="text-sm text-fg-dim">
          Connect your wallet to stake and raid encrypted vaults.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="label-caps mb-3 text-fg-dim">Operator</div>
      <div className="data text-xs break-all text-fg">{address}</div>

      <div className="mt-4 flex items-center justify-between">
        <span className="label-caps text-fg-dim">Balance</span>
        <span className="data text-sm text-shard">
          {balance
            ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}`
            : "—"}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="label-caps text-fg-dim">Record</span>
        <span className="data text-sm text-fg">3W · 1L</span>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {wrongNetwork ? (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="label-caps text-ice hover:underline"
          >
            Wrong network // Switch to Base Sepolia
          </button>
        ) : (
          <span className="label-caps text-shard">Base Sepolia // Connected</span>
        )}
      </div>
    </div>
  );
}
