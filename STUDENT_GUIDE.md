# The Global Economy Simulation — Game Reference

## What Is This Game?

You are part of a team representing a country in a simplified global economy. Some countries start rich with advanced technology. Others start poor with only raw materials. Your goal: grow your country's wealth by trading, manufacturing, and making strategic decisions — while navigating the same inequalities that shape the real world.

This simulation demonstrates three theories from sociology and political science:
- **World Systems Theory** — The world is divided into Core, Semi-Periphery, and Periphery nations with structural advantages and disadvantages.
- **Dependency Theory** — Poor nations often depend on rich nations in ways that keep them poor.
- **Modernization Theory** — Technology and investment can help nations develop, but the path is not equal.

---

## The Three Tiers

There are 10 teams divided into three tiers. Each tier has different starting conditions and abilities.

### Core Nations (Groups 1–2)
- **Starting Wealth:** $500
- **Starting Raw Materials:** 0
- **Technology Level:** 3
- **Can Manufacture:** Yes (+$50 per cycle, 6s cooldown)
- **Can Mine:** No

Core nations are industrialized and wealthy but have no natural resources. They depend on buying raw materials from other nations to manufacture goods.

### Semi-Periphery Nations (Groups 3–5)
- **Starting Wealth:** $200
- **Starting Raw Materials:** 15
- **Technology Level:** 1
- **Can Manufacture:** Yes (+$35 per cycle, 10s cooldown)
- **Can Mine:** Yes (3 materials per mine, 6s cooldown, +$4 wealth per mine)

Semi-Periphery nations can both mine and manufacture, but at lower efficiency than Core nations. They occupy a middle ground and benefit from mining income.

### Periphery Nations (Groups 6–10)
- **Starting Wealth:** $100
- **Starting Raw Materials:** 30
- **Technology Level:** 0
- **Can Manufacture:** No (unless they receive Foreign Direct Investment or steal tech)
- **Can Mine:** Yes (3 materials per mine, 2s cooldown, +$5 wealth per mine)

Periphery nations are resource-rich but technology-poor. They start with the most raw materials and earn direct income from mining ($5 per mine = resource export revenue). They cannot manufacture goods until they gain technology through FDI or espionage.

---

## Roles

Each team member is assigned one of three roles when they join. Roles determine what actions you can perform.

| Role | What You Can Do |
|------|----------------|
| **Miner** | Mine raw materials + Sell on the market |
| **Manufacturer** | Manufacture goods + Buy from the market |
| **Saboteur** | Perform sabotage actions against other teams |

**Note:** Core teams have no Miner role (since they cannot mine). Core members are assigned either Manufacturer or Saboteur.

The teacher can **rotate roles** at any time, shifting everyone on a team to the next role in the cycle. This lets all members experience different parts of the economy.

---

## Actions

### Mining (Miner role only)

Miners extract raw materials from the ground. Each mine action produces **3 raw materials** AND earns direct wealth (resource export revenue).

| Tier | Cooldown | Wealth Bonus | Notes |
|------|----------|-------------|-------|
| Periphery | 2 seconds | +$5 per mine | Fastest miners — resource-rich nations |
| Semi-Periphery | 6 seconds | +$4 per mine | Moderate speed, moderate income |
| Core | Cannot mine | — | Must buy materials on the market |

### Manufacturing (Manufacturer role only)

Manufacturers convert raw materials into goods for profit. Each manufacture cycle consumes **1 raw material** and produces wealth. **Manufacturing output scales with technology level:**

| Tech Level | Output | Equivalent To |
|-----------|--------|--------------|
| Tech 1 | Tier default ($35 for Periphery/Semi-P) | Basic manufacturing |
| Tech 2 | $35 (Semi-Periphery level) | Intermediate factories |
| Tech 3 | $50 (Core level) | Advanced manufacturing |

| Tier | Base Profit | Cooldown | Requirements |
|------|------------|----------|--------------|
| Core | +$50 | 6 seconds | Must have raw materials (buy from market) |
| Semi-Periphery | +$35 | 10 seconds | Must have raw materials |
| Periphery | +$35 | 8 seconds | Only possible after receiving FDI or reaching tech ≥ 1 |

**FDI and Manufacturing:** If your team receives Foreign Direct Investment, **20% of your manufacturing profit** is automatically sent to the Core nation that invested in you. For Periphery, this is how you unlock manufacturing. For Semi-Periphery, this is a trade-off: you give up 20% of profits in exchange for +1 Tech Level (which increases your base factory output).

**Tech scaling:** A Periphery nation that reaches Tech Level 3 (through espionage) manufactures at the same $50 rate as Core!

### The Market (Miners sell, Manufacturers buy)

The market is where teams trade raw materials.

- **Selling:** Miners list raw materials at a price they choose. The materials are held in escrow (removed from your team immediately) until someone buys or you cancel.
- **Buying:** Manufacturers browse listings and buy at the listed price. The wealth is deducted from the buyer and given to the seller.
- **Cancelling:** Miners can cancel their own unsold listings. The materials are returned to the team.
- **You cannot buy your own team's listings.**

---

## Sabotage (Saboteur role only)

Saboteurs can disrupt other teams using special actions. Each sabotage action has a **15-second team cooldown** (your whole team must wait 15s before any sabotage, regardless of which action was used).

Not all tiers can use all sabotage actions:

### Trade Embargo
- **Who can use:** Core, Semi-Periphery
- **Cost:** $50
- **Effect:** Blocks the target team from buying OR selling on the market for **60 seconds**
- **Use it to:** Cut off a competitor's trade routes

### Espionage
- **Who can use:** Periphery, Semi-Periphery
- **Cost:** Free to attempt, but $25 fine on failure
- **Success rate:** 10%
- **Effect on success:** Steal +1 technology level from a higher-tech team
- **Effect on failure:** Pay $25 fine
- **Use it to:** Gamble on stealing technology from richer nations — rare but game-changing

### Foreign Direct Investment (FDI) Proposal
- **Who can use:** Core only
- **Cost:** Free (but comes with a **2-minute** cooldown for your entire team)
- **Effect:** Proposes investment in a Periphery or Semi-Periphery team. **All members of the target team vote** to accept or reject within 30 seconds. Majority wins.
- **If accepted:** Target gains +1 Tech Level & can manufacture (if they couldn't already), but 20% of manufacturing profits go to the Core investor
- **Use it to:** Establish a profitable partnership — but the target can fight back with Strikes and Revolution

### Worker Strike
- **Who can use:** Periphery only
- **Requires:** Must have a Foreign Direct Investment (FDI) link
- **Cost:** Free (the investor pays)
- **Effect:** Halts your own team's manufacturing for **30 seconds**. The Core investor loses **$50**.
- **Use it to:** Hurt the nation exploiting your labor

### Revolution
- **Who can use:** Periphery only
- **Requires:** Must have an FDI link
- **Cost:** Lose **half your current wealth** + technology resets to 0
- **Effect:** Permanently breaks the FDI link — no more profit sharing with the investor
- **Use it to:** Break free from foreign control and go independent

### Trade Tariff
- **Who can use:** Core only
- **Cost:** $40
- **Effect:** For **60 seconds**, the target team receives only **50% of proceeds** when they sell on the market
- **Use it to:** Undermine a competitor's export income

---

## Teacher-Controlled Events

The teacher can trigger special events from the admin dashboard.

### Foreign Direct Investment (Admin)
- The teacher can also propose FDI from the admin panel. The target team (Periphery or Semi-Periphery) still votes to accept or reject.

### Debt Crisis
- All Periphery teams instantly lose **half their wealth**.
- Simulates real-world structural adjustment and economic shocks that disproportionately affect developing nations.

### Game Freeze
- The teacher can freeze the game at any time. All actions are blocked. The timer pauses.
- Used for class discussion, announcements, or ending the game.

---

## How to Play (Step by Step)

1. **Connect** — Open the game URL on your phone's browser. You'll see the group selection screen.
2. **Pick your group** — Tap the group your teacher assigned you to.
3. **Enter your name** — Type your name so your team knows who you are.
4. **Wait** — You'll see a "Waiting for Game" screen until the teacher starts the game.
5. **Play your role** — Once the game starts, perform your role's actions:
   - **Miners:** Mine materials and list them on the market at a competitive price.
   - **Manufacturers:** Buy materials from the market and manufacture goods.
   - **Saboteurs:** Use sabotage actions strategically against other teams.
6. **Watch the timer** — The countdown is visible on your screen. When it runs out or the teacher freezes the game, trading stops.
7. **Check the leaderboard** — Wealth rankings update in real time on the projected admin dashboard.

---

## Tips for Each Tier

### If You're Core
- You have money and technology but no resources. You NEED the market.
- Buy raw materials cheaply, manufacture at $50 profit. You have the strongest economy — at first.
- Use Tariffs and Embargoes to control trade. Use FDI proposals to profit from Periphery manufacturing.
- FDI lets you passively earn 20% of Periphery's output — but watch out for Strikes (-$50!) and Revolutions.

### If You're Semi-Periphery
- You can do a bit of everything. Mine (+$4 wealth each time), manufacture (+$35), and trade.
- Your versatility is your advantage — you earn money two ways at once.
- Use Espionage to try stealing technology. Use Embargoes to block competitors.
- You're in the middle — you can ally with Core or help Periphery.

### If You're Periphery
- You start poor ($100) but resource-rich. Mining earns you $5 per mine PLUS raw materials to sell.
- Mine fast (2s cooldown) and sell materials at good prices to build wealth.
- If you get an FDI offer, your team votes — weigh the trade-off: tech access vs. giving up 20% of profits.
- **Steal tech through Espionage** — if you reach Tech 3, you manufacture at Core rates ($50)!
- Strikes cost the Core investor $50 each time. Revolution breaks the FDI link entirely (but costs half your wealth and all tech).

---

## Key Numbers at a Glance

| Stat | Core | Semi-Periphery | Periphery |
|------|------|----------------|-----------|
| Starting Wealth | $500 | $200 | $100 |
| Starting Materials | 0 | 15 | 30 |
| Tech Level | 3 | 1 | 0 |
| Mine Output | Cannot mine | 3 per mine | 3 per mine |
| Mine Wealth Bonus | — | +$4 | +$5 |
| Mine Cooldown | — | 6s | 2s |
| Manufacture Profit | +$50 | +$35 | +$35 (needs tech ≥ 1) |
| Manufacture Cooldown | 6s | 10s | 8s |
| FDI Tax on Manufacture | — | 20% to investor (if FDI) | 20% to investor (if FDI) |

| Sabotage Action | Available To | Cost | Cooldown |
|----------------|-------------|------|----------|
| FDI Proposal | Core only | Free | 2 minutes (team) |
| Tariff | Core only | $40 | 15s (team) |
| Embargo | Core, Semi-P | $50 | 15s (team) |
| Espionage | Periphery, Semi-P | $0 / $25 on fail | 15s (team) |
| Strike | Periphery (needs FDI) | $0 (investor loses $50) | 15s (team) |
| Revolution | Periphery (needs FDI) | Half wealth + tech reset | 15s (team) |
