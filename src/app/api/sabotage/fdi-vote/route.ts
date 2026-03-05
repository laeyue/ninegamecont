import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { checkGameActive } from "@/lib/game-guards";
import { memberRegistry } from "@/lib/member-registry";

export const dynamic = "force-dynamic";

// POST { teamId, memberId, accept: boolean }
// A Periphery team member votes on a pending FDI proposal
export async function POST(req: NextRequest) {
    try {
        const { teamId, memberId, accept } = await req.json();

        if (!teamId || !memberId || accept === undefined) {
            return NextResponse.json({ success: false, error: "teamId, memberId, and accept are required" }, { status: 400 });
        }

        const gameCheck = await checkGameActive();
        if (gameCheck) return gameCheck;

        // Verify the member belongs to this team
        const member = memberRegistry.getMember(memberId);
        if (!member || member.teamId !== teamId) {
            return NextResponse.json({ success: false, error: "You are not a member of this team" }, { status: 403 });
        }

        // Get the pending proposal
        const proposal = sabotageState.getFdiProposal(teamId);
        if (!proposal) {
            return NextResponse.json({ success: false, error: "No pending FDI proposal for your team" }, { status: 404 });
        }

        // Check if already voted
        if (proposal.votes.has(memberId)) {
            return NextResponse.json({ success: false, error: "You have already voted" }, { status: 400 });
        }

        // Record vote
        sabotageState.recordFdiVote(teamId, memberId, accept);

        const totalVotes = proposal.votes.size;
        const accepts = Array.from(proposal.votes.values()).filter(v => v).length;
        const rejects = totalVotes - accepts;

        // Check if all members have voted — resolve immediately
        if (totalVotes >= proposal.totalMembers) {
            const resolved = sabotageState.resolveFdiProposal(teamId);
            if (resolved) {
                if (resolved.result === "accepted") {
                    await applyFdi(proposal.investorId, teamId);
                }

                sseBroadcaster.emit(SSE_EVENTS.FDI_VOTE_RESULT, {
                    targetTeamId: teamId,
                    investorName: proposal.investorName,
                    targetName: proposal.targetName,
                    result: resolved.result,
                    accepts,
                    rejects,
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                message: accept ? "You voted to ACCEPT FDI" : "You voted to REJECT FDI",
                votesIn: totalVotes,
                totalMembers: proposal.totalMembers,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to vote";
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
