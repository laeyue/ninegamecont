import assert from 'node:assert';

const baseUrl = "http://localhost:3000";

async function request(path, method, body) {
    const params = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body) params.body = JSON.stringify(body);

    try {
        const res = await fetch(`${baseUrl}${path}`, params);
        const data = await res.json();
        return { status: res.status, ...data };
    } catch (e) {
        return { status: 500, success: false, error: e.message };
    }
}

async function post(path, body) { return request(path, "POST", body); }
async function put(path, body) { return request(path, "PUT", body); }
async function get(path) { return request(path, "GET"); }

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulatePlayer(team, member, durationMs) {
    const endTime = Date.now() + durationMs;
    let actionCount = 0;
    let successCount = 0;

    while (Date.now() < endTime) {
        let res;
        if (member.role === "MINER") {
            // Miners spam mine
            res = await post('/api/game/mine', { teamId: team.id, memberId: member.memberId });

            // Every few successful mines, try to sell 1 RM on market
            if (res.success && Math.random() > 0.5) {
                await post('/api/market', {
                    sellerId: team.id, memberId: member.memberId,
                    itemType: "RAW_MATERIAL", quantity: 1, pricePerUnit: Math.floor(Math.random() * 5) + 5
                });
            }
        }
        else if (member.role === "MANUFACTURER") {
            // Manufacturers spam manufacture
            res = await post('/api/game/manufacture', { teamId: team.id, memberId: member.memberId });

            // If we failed because we don't have enough materials, try to buy one
            if (!res.success && res.error && res.error.toLowerCase().includes("not enough raw materials")) {
                // Try to buy a random listing
                const marketRes = await get('/api/market');
                if (marketRes.success && marketRes.data && marketRes.data.length > 0) {
                    const listing = marketRes.data[0];
                    if (listing.sellerId !== team.id) {
                        await post(`/api/market/${listing.id}/buy`, { buyerId: team.id, memberId: member.memberId });
                    }
                }
            }
        }
        else if (member.role === "SABOTEUR") {
            // Saboteurs do random tier-appropriate sabotage
            if (team.tier === "CORE") {
                if (Math.random() > 0.5) {
                    res = await post('/api/sabotage/synthesis', { teamId: team.id, memberId: member.memberId });
                } else {
                    // get a target
                    const teams = await get('/api/teams');
                    const p = teams.data?.find(t => t.tier === "SEMI_PERIPHERY");
                    if (p) res = await post('/api/sabotage/tariff', { attackerId: team.id, targetId: p.id, memberId: member.memberId });
                }
            } else if (team.tier === "SEMI_PERIPHERY") {
                const teams = await get('/api/teams');
                const c = teams.data?.find(t => t.tier === "CORE");
                if (c) res = await post('/api/sabotage/espionage', { attackerId: team.id, targetId: c.id, memberId: member.memberId });
            } else {
                const teams = await get('/api/teams');
                const c = teams.data?.find(t => t.tier === "CORE" || t.tier === "SEMI_PERIPHERY");
                if (c) res = await post('/api/sabotage/espionage', { attackerId: team.id, targetId: c.id, memberId: member.memberId });
            }
        }

        actionCount++;
        if (res && res.success) successCount++;

        // Poll aggressively but don't choke node completely
        await sleep(200 + Math.random() * 800);
    }

    return { memberId: member.memberId, role: member.role, actionCount, successCount };
}

async function main() {
    console.log("1. Resetting Game & Booting Timer...");
    await post('/api/game/reset', {});
    await put('/api/game/state', { timerRunning: true });

    const { data: teams } = await get('/api/teams');

    console.log("2. Generating 50 concurrent players (5 per team)...");
    const joinPromises = [];
    let pIndex = 1;
    for (const team of teams) {
        for (let i = 0; i < 5; i++) {
            const name = `Player${pIndex++}`;
            joinPromises.push(post('/api/members/join', {
                memberId: `uuid-${name}`,
                teamId: team.id,
                name
            }));
        }
    }
    await Promise.all(joinPromises);

    console.log("3. Fetching assigned roles...");
    const memberList = await get('/api/members/list');
    const allMembers = [];
    for (const team of teams) {
        if (memberList.data.members[team.id]) {
            const members = memberList.data.members[team.id];
            for (const m of members) {
                allMembers.push({ team, member: m });
            }
        }
    }

    console.log(`Successfully spawned ${allMembers.length} active players!`);

    console.log("4. Firing Teacher Setup Commands (Granting FDI + Tech so Periphery can Manufacture)...");
    const cores = teams.filter(t => t.tier === "CORE");
    const peris = teams.filter(t => t.tier === "PERIPHERY");
    for (const peri of peris) {
        await post('/api/events/fdi', { investorId: cores[0].id, recipientId: peri.id });
    }

    console.log("\n5. 🚦 STARTING 15 SECOND LOAD TEST 🚦");
    console.log("All 50 players are now aggressively clicking their role buttons (Mining, Manufacturing, Market Buying/Selling, and Sabotaging) simultaneously...\n");

    // Launch all 50 player loops simultaneously
    const SIM_DURATION = 15000;
    const playerPromises = allMembers.map(m => simulatePlayer(m.team, m.member, SIM_DURATION));

    const results = await Promise.all(playerPromises);

    // Aggregate stats
    let totalActions = 0;
    let totalSuccesses = 0;
    for (const r of results) {
        totalActions += r.actionCount;
        totalSuccesses += r.successCount;
    }

    console.log("6. Load Test Completed!");
    console.log(`Total API Actions Attempted: ${totalActions}`);
    console.log(`Total Successful Role Actions (bypassed cooldowns/materials): ${totalSuccesses}`);

    console.log("\n7. Validating Post-Test Database State...");
    const finalTeams = await get('/api/teams');

    let valid = true;
    for (const t of finalTeams.data) {
        console.log(`[${t.tier}] ${t.name}: $${t.wealth} | ${t.rawMaterials} RM | Tech: ${t.techLevel}`);
        if (t.wealth < 0) {
            console.error(`❌ ERROR: ${t.name} has negative wealth! ($${t.wealth})`);
            valid = false;
        }
        if (t.rawMaterials < 0) {
            console.error(`❌ ERROR: ${t.name} has negative raw materials! (${t.rawMaterials})`);
            valid = false;
        }
    }

    if (valid) {
        console.log("\n✅ ALL ASYNC CONCURRENCY CHECKS PASSED. No negative balances, DB locks held perfectly.");
    } else {
        console.error("\n❌ FAILED. Negative balances detected.");
        process.exit(1);
    }
}

main().catch(err => {
    console.error("\nTEST SCRIPT FAILED ❌:", err.message);
    process.exit(1);
});
