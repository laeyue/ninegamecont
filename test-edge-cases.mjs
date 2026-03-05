/**
 * Comprehensive Edge Case Test
 * Tests: Mining, Manufacturing, FDI Voting, Sabotage, Cooldowns, Tech Scaling
 * Run: node test-edge-cases.mjs
 * Requires: Server running on localhost:3000
 */

const BASE = "http://localhost:3000";
let passed = 0, failed = 0;

async function req(path, method = "GET", body = null) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    return res.json();
}

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${label}`);
        failed++;
    }
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.log("🔄 Resetting game...");
    await req("/api/game/reset", "POST");

    // Fetch teams
    const teams = (await req("/api/teams")).data;
    const core = teams.find(t => t.tier === "CORE");
    const semiP = teams.find(t => t.tier === "SEMI_PERIPHERY");
    const periph = teams.find(t => t.tier === "PERIPHERY");

    console.log(`Core: ${core.name} | Semi-P: ${semiP.name} | Periphery: ${periph.name}`);

    // Join members to each team
    console.log("\n📝 Joining members...");
    // Core: 2 members (Manufacturer + Saboteur)
    await req("/api/members/join", "POST", { memberId: "c1", teamId: core.id, name: "Core-Mfg" });
    await req("/api/members/join", "POST", { memberId: "c2", teamId: core.id, name: "Core-Sab" });

    // Semi-Periphery: 3 members (Miner + Manufacturer + Saboteur)
    await req("/api/members/join", "POST", { memberId: "sp1", teamId: semiP.id, name: "SemiP-Miner" });
    await req("/api/members/join", "POST", { memberId: "sp2", teamId: semiP.id, name: "SemiP-Mfg" });
    await req("/api/members/join", "POST", { memberId: "sp3", teamId: semiP.id, name: "SemiP-Sab" });

    // Periphery: 3 members (Miner + Manufacturer + Saboteur)
    await req("/api/members/join", "POST", { memberId: "p1", teamId: periph.id, name: "Periph-Miner" });
    await req("/api/members/join", "POST", { memberId: "p2", teamId: periph.id, name: "Periph-Mfg" });
    await req("/api/members/join", "POST", { memberId: "p3", teamId: periph.id, name: "Periph-Sab" });

    // Start game
    console.log("\n▶️  Starting game...");
    await req("/api/game/state", "PUT", { timerRunning: true });

    // ========================
    // 1. MINING TESTS
    // ========================
    console.log("\n🔨 === MINING TESTS ===");

    // Core cannot mine
    const coreMine = await req("/api/game/mine", "POST", { teamId: core.id, memberId: "c1" });
    assert(!coreMine.success, "Core team CANNOT mine");

    // Periphery can mine
    const periphMine = await req("/api/game/mine", "POST", { teamId: periph.id, memberId: "p1" });
    assert(periphMine.success, "Periphery team CAN mine");

    // Verify Periphery mine wealth bonus (+$5)
    const periphAfterMine = (await req("/api/teams")).data.find(t => t.id === periph.id);
    assert(periphAfterMine.wealth === 105, `Periphery wealth after mine: $${periphAfterMine.wealth} (expected $105 = $100+$5 bonus)`);
    assert(periphAfterMine.rawMaterials === 31, `Periphery RM after mine: ${periphAfterMine.rawMaterials} (expected 31 = 30+1)`);

    // Semi-P can mine with $4 bonus
    const semiPMine = await req("/api/game/mine", "POST", { teamId: semiP.id, memberId: "sp1" });
    assert(semiPMine.success, "Semi-P team CAN mine");
    const semiPAfterMine = (await req("/api/teams")).data.find(t => t.id === semiP.id);
    assert(semiPAfterMine.wealth === 204, `Semi-P wealth after mine: $${semiPAfterMine.wealth} (expected $204 = $200+$4 bonus)`);

    // Mine cooldown — too fast should fail
    const periphMine2 = await req("/api/game/mine", "POST", { teamId: periph.id, memberId: "p1" });
    assert(!periphMine2.success, "Periphery mine cooldown enforced (2s)");

    // Wait for cooldown and retry
    await sleep(2200);
    const periphMine3 = await req("/api/game/mine", "POST", { teamId: periph.id, memberId: "p1" });
    assert(periphMine3.success, "Periphery mine succeeds after cooldown");

    // Wrong role cannot mine
    const wrongRoleMine = await req("/api/game/mine", "POST", { teamId: periph.id, memberId: "p2" });
    assert(!wrongRoleMine.success, "Non-miner role CANNOT mine");

    // ========================
    // 2. MANUFACTURING TESTS
    // ========================
    console.log("\n🏭 === MANUFACTURING TESTS ===");

    // Core can manufacture (has RM=0 though, need to give via market or direct)
    // Core starts with 0 RM — so manufacturing should fail
    const coreMfg = await req("/api/game/manufacture", "POST", { teamId: core.id, memberId: "c1" });
    assert(!coreMfg.success, "Core cannot manufacture with 0 raw materials");

    // Periphery CANNOT manufacture (tech=0, no FDI)
    const periphMfg = await req("/api/game/manufacture", "POST", { teamId: periph.id, memberId: "p2" });
    assert(!periphMfg.success, "Periphery CANNOT manufacture without FDI/tech");

    // Semi-P CAN manufacture (tech=1, has RM)
    const semiPMfg = await req("/api/game/manufacture", "POST", { teamId: semiP.id, memberId: "sp2" });
    assert(semiPMfg.success, "Semi-P CAN manufacture (tech=1, has RM)");
    const semiPAfterMfg = (await req("/api/teams")).data.find(t => t.id === semiP.id);
    assert(semiPAfterMfg.wealth === 204 + 35, `Semi-P wealth after manufacture: $${semiPAfterMfg.wealth} (expected $239 = +$35)`);

    // ========================
    // 3. SABOTAGE TESTS
    // ========================
    console.log("\n💀 === SABOTAGE TESTS ===");

    // Core embargo on Periphery
    const embargo = await req("/api/sabotage/embargo", "POST", { attackerId: core.id, targetId: periph.id, memberId: "c2" });
    assert(embargo.success, "Core CAN embargo Periphery");

    // Core embargo cooldown — should fail immediately
    const embargo2 = await req("/api/sabotage/embargo", "POST", { attackerId: core.id, targetId: semiP.id, memberId: "c2" });
    assert(!embargo2.success, "Core sabotage cooldown enforced (15s)");

    // Periphery embargo — should fail (wrong tier)
    await sleep(15500);
    const periphEmbargo = await req("/api/sabotage/embargo", "POST", { attackerId: periph.id, targetId: core.id, memberId: "p3" });
    assert(!periphEmbargo.success, "Periphery CANNOT embargo");

    // Semi-P CAN embargo
    const semiPEmbargo = await req("/api/sabotage/embargo", "POST", { attackerId: semiP.id, targetId: core.id, memberId: "sp3" });
    assert(semiPEmbargo.success, "Semi-P CAN embargo");

    // Espionage — Periphery can spy on Core
    await sleep(15500);
    const espionage = await req("/api/sabotage/espionage", "POST", { attackerId: periph.id, targetId: core.id, memberId: "p3" });
    assert(espionage.success, "Periphery CAN use espionage on Core");

    // Core CANNOT use espionage
    await sleep(15500);
    const coreEspionage = await req("/api/sabotage/espionage", "POST", { attackerId: core.id, targetId: periph.id, memberId: "c2" });
    assert(!coreEspionage.success, "Core CANNOT use espionage");

    // Tariff — Core only
    const tariff = await req("/api/sabotage/tariff", "POST", { attackerId: core.id, targetId: periph.id, memberId: "c2" });
    assert(tariff.success, "Core CAN use tariff");

    // Strike without FDI — should fail
    await sleep(15500);
    const strike = await req("/api/sabotage/strike", "POST", { teamId: periph.id, memberId: "p3" });
    assert(!strike.success, "Periphery CANNOT strike without FDI");

    // Revolution without FDI — should fail
    const revolution = await req("/api/sabotage/revolution", "POST", { teamId: periph.id, memberId: "p3" });
    assert(!revolution.success, "Periphery CANNOT revolt without FDI");

    // ========================
    // 4. FDI VOTING TESTS
    // ========================
    console.log("\n🤝 === FDI VOTING TESTS ===");

    // Ensure sabotage cooldown clears from tariff above
    console.log("  ⏳ Waiting for sabotage cooldown to clear...");
    await sleep(16000);
    const fdiProposal = await req("/api/sabotage/fdi-proposal", "POST", {
        investorId: core.id, targetId: periph.id, memberId: "c2"
    });
    if (!fdiProposal.success) console.log(`    └─ Error: ${fdiProposal.error}`);
    assert(fdiProposal.success, "Core CAN propose FDI to Periphery");

    // Duplicate proposal — should fail
    const fdiProposal2 = await req("/api/sabotage/fdi-proposal", "POST", {
        investorId: core.id, targetId: periph.id, memberId: "c2"
    });
    assert(!fdiProposal2.success, "Duplicate FDI proposal blocked");

    // Vote — Periphery members vote
    const vote1 = await req("/api/sabotage/fdi-vote", "POST", { teamId: periph.id, memberId: "p1", accept: true });
    if (!vote1.success) console.log(`    └─ Error: ${vote1.error}`);
    assert(vote1.success, "Periphery member 1 CAN vote on FDI");

    // Double vote — should fail
    const vote1dup = await req("/api/sabotage/fdi-vote", "POST", { teamId: periph.id, memberId: "p1", accept: false });
    assert(!vote1dup.success, "Double voting blocked");

    // Wrong team member — should fail
    const wrongVote = await req("/api/sabotage/fdi-vote", "POST", { teamId: periph.id, memberId: "c1", accept: true });
    assert(!wrongVote.success, "Non-team member CANNOT vote");

    // Remaining votes (accept majority)
    const vote2 = await req("/api/sabotage/fdi-vote", "POST", { teamId: periph.id, memberId: "p2", accept: true });
    assert(vote2.success, "Periphery member 2 votes");
    const vote3 = await req("/api/sabotage/fdi-vote", "POST", { teamId: periph.id, memberId: "p3", accept: true });
    assert(vote3.success, "Periphery member 3 votes (final)");

    // Wait a moment for async FDI application
    await sleep(1000);

    // Verify FDI applied
    const periphAfterFDI = (await req("/api/teams")).data.find(t => t.id === periph.id);
    assert(periphAfterFDI.fdiInvestorId === core.id, `FDI investor set correctly: ${periphAfterFDI.fdiInvestorId}`);
    assert(periphAfterFDI.techLevel >= 1, `Periphery tech level increased to ${periphAfterFDI.techLevel}`);

    // Periphery can NOW manufacture (has FDI)
    await sleep(500);
    const periphMfgAfterFDI = await req("/api/game/manufacture", "POST", { teamId: periph.id, memberId: "p2" });
    assert(periphMfgAfterFDI.success, "Periphery CAN manufacture after FDI");

    // FDI cooldown — 2 minutes
    await sleep(15500); // wait for sabotage cd
    const fdiCooldown = await req("/api/sabotage/fdi-proposal", "POST", {
        investorId: core.id, targetId: semiP.id, memberId: "c2"
    });
    assert(!fdiCooldown.success && fdiCooldown.error.includes("FDI cooldown"), "FDI 2-minute cooldown enforced");

    // ========================
    // 5. STRIKE & REVOLUTION (with FDI)
    // ========================
    console.log("\n✊ === STRIKE & REVOLUTION TESTS ===");

    // Strike WITH FDI — should succeed
    await sleep(15500);
    const strikeWithFDI = await req("/api/sabotage/strike", "POST", { teamId: periph.id, memberId: "p3" });
    if (!strikeWithFDI.success) console.log(`    └─ Error: ${strikeWithFDI.error}`);
    assert(strikeWithFDI.success, "Periphery CAN strike WITH FDI");

    // Verify Core investor lost $50
    const coreAfterStrike = (await req("/api/teams")).data.find(t => t.id === core.id);
    console.log(`  📊 Core wealth after strike: $${coreAfterStrike.wealth} (should be $500 - $50 embargo - $40 tariff - $50 strike = $360)`);

    // Revolution WITH FDI — should succeed
    await sleep(15500);
    const periphBeforeRev = (await req("/api/teams")).data.find(t => t.id === periph.id);
    const rev = await req("/api/sabotage/revolution", "POST", { teamId: periph.id, memberId: "p3" });
    if (!rev.success) console.log(`    └─ Error: ${rev.error}`);
    assert(rev.success, "Periphery CAN revolt WITH FDI");

    await sleep(500);
    const periphAfterRev = (await req("/api/teams")).data.find(t => t.id === periph.id);
    assert(!periphAfterRev.fdiInvestorId, "FDI link broken after revolution");
    assert(periphAfterRev.techLevel === 0, `Tech reset to 0 after revolution (got ${periphAfterRev.techLevel})`);
    assert(periphAfterRev.wealth <= Math.ceil(periphBeforeRev.wealth / 2), `Wealth halved: was $${periphBeforeRev.wealth}, now $${periphAfterRev.wealth}`);

    // ========================
    // 6. FDI TO SEMI-PERIPHERY
    // ========================
    console.log("\n🏦 === FDI TO SEMI-PERIPHERY ===");

    // Wait for FDI cooldown (2 min) — skip by checking what server says
    const fdiToSemiP = await req("/api/sabotage/fdi-proposal", "POST", {
        investorId: core.id, targetId: semiP.id, memberId: "c2"
    });
    if (!fdiToSemiP.success && fdiToSemiP.error.includes("cooldown")) {
        console.log(`  ⏳ FDI cooldown still active: ${fdiToSemiP.error} — skipping Semi-P FDI test`);
    } else {
        assert(fdiToSemiP.success, "Core CAN propose FDI to Semi-Periphery");
    }

    // FDI to Core — should fail
    await sleep(500);
    const fdiToCore = await req("/api/sabotage/fdi-proposal", "POST", {
        investorId: core.id, targetId: core.id, memberId: "c2"
    });
    assert(!fdiToCore.success, "FDI to Core team BLOCKED");

    // ========================
    // 7. GAME FROZEN TESTS
    // ========================
    console.log("\n❄️  === GAME FROZEN TESTS ===");

    await req("/api/game/state", "PUT", { gameFrozen: true });
    await sleep(500);

    const frozenMine = await req("/api/game/mine", "POST", { teamId: periph.id, memberId: "p1" });
    assert(!frozenMine.success, "Mining blocked when game frozen");

    const frozenMfg = await req("/api/game/manufacture", "POST", { teamId: semiP.id, memberId: "sp2" });
    assert(!frozenMfg.success, "Manufacturing blocked when game frozen");

    const frozenSab = await req("/api/sabotage/embargo", "POST", { attackerId: core.id, targetId: periph.id, memberId: "c2" });
    assert(!frozenSab.success, "Sabotage blocked when game frozen");

    // Unfreeze
    await req("/api/game/state", "PUT", { gameFrozen: false, timerRunning: true });

    // ========================
    // SUMMARY
    // ========================
    console.log(`\n${"=".repeat(50)}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${passed + failed}`);
    console.log(`${"=".repeat(50)}`);

    if (failed > 0) {
        console.log("\n⚠️  Some tests failed! Review the output above.");
        process.exit(1);
    } else {
        console.log("\n🎉 All tests passed!");
    }
}

main().catch(console.error);
