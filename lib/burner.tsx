"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  nonceManager,
  parseEther,
  type Abi,
  type PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { useSendTransaction, useSignMessage } from "wagmi";
import { sealedRaidContract } from "@/lib/contract";

const RPC = "https://sepolia.base.org";
const STORAGE_KEY = "sealed-raid-burner-pk";
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

type WriteArgs = readonly unknown[];

type BurnerContext = {
  address?: `0x${string}`;
  ready: boolean;
  creating: boolean;
  create: () => Promise<void>;
  ensureFunded: (min: bigint) => Promise<void>;
  writeGame: (
    functionName: string,
    args: WriteArgs,
    value?: bigint,
  ) => Promise<Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>>;
  balance: () => Promise<bigint>;
};

const Ctx = createContext<BurnerContext | null>(null);

export function BurnerProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<PrivateKeyAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const { sendTransactionAsync } = useSendTransaction();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAccount(privateKeyToAccount(stored as `0x${string}`, { nonceManager }));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const sig = await signMessageAsync({ message: "Sealed Raid — game session key v1" });
      const pk = keccak256(sig);
      localStorage.setItem(STORAGE_KEY, pk);
      setAccount(privateKeyToAccount(pk, { nonceManager }));
    } finally {
      setCreating(false);
    }
  }, [signMessageAsync]);

  const client = useMemo(
    () =>
      account
        ? createWalletClient({ account, chain: baseSepolia, transport: http(RPC) })
        : null,
    [account],
  );

  const balance = useCallback(async () => {
    if (!account) return BigInt(0);
    return publicClient.getBalance({ address: account.address });
  }, [account]);

  const ensureFunded = useCallback(
    async (min: bigint) => {
      if (!account) throw new Error("Burner not ready");
      const bal = await publicClient.getBalance({ address: account.address });
      if (bal >= min) return;
      const topUp = min - bal + parseEther("0.005");
      const hash = await sendTransactionAsync({ to: account.address, value: topUp });
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [account, sendTransactionAsync],
  );

  const writeGame = useCallback(
    async (functionName: string, args: WriteArgs, value?: bigint) => {
      if (!client || !account) throw new Error("Burner not ready");
      const hash = await client.writeContract({
        address: sealedRaidContract.address,
        abi: sealedRaidContract.abi as Abi,
        functionName,
        args: args as unknown[],
        value,
        account,
        chain: baseSepolia,
      });
      return publicClient.waitForTransactionReceipt({ hash });
    },
    [client, account],
  );

  const value: BurnerContext = {
    address: account?.address,
    ready: !!account,
    creating,
    create,
    ensureFunded,
    writeGame,
    balance,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBurner() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBurner must be used within BurnerProvider");
  return ctx;
}
