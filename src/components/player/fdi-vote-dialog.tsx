"use client";

import { useState, useEffect } from "react";
import { Handshake, X, Check, Timer } from "lucide-react";

interface FdiVoteDialogProps {
    investorName: string;
    targetTeamId: string;
    expiresAt: number;
    memberId: string;
    onClose: () => void;
}

export function FdiVoteDialog({ investorName, targetTeamId, expiresAt, memberId, onClose }: FdiVoteDialogProps) {
    const [voted, setVoted] = useState(false);
    const [voteChoice, setVoteChoice] = useState<boolean | null>(null);
    const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            setRemaining(left);
            if (left <= 0 && !voted) {
                // Auto-reject on timeout
                handleVote(false);
            }
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expiresAt, voted]);

    const handleVote = async (accept: boolean) => {
        if (voted || loading) return;
        setLoading(true);
        try {
            await fetch("/api/sabotage/fdi-vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId: targetTeamId, memberId, accept }),
            });
            setVoted(true);
            setVoteChoice(accept);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-500/20 rounded-full p-2">
                        <Handshake className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Foreign Investment Proposal</h2>
                        <div className="flex items-center gap-1 text-amber-400 text-sm">
                            <Timer className="h-3 w-3" />
                            <span className="font-mono">{remaining}s remaining</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                    <p className="text-gray-200 text-sm leading-relaxed">
                        <span className="text-amber-300 font-bold">{investorName}</span> wants to invest
                        in your nation. If accepted:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                            <span className="text-green-400">✓</span> Your team gains <span className="text-green-300 font-semibold">+1 Tech Level</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-green-400">✓</span> You can now <span className="text-green-300 font-semibold">manufacture</span> consumer goods
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-red-400">✗</span> <span className="text-red-300 font-semibold">20%</span> of manufacturing profits go to {investorName}
                        </li>
                    </ul>
                </div>

                {/* Countdown bar */}
                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4 overflow-hidden">
                    <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(remaining / 30) * 100}%` }}
                    />
                </div>

                {/* Buttons or result */}
                {!voted ? (
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleVote(false)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl py-3 font-medium transition-all disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                            Reject
                        </button>
                        <button
                            onClick={() => handleVote(true)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl py-3 font-medium transition-all disabled:opacity-50"
                        >
                            <Check className="h-4 w-4" />
                            Accept
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className={`text-sm font-medium ${voteChoice ? "text-green-400" : "text-red-400"}`}>
                            You voted to {voteChoice ? "ACCEPT" : "REJECT"} — waiting for teammates...
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
