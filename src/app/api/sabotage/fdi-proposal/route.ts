import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import { memberRegistry } from "@/lib/member-registry";
import { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

const FDI_VOTE_DURATION_MS = 30_000; // 30 seconds to vote

// POST { investorId, targetId, memberId }
// Core saboteur proposes FDI to a Periphery team — triggers a vote
export async function POST(req: NextRequest) {
    try {
        const { investorId, targetId, memberId } = await req.json();

        if (!investorId || !targetId) {
            return NextResponse.json({ success: false, error: "investorId and targetId required" }, { status: 400 });
        }

        const gameCheck = await checkGameActive();
        if (gameCheck) return gameCheck;

        if (memberId) {
            const roleCheck = checkMemberRole(memberId, "SABOTEUR");
            if (roleCheck) return roleCheck;
        }

        // Sabotage cooldown
        const cd = sabotageState.canSabotage(investorId);
        if (!cd.allowed) {
            return NextResponse.json(
                { success: false, error: `Sabotage cooldown: ${Math.ceil(cd.remainingMs / 1000)}s remaining` },
                { status: 429 }
            );
        }

        // FDI-specific cooldown (2 minutes)
        const fdiCd = sabotageState.canProposeFdi(investorId);
        if (!fdiCd.allowed) {
            return NextResponse.json(
                { success: false, error: `FDI cooldown: ${Math.ceil(fdiCd.remainingMs / 1000)}s remaining` },
                { status: 429 }
            );
        }

        // Check if there's already a pending proposal for this target
        if (sabotageState.getFdiProposal(targetId)) {
            return NextResponse.json({ success: false, error: "There is already a pending FDI proposal for this team" }, { status: 400 });
        }

        // Validate teams
        const investor = await prisma.team.findUnique({ where: { id: investorId } });
        const target = await prisma.team.findUnique({ where: { id: targetId } });

        if (!investor) return NextResponse.json({ success: false, error: "Investor team not found" }, { status: 404 });
        if (!target) return NextResponse.json({ success: false, error: "Target team not found" }, { status: 404 });
        if (investor.tier !== Tier.CORE) return NextResponse.json({ success: false, error: "Only Core nations can propose FDI" }, { status: 403 });
        if (target.tier !== Tier.PERIPHERY && target.tier !== Tier.SEMI_PERIPHERY) return NextResponse.json({ success: false, error: "FDI can only be proposed to Periphery or Semi-Periphery teams" }, { status: 403 });
        if (target.fdiInvestorId) return NextResponse.json({ success: false, error: "Target already has an FDI investor" }, { status: 400 });

        // Record both cooldowns
        sabotageState.recordSabotage(investorId);
        sabotageState.recordFdiCooldown(investorId);

        // Count target team members
        const targetMembers = memberRegistry.getTeamMembers(targetId);
        const totalMembers = targetMembers.length;

        if (totalMembers === 0) {
            return NextResponse.json({ success: false, error: "Target team has no members to vote" }, { status: 400 });
        }

        // Create proposal
        const proposal = sabotageState.addFdiProposal(
            investorId,
            investor.name,
            targetId,
            target.name,
            totalMembers,
            FDI_VOTE_DURATION_MS
        );

        // Broadcast to all clients
        sseBroadcaster.emit(SSE_EVENTS.FDI_PROPOSAL, {
            proposalId: proposal.id,
            investorId: proposal.investorId,
            investorName: proposal.investorName,
            targetTeamId: proposal.targetTeamId,
            targetName: proposal.targetName,
            totalMembers,
            expiresAt: proposal.expiresAt,
        });

        // Set auto-expiry timer
        setTimeout(async () => {
            const p = sabotageState.getFdiProposal(targetId);
            if (p && !p.resolved) {
                // Auto-resolve with current votes
                const resolved = sabotageState.resolveFdiProposal(targetId);
                if (resolved && resolved.result === "accepted") {
                    await applyFdi(investorId, targetId);
                }
                sseBroadcaster.emit(SSE_EVENTS.FDI_VOTE_RESULT, {
                    targetTeamId: targetId,
                    investorName: investor.name,
                    targetName: target.name,
                    result: resolved?.result ?? "expired",
                });
            }
        }, FDI_VOTE_DURATION_MS);

        return NextResponse.json({
            success: true,
            data: { message: `FDI proposal sent to ${target.name}. Waiting for vote...` },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to propose FDI";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}

// Shared FDI application logic
async function applyFdi(investorId: string, recipientId: string) {
    await prisma.team.updateMany({
        where: { id: recipientId, fdiInvestorId: null },
        data: {
            techLevel: { increment: 1 },
            fdiInvestorId: investorId,
        },
    });

    const updatedRecipient = await prisma.team.findUnique({ where: { id: recipientId } });
    const investor = await prisma.team.findUnique({ where: { id: investorId } });

    if (updatedRecipient) {
        const log = await prisma.gameEventLog.create({
            data: {
                message: `🏦 FOREIGN DIRECT INVESTMENT — ${investor?.name} invested in ${updatedRecipient.name}. ${updatedRecipient.name} gains +1 Tech Level but ${Math.round(0.2 * 100)}% of manufacturing profits now go to ${investor?.name}.`,
            },
        });
        sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: updatedRecipient });
        sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log });
    }
}
