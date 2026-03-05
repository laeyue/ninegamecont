import assert from 'node:assert';

const baseUrl = "http://localhost:3000";

async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.status >= 500) throw new Error(`Server error on ${path}: ${data.error}`);
    return { status: res.status, ...data };
}

async function put(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, ...data };
}

async function get(path) {
    const res = await fetch(`${baseUrl}${path}`);
    const data = await res.json();
    return { status: res.status, ...data };
}

async function main() {
    console.log("1. Resetting Game...");
    await post('/api/game/reset', {});
    await put('/api/game/state', { timerRunning: true });

    console.log("2. Fetching Teams...");
    const { data: teams } = await get('/api/teams');
    const core = teams.find(t => t.tier === "CORE");
    const semi = teams.find(t => t.tier === "SEMI_PERIPHERY");
    const peri = teams.find(t => t.tier === "PERIPHERY");

    console.log("3. Joining Members...");
    const users = {
        coreMan: { memberId: "c1", teamId: core.id, name: "CoreMan" },
        coreSab: { memberId: "c2", teamId: core.id, name: "CoreSab" },
        semiMin: { memberId: "s1", teamId: semi.id, name: "SemiMin" },
        semiMan: { memberId: "s2", teamId: semi.id, name: "SemiMan" },
        semiSab: { memberId: "s3", teamId: semi.id, name: "SemiSab" },
        periMin: { memberId: "p1", teamId: peri.id, name: "PeriMin" },
        periMan: { memberId: "p2", teamId: peri.id, name: "PeriMan" },
        periSab: { memberId: "p3", teamId: peri.id, name: "PeriSab" },
    };

    for (const u of Object.values(users)) {
        await post('/api/members/join', u);
    }

    // Force a short delay so roles process
    await new Promise(r => setTimeout(r, 500));

    console.log("4. Testing Mining...");
    let res = await post('/api/game/mine', { teamId: peri.id, memberId: users.periMin.memberId });
    assert(res.success === true, "Peri should mine successfully");
    let periRawMaterials = res.data.team.rawMaterials;
    assert(periRawMaterials === 31, "Peri raw materials should be 31"); // starts at 30

    console.log("   Testing Mine Cooldown...");
    res = await post('/api/game/mine', { teamId: peri.id, memberId: users.periMin.memberId });
    assert(res.success === false && res.status === 429, "Peri mine should fail due to cooldown");

    console.log("5. Testing Core Synthesis & Manufacture...");
    res = await post('/api/game/manufacture', { teamId: core.id, memberId: users.coreMan.memberId });
    assert(res.success === false, "Core manufacture should fail (0 raw materials)");

    res = await post('/api/sabotage/synthesis', { teamId: core.id, memberId: users.coreSab.memberId });
    assert(res.success === true, "Core synthesis should succeed");

    res = await post('/api/game/manufacture', { teamId: core.id, memberId: users.coreMan.memberId });
    assert(res.success === true, "Core manufacture should succeed now");
    assert(res.data.team.wealth === 540, "Core wealth should be 540"); // 500 - 40 + 80

    console.log("6. Testing Market Escrow and Trades...");
    // Semi sells 1 RM for $10
    res = await post('/api/market', { sellerId: semi.id, memberId: users.semiMin.memberId, itemType: "RAW_MATERIAL", quantity: 1, pricePerUnit: 10 });
    assert(res.success === true, "Semi should create sell order");
    const orderId = res.data.id;

    // Core buys it
    res = await post(`/api/market/${orderId}/buy`, { buyerId: core.id, memberId: users.coreMan.memberId });
    assert(res.success === true, "Core should buy the order");

    console.log("7. Testing Core Tariff (Sabotage)...");
    res = await post('/api/sabotage/tariff', { attackerId: core.id, targetId: semi.id, memberId: users.coreSab.memberId });
    assert(res.success === true, "Core should impose tariff on Semi");

    console.log("8. Testing FDI & Recipient Tech Bump...");
    res = await post('/api/events/fdi', { investorId: core.id, recipientId: peri.id });
    assert(res.success === true, "FDI should succeed");

    console.log("9. Testing Periphery Strike (against Core FDI)...");
    res = await post('/api/sabotage/strike', { teamId: peri.id, memberId: users.periSab.memberId });
    assert(res.success === true, "Peri should strike");

    console.log("10. Testing Semi Espionage & Sabotage Cooldown...");
    res = await post('/api/sabotage/espionage', { attackerId: semi.id, targetId: core.id, memberId: users.semiSab.memberId });
    assert(res.success === true || res.success === false, "Espionage API call worked");

    res = await post('/api/sabotage/embargo', { attackerId: semi.id, targetId: peri.id, memberId: users.semiSab.memberId });
    assert(res.success === false, "Semi embargo should fail due to sabotage cooldown");

    console.log("11. Testing Debt Crises -> Revolution thresholds...");
    await post('/api/events/debt-crisis', {});
    await post('/api/events/debt-crisis', {});
    const { data: updatedTeams } = await get('/api/teams');
    const periState = updatedTeams.find(t => t.id === peri.id);
    console.log(`   Peri Wealth after 2x Crises: $${periState.wealth}`);
    assert(periState.wealth <= 20, "Peri wealth should be within Revolution threshold");

    res = await post('/api/sabotage/revolution', { teamId: peri.id, memberId: users.periSab.memberId });
    assert(res.success === false && res.status === 429, "Revolution should be blocked by prior Strike Cooldown!");

    console.log("\nALL FUNCTIONAL TESTS PASSED SUCCESSFULLY! ✅");
}

main().catch(err => {
    console.error("\nTEST FAILED ❌:", err.message);
    process.exit(1);
});
