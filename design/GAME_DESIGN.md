# SEALED RAID — Game Design Document

*A hidden-information PvP game powered by Inco FHE (confidential onchain state) with a Megapot prize pool.*

---

## 1. One-line summary

Two players each hide traps and treasures on their own secret grid. On their turn, a
player "raids" a single cell of the opponent's grid, not knowing what is under it. The
grids are stored **encrypted onchain** — nobody, not even by reading the blockchain, can
see where the traps and treasures are. The player who collects the most treasures wins the
pot.

---

## 2. Core concept

Sealed Raid is a turn-based duel of deduction and risk. It borrows the skeleton of
Battleship / Minesweeper but reframes it around a single question: *can you find the
opponent's valuables before you step on one of their traps?*

The whole game only works because of confidential onchain state:

- On a normal blockchain, every stored value is public. If the grids were stored in plain
  text, either player could read the raw contract storage and instantly see where every
  trap and treasure is — the game would be pointless.
- With Inco's FHE (Fully Homomorphic Encryption), the grid contents are stored as
  **encrypted integers** (`euint`). The smart contract can compare and process these
  encrypted values **without ever decrypting them**. A cell's true content is only revealed
  at the exact moment it is raided, and only the result of that one cell.

This is the "hidden mechanic": the secret is enforced by cryptography on-chain, not by a
trusted server that could cheat or be hacked.

---

## 3. Objects in the game

Each player owns one grid. A grid is a fixed square of cells (default **6 x 6 = 36 cells**).
Every cell holds exactly one of three contents:

| Content       | Symbol (internal) | Meaning                                                        |
|---------------|-------------------|----------------------------------------------------------------|
| **Treasure**  | `SHARD`           | A valuable "data shard". Raiding it scores a point for the raider. |
| **Trap**      | `ICE`             | A hidden security trap. Raiding it damages / penalizes the raider. |
| **Empty**     | `VOID`            | Nothing. A safe but wasted move.                               |

Default distribution per grid (tunable):

- 5 treasures (`SHARD`)
- 6 traps (`ICE`)
- 25 empty (`VOID`)

Both players use the same distribution so the match is symmetric and fair.

---

## 4. Game phases

### Phase 0 — Match setup / staking
- A match is created for two players.
- Each player pays the entry cost (buy-in) in USDC. Both buy-ins form the **pot**.
- The pot is later routed through Megapot (winner payout + entry into the daily jackpot).

### Phase 1 — Secret placement (commit)
- Each player privately decides where to put their 5 treasures and 6 traps on their own grid.
- These placements are **encrypted client-side** and submitted to the contract as encrypted
  values (`euint`). The contract stores them but cannot read them.
- Neither player can see the other's placements. The chain itself cannot reveal them.
- Once both players have submitted, the placement phase is locked. Placements can no longer
  be changed (this prevents cheating by moving traps after seeing a raid).

### Phase 2 — Raiding (the main loop)
Players alternate turns. On a turn, the active player:

1. Picks **one cell coordinate** on the **opponent's** grid that has not been raided yet.
2. Submits that coordinate to the contract.
3. The contract evaluates — on encrypted data — what is under that cell, and reveals **only
   that single cell's result** to both players:
   - `SHARD` → the raider scores +1 treasure. Pot logic may reward the raider.
   - `ICE`   → the raider is penalized (see §6 for the chosen penalty rule).
   - `VOID`  → nothing happens; the turn is simply used up.
4. The revealed cell stays revealed for the rest of the match. Everything else stays sealed.
5. Turn passes to the other player.

The rest of the opponent's grid remains fully encrypted and unknown. A player only ever
learns the content of cells they have actually raided.

### Phase 3 — End of match & payout
The match ends when a terminal condition is met (see §5). The winner is determined, and the
pot is paid out via Megapot, with the daily jackpot entry attached.

---

## 5. Win / end conditions

The match ends when **any** of the following becomes true (pick the ruleset that fits — the
default is "all treasures found"):

1. **All treasures found (default):** the match ends once the combined number of raided
   treasures reaches the total treasures in play. The player who collected more treasures
   wins.
2. **Score target:** first player to collect a set number of treasures (e.g. 3) wins
   immediately.
3. **Turn limit:** after a fixed number of total turns, whoever has more treasures wins.

**Tie-breakers** (applied in order):
1. Higher treasure count.
2. Fewer traps triggered.
3. If still tied → draw (pot split) or sudden-death extra round, depending on config.

---

## 6. Trap rule (design choice)

The penalty for raiding a trap is a tunable rule. Options, from soft to hard:

- **Soft (recommended for v1):** hitting a trap scores nothing and simply ends your turn.
  Low frustration, keeps matches flowing.
- **Medium:** hitting a trap costs you one previously collected treasure (if you have any).
- **Hard:** hitting a certain number of traps eliminates you and the opponent wins
  immediately.

The default for the first version is **Soft**, because it keeps games fast and fun while
still making each raid a real risk (a wasted turn is a real cost in a race).

---

## 7. Why it is strategic (not just luck)

Although each raid has a random-feeling outcome, skill enters through several channels:

- **Placement psychology:** where you hide your own treasures and traps matters. Players
  tend to avoid edges or clump in the center; a smart player exploits these habits.
- **Trap baiting:** you can surround a spot that "looks" like an obvious treasure location
  with traps, luring the opponent into stepping on them.
- **Deduction over time:** as cells get revealed, the probability map of where the remaining
  treasures are shifts. A good player raids the highest-expected-value cell, not a random one.
- **Tempo / risk management:** when you are ahead, you can play safer cells; when behind, you
  must take bigger risks to catch up. Reading the score and adapting is the real game.

---

## 8. Confidentiality: what is hidden vs public

| Data                                   | Visible to owner | Visible to opponent | Visible on-chain (raw) |
|----------------------------------------|:----------------:|:-------------------:|:----------------------:|
| Your own grid placement                | Yes              | No                  | No (encrypted `euint`) |
| Opponent's grid placement              | No               | Yes (to them)       | No (encrypted `euint`) |
| A cell that has been raided            | Yes              | Yes                 | Yes (revealed result)  |
| Scores / whose turn / match state      | Yes              | Yes                 | Yes (public)           |
| Pot amount / players / result          | Yes              | Yes                 | Yes (public)           |

The key point: **placements are never readable by anyone until a specific cell is raided**,
and this is guaranteed by encryption on the chain itself, not by trusting a server.

---

## 9. Megapot integration (prize logic)

Megapot is woven into the stakes rather than bolted on as a link:

- **Buy-in:** each player stakes USDC to enter a match; the two stakes form the match pot.
- **Payout:** the winner receives the pot, paid out through Megapot.
- **Jackpot entry:** playing a match also grants an entry into Megapot's **daily jackpot**,
  so every match is both a duel for the local pot and a ticket toward the bigger daily prize.
- **Retention hook:** because jackpot entries are daily, players are incentivized to come
  back and play at least once per day.

---

## 10. Full example round (step by step)

Setup: 6x6 grids, 5 treasures + 6 traps each, "all treasures found" win rule, Soft trap
rule. Players: **You** and **Vyper**. Buy-in: 1 USDC each → pot = 2 USDC.

1. **Placement:** You secretly place your 5 treasures and 6 traps. Vyper does the same. Both
   submit encrypted grids on-chain. Nobody can read the other's grid.
2. **Turn 1 (You):** You raid Vyper's cell (row 2, col 3). Contract reveals: `VOID`. Nothing
   happens. Score — You 0, Vyper 0.
3. **Turn 2 (Vyper):** Vyper raids your cell (row 5, col 1). Reveals: `SHARD`. Vyper scores.
   Score — You 0, Vyper 1.
4. **Turn 3 (You):** You raid (row 0, col 0). Reveals: `SHARD`. Score — You 1, Vyper 1.
5. **Turn 4 (Vyper):** Vyper raids (row 3, col 3). Reveals: `ICE` (trap). Soft rule → turn
   wasted, no score. Score — You 1, Vyper 1.
6. **Turns continue** alternating. Each player slowly maps the opponent's grid from revealed
   cells and targets the most likely treasure spots.
7. **End:** Once all 10 treasures (5 per grid) have been raided in total, the match ends. Say
   final score is You 3, Vyper 2 → **You win**.
8. **Payout:** The 2 USDC pot is paid to You via Megapot, plus a daily jackpot entry is
   recorded for the match.

---

## 11. Tunable parameters (summary)

| Parameter            | Default | Notes                                             |
|----------------------|---------|---------------------------------------------------|
| Grid size            | 6 x 6   | Bigger grid = longer, more deductive matches.     |
| Treasures per grid   | 5       | More treasures = higher scoring, faster games.    |
| Traps per grid       | 6       | More traps = higher risk per raid.                |
| Trap penalty rule    | Soft    | Soft / Medium / Hard (see §6).                    |
| Win condition        | All treasures found | Or score target, or turn limit.       |
| Buy-in               | 1 USDC  | Sets the pot size; routed via Megapot.            |
| Turn timer           | Optional | Add a per-turn timer to keep matches moving.     |

---

## 12. Design pillars (what must always be true)

1. **The secret is real.** Placements are cryptographically hidden on-chain; cheating by
   reading the chain is impossible. This is the whole point.
2. **Every raid is a real decision.** Each move carries genuine risk and reward, so choices
   matter more than luck over the course of a match.
3. **Fast and readable.** A match should be quick to play and easy to understand: raid a
   cell, see the result, adapt.
4. **Stakes are meaningful.** Real value (USDC pot + jackpot entry) makes each match matter,
   without turning the game into pure gambling — skill still decides the winner.
