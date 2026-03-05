import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

const baseUrl = "http://localhost:3000";

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
    console.log("Waiting for Dev Server to boot (max 15s)...");

    let up = false;
    for (let i = 0; i < 15; i++) {
        try {
            const res = await fetch(`${baseUrl}/api/teams`);
            if (res.ok) {
                up = true;
                break;
            }
        } catch (e) {
            // ignore
        }
        await setTimeout(1000);
    }

    if (!up) {
        throw new Error("Dev server did not start in time. Check logs.");
    }

    console.log("Dev Server is UP! Resetting Game...");
    await post('/api/game/reset', {});

    console.log("Fetching Teams...");
    const { data: teams } = await get('/api/teams');

    // Find Group 10
    const group10 = teams.find(t => t.tier === "PERIPHERY" && t.name === "Group 10")
        || teams.find(t => t.tier === "PERIPHERY"); // fallback

    console.log(`Found Periphery Team: ${group10.name} (${group10.id})`);

    console.log("\nJoining 2 players to Group 10...");
    const p1Res = await post('/api/members/join', { memberId: "player1-uuid", teamId: group10.id, name: "Alice (P1)" });
    const p2Res = await post('/api/members/join', { memberId: "player2-uuid", teamId: group10.id, name: "Bob (P2)" });

    console.log("Join Results:");
    console.log(p1Res.data ? `Success: ${p1Res.data.member.name} assigned ${p1Res.data.member.role}` : p1Res.error);
    console.log(p2Res.data ? `Success: ${p2Res.data.member.name} assigned ${p2Res.data.member.role}` : p2Res.error);

    console.log("\nCurrent Members in Group 10:");
    const listMap = await get('/api/members/list');
    const members = listMap.data.members[group10.id] || [];
    members.forEach(m => console.log(`- ${m.name}: ${m.role}`));

    console.log("\nReady! The development server is running on http://localhost:3000");
}

main().catch(console.error);
