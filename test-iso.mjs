import assert from 'node:assert';

const baseUrl = "http://localhost:3000";

async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.status >= 500) throw new Error(`Server error on ${path}: ${res.status}`);
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

    const { data: teams } = await get('/api/teams');
    const core = teams.find(t => t.tier === "CORE");

    const users = {
        coreMan: { memberId: "c1", teamId: core.id, name: "CoreMan" },
        coreSab: { memberId: "c2", teamId: core.id, name: "CoreSab" },
    };

    for (const u of Object.values(users)) {
        await post('/api/members/join', u);
    }

    await new Promise(r => setTimeout(r, 500));

    console.log("5. Testing Core Synthesis & Manufacture...");
    let res = await post('/api/game/manufacture', { teamId: core.id, memberId: users.coreMan.memberId });
    assert(res.success === false, "Core manufacture should fail (0 RM)");
    console.log("Manufacture 1 Error:", res.error);

    res = await post('/api/sabotage/synthesis', { teamId: core.id, memberId: users.coreSab.memberId });
    assert(res.success === true, "Core synthesis should succeed");
    console.log("Synthesis Response:", res.data.message);

    res = await post('/api/game/manufacture', { teamId: core.id, memberId: users.coreMan.memberId });
    console.log("Manufacture 2 Error:", res.error);

}

main().catch(err => {
    console.error("\nTEST FAILED ❌:", err.message);
    process.exit(1);
});
