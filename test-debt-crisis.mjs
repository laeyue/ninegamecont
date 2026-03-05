/**
 * Test concurrent debt crisis race condition
 */
async function main() {
    const baseUrl = "http://localhost:3000";

    console.log("Resetting game...");
    await fetch(`${baseUrl}/api/game/reset`, { method: "POST" });
    await fetch(`${baseUrl}/api/game/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timerRunning: true }),
    });

    const teamsRes = await fetch(`${baseUrl}/api/teams`);
    const teamsData = await teamsRes.json();
    const peripheryTeam = teamsData.data.find(t => t.tier === "PERIPHERY");
    console.log(`Initial Wealth of Periphery (${peripheryTeam.name}): $${peripheryTeam.wealth}`);

    console.log("Executing 10 Concurrent Debt Crises...");
    const promises = Array.from({ length: 10 }).map(() =>
        fetch(`${baseUrl}/api/events/debt-crisis`, { method: "POST" })
            .then(async r => {
                const json = await r.json();
                return { status: r.status, success: json.success, error: json.error };
            })
    );

    const results = await Promise.all(promises);
    console.log("Results: ", results);

    const teamsResAfter = await fetch(`${baseUrl}/api/teams`);
    const teamsDataAfter = await teamsResAfter.json();
    const peripheryTeamAfter = teamsDataAfter.data.find(t => t.id === peripheryTeam.id);

    console.log(`Final Wealth of Periphery: $${peripheryTeamAfter.wealth}`);
}

main().catch(console.error);
