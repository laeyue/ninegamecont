import { setTimeout } from 'timers/promises';

const baseUrl = "http://localhost:3000";

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

async function verify() {
    console.log("⏳ Waiting for server to boot...");
    let up = false;
    for (let i = 0; i < 20; i++) {
        try {
            await fetch(baseUrl + '/api/teams');
            up = true;
            break;
        } catch (e) { }
        await setTimeout(1000);
    }
    if (!up) { console.error("Server down."); return; }

    console.log("🔄 Resetting game...");
    await request("/api/game/reset", "POST");
    await setTimeout(1000);

    console.log("🤖 Spawning Verification Bots...");
    const teams = await getTeams();
    const bots = [];
    for (const team of teams) {
        for (let i = 1; i <= 3; i++) {
            const memberId = `bot-${team.id}-${i}`;
            const name = `${team.name} Bot ${i}`;
            const res = await request('/api/members/join', 'POST', { memberId, teamId: team.id, name });
            if (res.success && res.data.member) {
                bots.push({ memberId, teamId: team.id, role: res.data.member.role, tier: team.tier });
            }
        }
    }

    // Bot brains
    async function runBotLoop(bot) {
        while (!shutdown) {
            await setTimeout(1000 + Math.random() * 2000);
            const activeTeams = await getTeams();
            const teamState = activeTeams.find(t => t.id === bot.teamId);
            if (!teamState) continue;

            if (bot.role === "MINER" && (teamState.tier === "PERIPHERY" || teamState.tier === "SEMI_PERIPHERY")) {
                await request('/api/game/mine', 'POST', { teamId: bot.teamId, memberId: bot.memberId });
                if (teamState.rawMaterials > 3 && Math.random() > 0.5) {
                    await request('/api/market', 'POST', {
                        sellerId: bot.teamId, memberId: bot.memberId,
                        itemType: "RAW_MATERIAL", quantity: 1, pricePerUnit: 15
                    });
                }
            } else if (bot.role === "MANUFACTURER" && (teamState.tier === "CORE" || teamState.tier === "SEMI_PERIPHERY" || teamState.techLevel > 0)) {
                await request('/api/game/manufacture', 'POST', { teamId: bot.teamId, memberId: bot.memberId });
            }
        }
    }

    let shutdown = false;
    Promise.all(bots.map(bot => runBotLoop(bot)));

    console.log("▶️ Unfreezing game so bots can play...");
    await request("/api/game/state", "PUT", { timerRunning: true, gameFrozen: false });

    // Track for 30 seconds
    console.log("📈 Monitoring simulation for 30 seconds...");
    for (let i = 1; i <= 6; i++) {
        await setTimeout(5000); // Wait 5 seconds
        const currentTeams = await getTeams();
        const core = currentTeams.filter(t => t.tier === "CORE").reduce((a, b) => a + b.wealth, 0) / 2;
        const semi = currentTeams.filter(t => t.tier === "SEMI_PERIPHERY").reduce((a, b) => a + b.wealth, 0) / 3;
        const peri = currentTeams.filter(t => t.tier === "PERIPHERY").reduce((a, b) => a + b.wealth, 0) / 5;
        console.log(`[T=${i * 5}s] - Core Avg: $${core.toFixed(0)} | Semi Avg: $${semi.toFixed(0)} | Peri Avg: $${peri.toFixed(0)}`);
    }

    shutdown = true;
    const finalTeams = await getTeams();
    console.log("\n🏆 FINAL SCOREBOARD:");
    const sorted = finalTeams.sort((a, b) => b.wealth - a.wealth);
    for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        console.log(`${i + 1}. [${t.tier.padEnd(14)}] ${t.name}: $${t.wealth}`);
    }

    // Cleanup
    await request("/api/game/state", "PUT", { gameFrozen: true });
    process.exit(0);
}

verify().catch(console.error);
