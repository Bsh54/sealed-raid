# Sealed Raid

A hidden-information PvP game running on Base with confidential onchain state powered by
Inco Lightning (FHE), and a Megapot-backed prize pool.

Two players each hide treasures (`SHARD`) and traps (`ICE`) on their own secret grid. The
grids are stored encrypted onchain as `euint` values — nobody can read them, not even by
inspecting the blockchain. On each turn a player raids one cell of the opponent's grid,
revealing only that single cell. The player who collects the most treasures wins the pot.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel
- **Wallet / RPC:** wagmi + viem
- **Confidentiality:** Inco Lightning (`@inco/lightning` in Solidity, `@inco/lightning-js` client-side)
- **Chain:** Base Sepolia
- **Prize pool:** Megapot (buy-in and payout)

## How confidentiality works

- Placements are encrypted client-side with `@inco/lightning-js` before they ever leave the
  browser, then submitted to the contract as ciphertext.
- The contract stores them as `euint256` handles and computes on them without decrypting.
- A cell's content is only revealed when it is raided, and only for that one cell.

## Project structure

- `app/` — Next.js frontend (dashboard, placement, raid, victory)
- `contracts/` — Solidity contracts using Inco Lightning
- `design/` — design system reference (Cyber-Noir)

## Status

Built for the Inco x Megapot Summer Game Jam.
