# The Global Economy Simulation — Facilitator Guide

## What Is This Game?

This is a real-time multiplayer web app that simulates **global economic inequality**. It demonstrates three sociological theories through gameplay:

- **World Systems Theory** — The world is divided into Core, Semi-Periphery, and Periphery nations. Core nations exploit Periphery nations for cheap resources.
- **Dependency Theory** — Foreign Direct Investment (FDI) creates permanent profit extraction, making poor nations dependent on rich ones.
- **Modernization Theory** — Technology is key to development, but access to it is unequal.

**10 student groups** connect via their phones. A **teacher/facilitator** runs the admin dashboard on a projector. The game runs for about 20 minutes (configurable).

---

## Quick Setup

1. The game runs on a local server (Raspberry Pi / Orange Pi or a laptop).
2. Students connect to the same Wi-Fi network as the server.
3. **Player URL:** `http://<server-ip>:3000/play` (or just `http://<server-ip>` — it redirects to `/play`)
4. **Admin URL:** `http://<server-ip>:3000/admin`
5. Each group opens the player URL on **one phone** (or up to 4 phones per group — see Roles below).

---

## The 10 Teams

| Groups | Tier | Starting Wealth | Raw Materials | Tech Level | Color Theme |
|---|---|---|---|---|---|
| Group 1, Group 2 | **Core** | $500 | 0 | 3 | Blue |
| Group 3, Group 4, Group 5 | **Semi-Periphery** | $200 | 10 | 1 | Yellow |
| Group 6–10 | **Periphery** | $50 | 30 | 0 | Red |

### What Each Tier Can Do

| Action | Core | Semi-Periphery | Periphery |
|---|---|---|---|
| **Mine** (extract raw materials) | No | Yes (5s cooldown) | Yes (3s cooldown) |
| **Manufacture** (convert 1 raw material → money) | Yes (+$50/unit) | Yes (+$30/unit) | Only if tech >= 1 (+$30/unit) |
| **Trade on Market** | Yes | Yes | Yes |
| **Sabotage** | Embargo, Espionage restrictions apply | Embargo, Espionage | Strike, Revolution, Espionage |

**Key insight for students:** Core nations start rich with high technology but have **zero raw materials**. They need to buy from Periphery/Semi-Periphery on the market. Periphery nations have lots of raw materials but almost no money and no technology.

---

## Roles (Within Each Team)

When students open the game on their phone, they:
1. **Select their team** (Group 1–10)
2. **Enter their name**
3. **Get assigned a role** automatically (in join order)

| Join Order | Role | What They Can Do |
|---|---|---|
| 1st member | **Miner** (or Manufacturer for Core) | Mine raw materials + Sell on Market |
| 2nd member | **Manufacturer** (or Saboteur for Core) | Manufacture goods + Buy from Market |
| 3rd member | **Saboteur** | Perform sabotage actions (embargo, espionage, strike, revolution) |
| 4th member | **Treasurer** | View-only dashboard — tracks team stats |

- **Core teams skip Miner** (they can't mine), so roles are: Manufacturer → Saboteur → Treasurer → Treasurer.
- If a team has more than 4 members, extras become Treasurers.
- The teacher can **rotate roles** from the admin dashboard at any time, shifting everyone's role one slot forward.

**Tip:** If a group only has 1 phone, one person operates it and the group decides together. If they have 2–4 phones, each person gets their own role.

---

## Core Game Actions

### Mining (Miner role)

- **Who:** Periphery and Semi-Periphery only.
- **What:** Press the Mine button to extract +1 raw material from the ground.
- **Cooldown:** Periphery = 3 seconds, Semi-Periphery = 5 seconds.
- **Blocked by:** Worker Strike (if active).
- Raw materials are needed for manufacturing and can be sold on the market.

### Manufacturing (Manufacturer role)

- **Who:** Core and Semi-Periphery always. Periphery only if their tech level is >= 1 (gained via FDI or Espionage).
- **What:** Converts 1 raw material into money.
  - Core earns **+$50** per unit manufactured.
  - Semi-Periphery and Periphery earn **+$30** per unit.
- **FDI Tax:** If the team has an FDI investor, **50% of the manufacturing profit goes to the Core investor permanently**. So a Periphery team with FDI manufacturing earns only +$15, while the Core investor silently collects +$15 every single time.
- **Blocked by:** Worker Strike (if active).

### Market Trading

The market is where teams buy and sell raw materials.

**Selling (Miner role):**
1. Set the quantity and price per unit.
2. Raw materials are **deducted immediately** when you list (escrow model — no double-selling).
3. Your listing appears on the public market for anyone to buy.
4. You can cancel an unsold listing to get materials back.

**Buying (Manufacturer role):**
1. Browse open listings on the market.
2. Click Buy to purchase. Money is deducted from buyer, credited to seller.
3. Raw materials are added to the buyer's inventory.

**Blocked by:** Trade Embargo (if your team is embargoed, you cannot buy or sell).

---

## Sabotage Actions (Saboteur Role)

Each team's Saboteur has access to disruptive actions. There is a **15-second cooldown** between any sabotage action per team.

### 1. Trade Embargo

| Detail | Value |
|---|---|
| **Who can use** | Core and Semi-Periphery |
| **Cost** | $50 (deducted from your team) |
| **Effect** | Target team is **blocked from all market activity** (buy and sell) for 60 seconds |
| **Target** | Any other team |

Use this to cut off a rival's trade routes. Especially devastating against Periphery teams that depend on selling raw materials.

### 2. Espionage (Technology Theft)

| Detail | Value |
|---|---|
| **Who can use** | Periphery and Semi-Periphery |
| **Cost** | Free if successful. **$40 fine** if you fail (paid to the target) |
| **Success rate** | **40% chance** of success |
| **Effect on success** | Your team gains **+1 tech level** |
| **Effect on failure** | Your team loses **$40**, target team gains **$40** |
| **Target** | Any team with a **higher tech level** than yours |

This is the main way for Periphery to gain technology without accepting FDI. High risk, high reward.

### 3. Worker Strike

| Detail | Value |
|---|---|
| **Who can use** | Periphery only (must have an FDI investor) |
| **Cost** | None to the striking team |
| **Effect** | Your own team's **mining and manufacturing are halted for 30 seconds** |
| **Investor penalty** | The Core FDI investor **loses $30** |
| **Requirement** | Team must have an active FDI link |

A strike hurts your own productivity but punishes the exploitative Core investor. Use it strategically — you lose 30 seconds of production, but the Core team loses money.

### 4. Revolution

| Detail | Value |
|---|---|
| **Who can use** | Periphery only (must have FDI investor AND wealth <= $20) |
| **Effect** | **Permanently breaks the FDI link** — no more 50% tax! |
| **Cost** | Your wealth is **halved** and tech level **resets to 0** |
| **Requirement** | Wealth must be $20 or less, and must have an active FDI link |

Revolution is the nuclear option. It frees you from FDI extraction but at a devastating cost. Your team starts over with almost nothing — but at least you keep what you earn.

---

## Teacher/Admin Actions (God Mode)

The admin dashboard at `/admin` gives the teacher full control.

### Timer
- Default: **20 minutes** (configurable — click the timer to change).
- Press **Play** to start countdown, **Pause** to stop.
- Timer is visible on all player screens.
- The game does **NOT auto-end** when the timer hits zero. The teacher manually ends it.

### End Game / Resume Game
- **End Game** freezes the entire game. All player actions are blocked. Screens show a "Game Over" overlay with final standings.
- **Resume Game** unfreezes and lets play continue.

### Reset Game
- Resets **everything** back to the starting state: all wealth, raw materials, tech levels, FDI links, market orders, event logs, sabotage effects, and member roles.
- Requires **double-click** to confirm (safety measure).

### Foreign Direct Investment (FDI)
- The teacher selects a **Core team** (investor) and a **Periphery team** (recipient).
- The recipient gets **+1 tech level** (enabling them to manufacture).
- **Permanently**, 50% of that Periphery team's manufacturing profits go to the Core investor.
- Only Periphery teams without an existing FDI investor are eligible.
- **This is the central mechanic of the game.** Announce it dramatically.

### Debt Crisis
- **Instantly halves the wealth of ALL Periphery teams.**
- Requires double-click to confirm.
- Use this mid-game to simulate real-world economic shocks.
- Announce it to the class so they understand what happened.

### Role Rotation
- Under the **Members** panel, the teacher can **rotate roles** for any team.
- This shifts everyone's role one position forward (Miner → Manufacturer → Saboteur → Treasurer → Miner...).
- Use this periodically so every student experiences different roles.

### Leaderboard
- Shows all 10 teams ranked by wealth.
- Displays wealth, raw materials, tech level, and tier.
- Updates in real-time via Server-Sent Events.

### Activity Feed
- Live log of every game event: mining, manufacturing, trades, sabotage, FDI, debt crisis, etc.
- Use this to narrate what's happening to the class.

---

## How to Run a Game Session

### Before Class

1. Start the server (either via Docker on the SBC, or `npm run dev` on a laptop).
2. Open `http://<server-ip>:3000/admin` on the projector.
3. Make sure all 10 teams can reach `http://<server-ip>:3000/play` on their phones.
4. If reusing from a previous session, click **Reset Game** on the admin dashboard.

### Phase 1 — Setup (5 minutes)

1. Divide the class into **10 groups**.
2. Assign each group a number (Group 1–10). Tell them their tier:
   - Groups 1–2: "You are **Core nations** — wealthy, industrialized, but you have no raw materials."
   - Groups 3–5: "You are **Semi-Periphery nations** — middle-income with some resources and basic technology."
   - Groups 6–10: "You are **Periphery nations** — resource-rich but poor, with no technology."
3. Have each group open the game on their phone(s), select their team, and enter their names.
4. Briefly explain what each role does (or let them discover it).

### Phase 2 — Free Play Round 1 (5–7 minutes)

1. Start the timer from the admin dashboard.
2. Let teams play freely: mine, manufacture, trade on the market.
3. **Do NOT trigger any events yet.** Let them discover the market dynamics naturally.
4. Core teams will quickly realize they need raw materials and must buy from the market.
5. Periphery teams will realize they can only mine and sell — they can't manufacture.

**Facilitator narration ideas:**
- "Core nations, how are you getting raw materials? You have to buy them."
- "Periphery nations, are you getting good prices for your resources?"
- "Notice how wealth is concentrating at the top..."

### Phase 3 — FDI Event (mid-game)

1. Pause and announce: "A Core nation is offering Foreign Direct Investment to a Periphery nation!"
2. On the admin dashboard, select a Core team and a Periphery team. Click **Apply FDI**.
3. Explain to the class: "This gives the Periphery team technology to manufacture. But 50% of every dollar they earn from manufacturing goes to the Core investor. Forever."
4. Let them play for a few more minutes. Watch the FDI tax accumulate.

**Discussion prompt:** "Is this a fair deal? The Periphery team can now manufacture, but half their profits leave the country."

### Phase 4 — Debt Crisis (mid-to-late game)

1. Announce dramatically: "BREAKING NEWS — Global financial crisis! All Periphery nations' wealth has been halved!"
2. Trigger **Debt Crisis** from the admin panel.
3. Watch Periphery teams react. Their already-low wealth is cut in half.

**Discussion prompt:** "Who was hurt the most? Who wasn't affected at all?"

### Phase 5 — Sabotage Phase (if time allows)

- By this point, Saboteurs should be active. Let them embargo rivals, attempt espionage, or call strikes.
- If a Periphery team with FDI has been pushed to $20 or below (possibly by the debt crisis), they can attempt a **Revolution** to break free from FDI.
- Narrate sabotage events from the activity feed: "Group 6 just called a worker strike against their Core investor!"

### Phase 6 — End Game

1. When time is up (or when you're ready), click **End Game** on the admin dashboard.
2. All screens freeze and show final standings.
3. The leaderboard on the projector shows the final wealth ranking.

---

## Post-Game Discussion Guide

### Key Questions

1. **Wealth gap:** "Look at the final leaderboard. How much wealth does the richest team have vs. the poorest? How does this compare to the real world?"

2. **Structural inequality:** "Periphery teams started with lots of raw materials but couldn't turn them into money. Why? What real-world countries face this problem?"

3. **FDI trade-off:** "Teams that received FDI — was it worth it? You gained technology, but you gave up 50% of your profits forever. Is this what happens with multinational corporations in developing countries?"

4. **Market dynamics:** "Who controlled the prices on the market? Did Periphery teams have bargaining power, or did they have to accept whatever Core teams offered?"

5. **Sabotage as resistance:** "Did any team use strikes or revolution? What were the consequences? In real life, what happens when developing nations try to nationalize industries or break from foreign investors?"

6. **Debt crisis:** "When the debt crisis hit, why were Periphery teams devastated while Core teams were fine? What does this tell us about global financial shocks?"

### Connecting to Theory

| Game Mechanic | Real-World Concept | Theory |
|---|---|---|
| Core has technology, Periphery has resources | International division of labor | World Systems Theory |
| FDI gives tech but extracts 50% forever | Multinational profit repatriation | Dependency Theory |
| Tech level determines who can manufacture | Industrialization gap | Modernization Theory |
| Debt crisis halves Periphery wealth | 1980s Third World debt crisis | Dependency Theory |
| Embargo blocks trade | Economic sanctions, trade wars | World Systems Theory |
| Revolution breaks FDI but costs everything | Nationalization, decolonization movements | Dependency Theory |
| Espionage steals technology | Industrial espionage, technology transfer | Modernization Theory |
| Market prices favor Core buyers | Unequal terms of trade | World Systems Theory |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Students can't connect | Make sure they're on the same Wi-Fi. Try `http://<ip>:3000` not `https`. |
| Page won't load | Refresh the page. Check the server is running. |
| "Game is frozen" error | The teacher has ended the game. Click **Resume Game** on admin. |
| Student lost their role / got disconnected | Re-enter the game with the same name. If the role is wrong, teacher can rotate roles. |
| Market order stuck | The seller can cancel it from the market panel to get materials back. |
| Want to start over | Click **Reset Game** on the admin dashboard (double-click to confirm). |
| Timer ran out but game didn't stop | By design — the teacher manually ends the game when ready. |

---

## Quick Reference Card (Print for Each Team)

```
THE GLOBAL ECONOMY SIMULATION
==============================

YOUR GOAL: Accumulate as much wealth as possible.

ACTIONS:
  Mine        → +1 raw material (Periphery/Semi-P only)
  Manufacture → Convert 1 material into money (need tech >= 1)
  Sell        → List materials on the market
  Buy         → Purchase materials from the market
  Sabotage    → Disrupt other teams (Saboteur role only)

TIER ABILITIES:
  Core:          Manufacture (+$50), no mining
  Semi-Periphery: Mine (5s) + Manufacture (+$30)
  Periphery:     Mine (3s), manufacture only with tech >= 1

FDI WARNING: If your team accepts FDI, you get +1 tech
  but 50% of ALL manufacturing profit goes to the
  Core investor. PERMANENTLY.

SABOTAGE OPTIONS:
  Embargo    → Block target's market access for 60s (costs $50)
  Espionage  → 40% chance to steal +1 tech (fail = $40 fine)
  Strike     → Halt own production 30s, Core investor loses $30
  Revolution → Break FDI link (requires wealth <= $20, resets tech)
```
