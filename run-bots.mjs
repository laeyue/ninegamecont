import { setTimeout } from 'timers/promises';

const baseUrl = "http://localhost:3000";

// Mirror the server cooldowns exactly (from game-config.ts)
const MINE_COOLDOWN = {
    PERIPHERY: 2000,
    SEMI_PERIPHERY: 6000,
};
const MANUFACTURE_COOLDOWN = {
    CORE: 6000,
    SEMI_PERIPHERY: 10000,
    PERIPHERY: 8000,
};
const SABOTAGE_COOLDOWN = 15000; // Synthesis=10s server + buffer, Espionage has its own

async function request(path, method = "GET", body = null) {
    const params = { method, headers: { "Content-Type": "application/json" } };
    if (body) params.body = JSON.stringify(body);
    try {
        const res = await fetch(`${baseUrl}${path}`, params);
        return res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function getTeams() {
    const res = await request('/api/teams');
    return res.success ? res.data : [];
}

async function getMarket() {
    const res = await request('/api/market');
    return res.success ? res.data : [];
}

async function main() {
    console.log("🤖 Booting up AI Bot Server...");
    const teams = await getTeams();
    if (teams.length === 0) {
        console.error("No teams found. Is the server running?");
        return;
    }

    const bots = [];

    console.log(`🤖 Spawning 7 bots each for ${teams.length} teams (${teams.length * 7} total)...`);

    for (const team of teams) {
        for (let i = 1; i <= 7; i++) {
            const memberId = `bot-${team.id}-${i}`;
            const name = `${team.name} Bot ${i}`;
            const res = await request('/api/members/join', 'POST', { memberId, teamId: team.id, name });
            if (res.success && res.data.member) {
                bots.push({
                    memberId, name,
                    teamId: team.id,
                    role: res.data.member.role,
                    tier: team.tier
                });
            }
        }
    }

    console.log(`✅ Started ${bots.length} background bots. They will now play the game autonomously.`);
    console.log("🎮 Open http://localhost:3000 in your browser and start trading with them!\n");

    // ---- Individual concurrent loops per bot, respecting cooldowns ----

    async function runMinerLoop(bot) {
        const cooldown = MINE_COOLDOWN[bot.tier] ?? 5000;
        while (true) {
            // Wait for game to be active
            const stateRes = await request('/api/game/state');
            if (!stateRes.success || stateRes.data.gameFrozen) {
                await setTimeout(3000);
                continue;
            }

            // Mine (respecting cooldown by sleeping the exact duration)
            const mineRes = await request('/api/game/mine', 'POST', { teamId: bot.teamId, memberId: bot.memberId });
            if (mineRes.success) {
                console.log(`⛏️  [${bot.name}] Mined raw materials!`);
            }

            // Occasionally list on market
            const activeTeams = await getTeams();
            const teamState = activeTeams.find(t => t.id === bot.teamId);
            if (teamState && teamState.rawMaterials > 3 && Math.random() > 0.4) {
                const price = Math.floor(Math.random() * 8) + 12;
                const sellRes = await request('/api/market', 'POST', {
                    sellerId: bot.teamId, memberId: bot.memberId,
                    itemType: "RAW_MATERIAL", quantity: 1, pricePerUnit: price
                });
                if (sellRes.success) {
                    console.log(`📦 [${bot.name}] Listed 1 RM on market for $${price}`);
                }
            }

            // Sleep for exact cooldown + tiny jitter
            await setTimeout(cooldown + Math.random() * 500);
        }
    }

    async function runManufacturerLoop(bot) {
        const cooldown = MANUFACTURE_COOLDOWN[bot.tier] ?? 6000;
        while (true) {
            const stateRes = await request('/api/game/state');
            if (!stateRes.success || stateRes.data.gameFrozen) {
                await setTimeout(3000);
                continue;
            }

            const activeTeams = await getTeams();
            const teamState = activeTeams.find(t => t.id === bot.teamId);
            if (!teamState) { await setTimeout(2000); continue; }

            // Only manufacture if tier allows it
            if (teamState.tier === "CORE" || teamState.tier === "SEMI_PERIPHERY" || teamState.techLevel > 0) {
                const res = await request('/api/game/manufacture', 'POST', { teamId: bot.teamId, memberId: bot.memberId });
                if (res.success) {
                    console.log(`🏭 [${bot.name}] Manufactured consumer goods!`);
                }

                // If failed due to no materials, try buying from market
                if (!res.success && res.error && res.error.includes("materials") && teamState.wealth > 20) {
                    const market = await getMarket();
                    const available = market.filter(m => m.sellerId !== bot.teamId && m.itemType === "RAW_MATERIAL");
                    if (available.length > 0) {
                        const cheapest = available.sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];
                        const buyRes = await request(`/api/market/${cheapest.id}/buy`, 'POST', { buyerId: bot.teamId, memberId: bot.memberId });
                        if (buyRes.success) {
                            console.log(`💵 [${bot.name}] Bought RM from Market for $${cheapest.pricePerUnit}`);
                        }
                    }
                }
            }

            // Sleep for exact cooldown + tiny jitter
            await setTimeout(cooldown + Math.random() * 500);
        }
    }

    async function runSaboteurLoop(bot) {
        while (true) {
            const stateRes = await request('/api/game/state');
            if (!stateRes.success || stateRes.data.gameFrozen) {
                await setTimeout(3000);
                continue;
            }

            const activeTeams = await getTeams();
            const teamState = activeTeams.find(t => t.id === bot.teamId);
            if (!teamState) { await setTimeout(3000); continue; }

            try {
                if (bot.tier === "CORE") {
                    // Core abilities: FDI Proposal, Tariff, Embargo
                    const roll = Math.random();
                    if (roll < 0.33) {
                        // FDI Proposal to a random eligible Periphery team
                        const fdiTargets = activeTeams.filter(t => (t.tier === "PERIPHERY" || t.tier === "SEMI_PERIPHERY") && !t.fdiInvestorId);
                        if (fdiTargets.length > 0) {
                            const target = fdiTargets[Math.floor(Math.random() * fdiTargets.length)];
                            const res = await request('/api/sabotage/fdi-proposal', 'POST', { investorId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                            if (res.success) console.log(`🤝 [${bot.name}] Proposed FDI to ${target.name}!`);
                        }
                    } else if (roll < 0.66) {
                        // Tariff on a random non-Core team
                        const targets = activeTeams.filter(t => t.tier !== "CORE");
                        if (targets.length > 0) {
                            const target = targets[Math.floor(Math.random() * targets.length)];
                            const res = await request('/api/sabotage/tariff', 'POST', { attackerId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                            if (res.success) console.log(`🏛️  [${bot.name}] Imposed TARIFF on ${target.name}!`);
                        }
                    } else {
                        // Embargo on a random non-Core team
                        const targets = activeTeams.filter(t => t.tier !== "CORE");
                        if (targets.length > 0) {
                            const target = targets[Math.floor(Math.random() * targets.length)];
                            const res = await request('/api/sabotage/embargo', 'POST', { attackerId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                            if (res.success) console.log(`🚫 [${bot.name}] Embargoed ${target.name}!`);
                        }
                    }
                } else if (bot.tier === "SEMI_PERIPHERY") {
                    // Semi abilities: Espionage, Embargo
                    if (Math.random() < 0.6) {
                        // Espionage against Core
                        const cores = activeTeams.filter(t => t.tier === "CORE");
                        if (cores.length > 0) {
                            const target = cores[Math.floor(Math.random() * cores.length)];
                            const res = await request('/api/sabotage/espionage', 'POST', { attackerId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                            if (res.success) console.log(`🕵️  [${bot.name}] Stole tech from ${target.name}!`);
                        }
                    } else {
                        // Embargo against a rival
                        const rivals = activeTeams.filter(t => t.id !== bot.teamId);
                        if (rivals.length > 0) {
                            const target = rivals[Math.floor(Math.random() * rivals.length)];
                            const res = await request('/api/sabotage/embargo', 'POST', { attackerId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                            if (res.success) console.log(`🚫 [${bot.name}] Embargoed ${target.name}!`);
                        }
                    }
                } else if (bot.tier === "PERIPHERY") {
                    // Periphery abilities: Espionage, Strike (with FDI), Revolution (with FDI + broke)
                    if (teamState.fdiInvestorId) {
                        // Under FDI — decide between Strike, Espionage, or Revolution
                        const roll = Math.random();
                        if (roll < 0.15) {
                            // Revolution — break free from FDI (costs half wealth + loses tech)
                            const res = await request('/api/sabotage/revolution', 'POST', { teamId: bot.teamId, memberId: bot.memberId });
                            if (res.success) console.log(`🔥 [${bot.name}] REVOLUTION! Kicked out the foreign investor!`);
                        } else if (roll < 0.55) {
                            // Strike to hurt investor
                            const res = await request('/api/sabotage/strike', 'POST', { teamId: bot.teamId, memberId: bot.memberId });
                            if (res.success) console.log(`✊ [${bot.name}] Worker Strike! (-$50 to investor)`);
                        } else {
                            // Espionage to steal more tech
                            const cores = activeTeams.filter(t => t.tier === "CORE");
                            if (cores.length > 0) {
                                const target = cores[Math.floor(Math.random() * cores.length)];
                                const res = await request('/api/sabotage/espionage', 'POST', { attackerId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                                if (res.success) console.log(`🕵️  [${bot.name}] Stole tech from ${target.name}!`);
                            }
                        }
                    } else {
                        // No FDI — espionage to steal tech and self-industrialize
                        const cores = activeTeams.filter(t => t.tier === "CORE");
                        if (cores.length > 0) {
                            const target = cores[Math.floor(Math.random() * cores.length)];
                            const res = await request('/api/sabotage/espionage', 'POST', { attackerId: bot.teamId, targetId: target.id, memberId: bot.memberId });
                            if (res.success) console.log(`🕵️  [${bot.name}] Stole tech from ${target.name}!`);
                        }
                    }
                }
            } catch (e) {
                // ignore
            }

            // Respect the 15s server sabotage cooldown + small buffer
            await setTimeout(SABOTAGE_COOLDOWN + Math.random() * 3000);
        }
    }

    // FDI auto-vote loop — all Periphery bots check for pending proposals
    async function runFdiVotePoller(bot) {
        while (true) {
            await setTimeout(5000 + Math.random() * 3000); // Check every 5-8s
            try {
                // Vote on any pending FDI proposal for our team
                // 60% chance to accept — represents willingness to industrialize
                const accept = Math.random() < 0.6;
                const res = await request('/api/sabotage/fdi-vote', 'POST', {
                    teamId: bot.teamId,
                    memberId: bot.memberId,
                    accept
                });
                if (res.success) {
                    console.log(`🗳️  [${bot.name}] Voted ${accept ? "YES ✅" : "NO ❌"} on FDI proposal`);
                }
            } catch {
                // no pending proposal or already voted — ignore
            }
        }
    }

    // Dispatch each bot to its role-specific loop
    const loops = bots.map(bot => {
        const tasks = [];

        if (bot.role === "MINER" && (bot.tier === "PERIPHERY" || bot.tier === "SEMI_PERIPHERY")) {
            tasks.push(runMinerLoop(bot));
        } else if (bot.role === "MANUFACTURER") {
            tasks.push(runManufacturerLoop(bot));
        } else if (bot.role === "SABOTEUR") {
            tasks.push(runSaboteurLoop(bot));
        }

        // All Periphery and Semi-Periphery bots also run the FDI vote poller
        if (bot.tier === "PERIPHERY" || bot.tier === "SEMI_PERIPHERY") {
            tasks.push(runFdiVotePoller(bot));
        }

        return Promise.all(tasks);
    });

    await Promise.all(loops);
}

main().catch(console.error);
