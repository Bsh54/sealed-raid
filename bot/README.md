# Sealed Raid Bot

Autonomous opponent for Sealed Raid. Watches Base Sepolia for public matches,
joins them after a delay if no human joins first, then plays blind (random
placement and random raids — it never uses knowledge of the opponent's board).

Private matches are ignored.

## Run

```bash
npm install
cp .env.example .env   # then fill BOT_PRIVATE_KEY
npm start
```

## Deploy on the VPS (isolated, under pm2)

```bash
# on the server, in /opt/sealed-raid-bot
npm install
cp .env.example .env    # set BOT_PRIVATE_KEY (a funded Base Sepolia wallet)
pm2 start index.mjs --name sealed-raid-bot
pm2 save
```

The bot wallet must hold Base Sepolia ETH to cover stakes and gas.

## Env

- `BOT_PRIVATE_KEY` — private key of the funded bot wallet
- `CONTRACT_ADDRESS` — deployed SealedRaid address
- `RPC_URL` — Base Sepolia RPC (default https://sepolia.base.org)
- `JOIN_DELAY_MS` — delay before the bot joins a public match (default 10000)
