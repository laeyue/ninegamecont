import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function GuidePage() {
    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 p-6 md:p-12 font-sans selection:bg-blue-900 selection:text-white">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Player Guide
                    </h1>
                </div>

                <div className="space-y-10 text-gray-300 leading-relaxed">
                    {/* Intro */}
                    <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                        <p className="mb-4 text-lg text-white font-medium">Join at the IP provided by your facilitator.</p>
                        <p className="mb-4">
                            You are part of a team representing a country in a simplified global economy. Some countries start rich with advanced technology. Others start poor with only raw materials. Your goal is to grow your country&apos;s wealth by trading, manufacturing, and making strategic decisions—while navigating the same inequalities that shape the real world.
                        </p>
                        <p className="mb-2 text-gray-400 text-sm font-semibold uppercase tracking-wider">The simulation demonstrates:</p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-300 marker:text-blue-500">
                            <li><strong className="text-gray-100">World Systems Theory:</strong> The world is divided into Core, Semi-Periphery, and Periphery nations.</li>
                            <li><strong className="text-gray-100">Dependency Theory:</strong> Poor nations often depend on rich nations in ways that keep them poor.</li>
                            <li><strong className="text-gray-100">Modernization Theory:</strong> Technology and investment can help nations develop, but the path is not equal.</li>
                        </ul>
                    </section>

                    {/* Tiers */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-800 pb-2">The Three Tiers</h2>
                        <div className="space-y-6">
                            <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-5">
                                <h3 className="text-xl font-bold text-blue-400 mb-2">Core Nations (Groups 1–2)</h3>
                                <p className="mb-3 text-sm text-gray-400">Industrialized and wealthy but no natural resources. Depend on buying raw materials to manufacture.</p>
                                <ul className="grid grid-cols-2 gap-2 text-sm">
                                    <li><strong>Start Wealth:</strong> $500</li>
                                    <li><strong>Start Materials:</strong> 0</li>
                                    <li><strong>Tech Level:</strong> 3</li>
                                    <li><strong>Manufacture:</strong> Yes (+$50, 6s cd)</li>
                                    <li className="col-span-2"><strong>Mine:</strong> No</li>
                                </ul>
                            </div>

                            <div className="bg-purple-950/20 border border-purple-900/40 rounded-lg p-5">
                                <h3 className="text-xl font-bold text-purple-400 mb-2">Semi-Periphery Nations (Groups 3–5)</h3>
                                <p className="mb-3 text-sm text-gray-400">Can mine and manufacture, but at lower efficiency. Occupy a middle ground.</p>
                                <ul className="grid grid-cols-2 gap-2 text-sm">
                                    <li><strong>Start Wealth:</strong> $200</li>
                                    <li><strong>Start Materials:</strong> 15</li>
                                    <li><strong>Tech Level:</strong> 1</li>
                                    <li><strong>Manufacture:</strong> Yes (+$35, 10s cd)</li>
                                    <li className="col-span-2"><strong>Mine:</strong> Yes (3 mats, +$4 wealth, 6s cd)</li>
                                </ul>
                            </div>

                            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-5">
                                <h3 className="text-xl font-bold text-emerald-400 mb-2">Periphery Nations (Groups 6–10)</h3>
                                <p className="mb-3 text-sm text-gray-400">Resource-rich but technology-poor. Cannot manufacture without FDI or stolen tech.</p>
                                <ul className="grid grid-cols-2 gap-2 text-sm">
                                    <li><strong>Start Wealth:</strong> $100</li>
                                    <li><strong>Start Materials:</strong> 30</li>
                                    <li><strong>Tech Level:</strong> 0</li>
                                    <li><strong>Manufacture:</strong> No (until FDI/tech)</li>
                                    <li className="col-span-2"><strong>Mine:</strong> Yes (3 mats, +$5 wealth, 2s cd)</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Roles */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-800 pb-2">Player Roles</h2>
                        <p className="mb-4 text-sm text-gray-400">Note: Core teams have no Miner role.</p>
                        <div className="overflow-x-auto rounded-lg border border-gray-800">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-900 text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Role</th>
                                        <th className="px-4 py-3 font-semibold">What You Can Do</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 bg-gray-900/30">
                                    <tr>
                                        <td className="px-4 py-3 font-medium text-white">Miner</td>
                                        <td className="px-4 py-3">Mine raw materials & sell on market.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 font-medium text-white">Manufacturer</td>
                                        <td className="px-4 py-3">Buy materials & manufacture goods.</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 font-medium text-white">Saboteur</td>
                                        <td className="px-4 py-3">Perform sabotage actions.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Sabotage */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-800 pb-2">Sabotage Actions</h2>
                        <p className="mb-4 text-sm text-red-400 font-medium">Every sabotage action triggers a 15-second cooldown for your ENTIRE team.</p>
                        <div className="space-y-4">
                            {[
                                { name: "Trade Embargo", who: "Core, Semi-P", cost: "$50", effect: "Blocks target from market for 60s." },
                                { name: "Espionage", who: "Periphery, Semi-P", cost: "$0 ($25 fine if fail)", effect: "10% chance to steal +1 tech level from richer team." },
                                { name: "FDI Proposal", who: "Core Only", cost: "Free (2m cooldown)", effect: "Target votes (30s). If accepted: Target gets +1 Tech & manufacturing, pays 20% profits to investor." },
                                { name: "Worker Strike", who: "Periphery (w/ FDI)", cost: "Free", effect: "Halts own manufacturing for 30s. Core investor loses $50." },
                                { name: "Revolution", who: "Periphery (w/ FDI)", cost: "50% wealth & Tech=0", effect: "Breaks FDI link. No more profit sharing." },
                                { name: "Trade Tariff", who: "Core Only", cost: "$40", effect: "For 60s, target receives only 50% of market sale proceeds." },
                            ].map((act, i) => (
                                <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                                        <h4 className="font-bold text-red-400">{act.name}</h4>
                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-800 rounded text-gray-300">{act.who}</span>
                                    </div>
                                    <p className="text-sm text-gray-300"><strong className="text-gray-400">Cost:</strong> {act.cost}</p>
                                    <p className="text-sm text-gray-300"><strong className="text-gray-400">Effect:</strong> {act.effect}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Quick Steps */}
                    <section className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-blue-400 mb-4">How to Play</h2>
                        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-300 marker:text-blue-500 font-medium">
                            <li>Connect via the IP address on your phone&apos;s browser.</li>
                            <li>Pick your assigned group.</li>
                            <li>Wait for the facilitator to start the game.</li>
                            <li><strong>Miners:</strong> Mine & list on the market.</li>
                            <li><strong>Manufacturers:</strong> Buy from market & manufacture.</li>
                            <li><strong>Saboteurs:</strong> Disrupt rivals carefully.</li>
                        </ol>
                    </section>

                </div>
            </div>
        </div>
    );
}
