import assert from 'node:assert';

const baseUrl = "http://localhost:3001";

async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return res.json();
}
async function get(path) {
    const res = await fetch(`${baseUrl}${path}`);
    return res.json();
}

async function main() {
    console.log("Resetting Game...");
    await post('/api/game/reset', {});

    const { data: teams } = await get('/api/teams');
    const core = teams.find(t => t.tier === "CORE");
    const peri = teams.find(t => t.tier === "PERIPHERY");

    console.log("\n--- TEST: JOIN PERIPHERY ---");
    const join = async (id, teamId) => await post('/api/members/join', { memberId: id, teamId, name: id });

    await join("p1", peri.id);
    await join("p2", peri.id);
    await join("p3", peri.id);
    await join("p4", peri.id);
    await join("p5", peri.id);
    await join("p6", peri.id);

    let listMap = await get('/api/members/list');
    let periMembers = listMap.data.members[peri.id];
    console.log(periMembers.map(m => `${m.name}: ${m.role}`));

    console.log("\n--- TEST: JOIN CORE ---");
    await join("c1", core.id);
    await join("c2", core.id);
    await join("c3", core.id);
    await join("c4", core.id);

    listMap = await get('/api/members/list');
    let coreMembers = listMap.data.members[core.id];
    console.log(coreMembers.map(m => `${m.name}: ${m.role}`));

    console.log("\n--- TEST: ROTATION PERIPHERY ---");
    await post('/api/members/rotate', { teamId: peri.id });
    listMap = await get('/api/members/list');
    periMembers = listMap.data.members[peri.id];
    console.log(periMembers.map(m => `${m.name}: ${m.role}`));

    console.log("\n--- TEST: SABOTEUR LEAVES ---");
    const saboteur = periMembers.find(m => m.role === "SABOTEUR");
    console.log(`Saboteur ${saboteur.name} leaves...`);
    await fetch(`${baseUrl}/api/members/leave`, {
        method: "POST", body: JSON.stringify({ memberId: saboteur.memberId })
    });

    listMap = await get('/api/members/list');
    console.log(listMap.data.members[peri.id].map(m => `${m.name}: ${m.role}`));

    console.log("New player joins...");
    await join("pNEW", peri.id);
    listMap = await get('/api/members/list');
    console.log(listMap.data.members[peri.id].map(m => `${m.name}: ${m.role}`));
}

main().catch(console.error);
