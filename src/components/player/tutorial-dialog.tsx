"use client";

import { useState } from "react";
import {
  Globe,
  ChevronRight,
  ChevronLeft,
  Crown,
  Scale,
  Wheat,
  Pickaxe,
  Factory,
  Skull,
  Ban,
  Eye,
  Megaphone,
  Flame,
  Landmark,
  AlertTriangle,
  Rocket,
  ShieldAlert,
  FlaskConical,
} from "lucide-react";

interface TutorialDialogProps {
  onComplete: () => void;
}

/* ─── slide data ─── */

const slides = [
  // 0 — Welcome
  {
    key: "welcome",
    render: () => (
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-5">
          <Globe className="h-10 w-10 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Welcome to The Global Economy
        </h2>
        <p className="text-gray-300 leading-relaxed">
          You are about to experience a simulation of the{" "}
          <span className="text-white font-semibold">real-world global economy</span>.
          Just like in the real world, not every country starts equal.
        </p>
        <p className="text-gray-400 text-sm mt-4 leading-relaxed">
          Your team represents a <span className="text-white">country</span>. Some countries are rich and
          powerful, others are poor and struggling. Your goal?{" "}
          <span className="text-white font-semibold">Grow your wealth</span> and
          navigate the unfair system.
        </p>
      </div>
    ),
  },

  // 1 — The Three Tiers
  {
    key: "tiers",
    render: () => (
      <div>
        <h2 className="text-xl font-bold text-white mb-1 text-center">
          The Three Tiers of the World
        </h2>
        <p className="text-gray-400 text-sm mb-4 text-center">
          Every team is assigned to one of three economic tiers.
        </p>

        <div className="space-y-3">
          {/* Core */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Crown className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-amber-300 text-sm">CORE (2 groups)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              The <span className="text-amber-300 font-semibold">richest, most powerful</span> nations
              (think USA, Germany). Start with <span className="text-white font-semibold">$500</span>,
              high tech, and can turn raw materials into expensive goods worth{" "}
              <span className="text-white font-semibold">$80 each</span>.
              However, they have <span className="text-amber-300">no raw materials</span> and{" "}
              <span className="text-amber-300">cannot mine</span> — they depend on others.
            </p>
          </div>

          {/* Semi-Periphery */}
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale className="h-4 w-4 text-sky-400" />
              <span className="font-bold text-sky-300 text-sm">SEMI-PERIPHERY (3 groups)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              <span className="text-sky-300 font-semibold">Middle-income</span> nations
              (think Brazil, India). Start with <span className="text-white font-semibold">$200</span>,
              some tech, and <span className="text-white font-semibold">10 raw materials</span>.
              Can both mine and manufacture, but goods are only worth{" "}
              <span className="text-white font-semibold">$30 each</span>.
              They can do everything, but nothing as well as the specialists.
            </p>
          </div>

          {/* Periphery */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Wheat className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-emerald-300 text-sm">PERIPHERY (5 groups)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              <span className="text-emerald-300 font-semibold">Poor, resource-rich</span> nations
              (think many African/South American countries). Start with only{" "}
              <span className="text-white font-semibold">$50</span> but have{" "}
              <span className="text-white font-semibold">30 raw materials</span>.
              They can mine fast but{" "}
              <span className="text-emerald-300">cannot manufacture</span> without foreign investment.
              They must sell cheap materials to survive.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  // 2 — Roles
  {
    key: "roles",
    render: () => (
      <div>
        <h2 className="text-xl font-bold text-white mb-1 text-center">
          Your Role on the Team
        </h2>
        <p className="text-gray-400 text-sm mb-4 text-center">
          Each team member gets a specific job. You cannot do another role&apos;s actions.
        </p>

        <div className="space-y-3">
          {/* Miner */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Pickaxe className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-white text-sm">Miner</span>
              <span className="text-gray-500 text-xs">(Periphery & Semi-Periphery only)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              Extracts raw materials from the ground. Also the only role that can{" "}
              <span className="text-white font-semibold">sell materials</span> on the market.
              Core nations do not have miners — they have no resources to extract.
            </p>
          </div>

          {/* Manufacturer */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Factory className="h-4 w-4 text-blue-400" />
              <span className="font-bold text-white text-sm">Manufacturer</span>
              <span className="text-gray-500 text-xs">(needs Tech Level 1+)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              Converts 1 raw material into money. Core makes{" "}
              <span className="text-amber-300 font-semibold">$80</span>, Semi-Periphery makes{" "}
              <span className="text-sky-300 font-semibold">$30</span>. Also the only role that can{" "}
              <span className="text-white font-semibold">buy materials</span> from the market.
              Periphery cannot manufacture until they receive foreign investment.
            </p>
          </div>

          {/* Saboteur */}
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Skull className="h-4 w-4 text-red-400" />
              <span className="font-bold text-white text-sm">Saboteur</span>
              <span className="text-gray-500 text-xs">(all tiers)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              The diplomat and troublemaker. Can use special actions to disrupt other
              teams or fight back against exploitation. Each tier has different
              sabotage options available. More on this in the next slide.
            </p>
          </div>
        </div>

        <p className="text-gray-500 text-xs mt-3 text-center">
          Roles are assigned automatically when you join. Your teacher can rotate them mid-game.
        </p>
      </div>
    ),
  },

  // 3 — How the Economy Works
  {
    key: "economy",
    render: () => (
      <div>
        <h2 className="text-xl font-bold text-white mb-1 text-center">
          How the Economy Works
        </h2>
        <p className="text-gray-400 text-sm mb-4 text-center">
          The core game loop in 4 steps.
        </p>

        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-400 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Mine Raw Materials</p>
              <p className="text-gray-400 text-xs">
                Periphery (3s cooldown) and Semi-Periphery (5s cooldown) miners extract
                resources. Core has no resources.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Sell on the Market</p>
              <p className="text-gray-400 text-xs">
                Miners list raw materials for sale at their chosen price.
                Anyone can see the market, but only Manufacturers can buy.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-400 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Buy & Manufacture</p>
              <p className="text-gray-400 text-xs">
                Manufacturers buy materials from the market, then convert 1 material into
                wealth. Core earns $80, Semi-Periphery earns $30.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-400 font-bold text-sm">4</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Sabotage & Survive</p>
              <p className="text-gray-400 text-xs">
                Saboteurs use special actions to gain advantages or fight injustice.
                The teacher may also trigger global events that shake up the economy.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
          <p className="text-blue-300 text-xs text-center">
            The team with the <span className="font-bold">most wealth</span> at the end wins —
            but the real lesson is about <span className="font-bold">why</span> some teams
            had it harder than others.
          </p>
        </div>
      </div>
    ),
  },

  // 4 — Sabotage & Special Actions
  {
    key: "sabotage",
    render: () => (
      <div>
        <h2 className="text-xl font-bold text-white mb-1 text-center">
          Sabotage & Special Actions
        </h2>
        <p className="text-gray-400 text-sm mb-4 text-center">
          Each tier&apos;s Saboteur has access to different power moves.
        </p>

        <div className="space-y-2.5">
          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-semibold text-white text-xs">Trade Embargo</span>
              <span className="text-gray-500 text-xs ml-auto">Core & Semi-P</span>
            </div>
            <p className="text-gray-400 text-xs">
              Costs $50. Blocks a team from using the market for 60 seconds.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-3.5 w-3.5 text-purple-400" />
              <span className="font-semibold text-white text-xs">Espionage</span>
              <span className="text-gray-500 text-xs ml-auto">Periphery & Semi-P</span>
            </div>
            <p className="text-gray-400 text-xs">
              25% chance to steal +1 Tech Level from a target. If you fail, you pay a $40 fine.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-3.5 w-3.5 text-yellow-400" />
              <span className="font-semibold text-white text-xs">Worker Strike</span>
              <span className="text-gray-500 text-xs ml-auto">Periphery only (needs FDI)</span>
            </div>
            <p className="text-gray-400 text-xs">
              Halts your production for 30 seconds, but the foreign investor loses $30.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-3.5 w-3.5 text-red-400" />
              <span className="font-semibold text-white text-xs">Revolution</span>
              <span className="text-gray-500 text-xs ml-auto">Periphery only (desperate)</span>
            </div>
            <p className="text-gray-400 text-xs">
              Requires FDI + wealth at $20 or below. Breaks free from the investor but
              halves your wealth and resets tech to 0. A last resort.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-white text-xs">Trade Tariff</span>
              <span className="text-gray-500 text-xs ml-auto">Core only</span>
            </div>
            <p className="text-gray-400 text-xs">
              Costs $40. Target receives only 50% of their market sale proceeds for 60 seconds.
            </p>
          </div>

          <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold text-white text-xs">Resource Synthesis</span>
              <span className="text-gray-500 text-xs ml-auto">Core only</span>
            </div>
            <p className="text-gray-400 text-xs">
              Costs $40. Creates 1 raw material out of nothing, bypassing the market entirely.
              10-second cooldown per player.
            </p>
          </div>
        </div>

        <p className="text-gray-500 text-xs mt-3 text-center">
          All sabotage actions have a 15-second cooldown per team.
        </p>
      </div>
    ),
  },

  // 5 — Teacher Events & FDI
  {
    key: "events",
    render: () => (
      <div>
        <h2 className="text-xl font-bold text-white mb-1 text-center">
          Global Events
        </h2>
        <p className="text-gray-400 text-sm mb-4 text-center">
          Your teacher controls these world-shaking events from the admin dashboard.
        </p>

        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Landmark className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-amber-300 text-sm">Foreign Direct Investment (FDI)</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              A Core team invests in a Periphery team. The Periphery team gets{" "}
              <span className="text-white font-semibold">+1 Tech Level</span> (unlocking manufacturing),
              but permanently <span className="text-red-300 font-semibold">50% of their profits</span>{" "}
              go to the investor. Just like real foreign investment — helpful, but exploitative.
            </p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="font-bold text-red-300 text-sm">Debt Crisis</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              Instantly <span className="text-red-300 font-semibold">halves the wealth</span> of all
              Periphery nations. Core and Semi-Periphery are unaffected. Simulates real-world
              economic shocks that disproportionately hurt the poorest countries.
            </p>
          </div>
        </div>

        <div className="mt-4 bg-gray-800/60 border border-gray-700 rounded-lg p-3">
          <p className="text-gray-300 text-xs leading-relaxed text-center">
            When events happen, a{" "}
            <span className="text-white font-semibold">Breaking News</span>{" "}
            banner will appear at the top of your screen so you never miss anything.
          </p>
        </div>
      </div>
    ),
  },

  // 6 — Ready
  {
    key: "ready",
    render: () => (
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-5">
          <Rocket className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          You&apos;re Ready!
        </h2>
        <p className="text-gray-300 leading-relaxed">
          Pick a group, enter your name, and you&apos;ll be assigned a role
          automatically. The game starts when your teacher hits{" "}
          <span className="text-white font-semibold">Start Game</span>.
        </p>
        <div className="mt-5 space-y-2 text-left w-full">
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5 flex items-start gap-2">
            <span className="text-amber-400 text-sm mt-0.5">*</span>
            <p className="text-gray-400 text-xs">
              <span className="text-white font-semibold">Core</span> teams: focus on buying cheap
              materials and manufacturing expensive goods.
            </p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5 flex items-start gap-2">
            <span className="text-sky-400 text-sm mt-0.5">*</span>
            <p className="text-gray-400 text-xs">
              <span className="text-white font-semibold">Semi-Periphery</span> teams: you can do
              everything — mine, make, and sabotage. Use your flexibility wisely.
            </p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5 flex items-start gap-2">
            <span className="text-emerald-400 text-sm mt-0.5">*</span>
            <p className="text-gray-400 text-xs">
              <span className="text-white font-semibold">Periphery</span> teams: sell materials for
              as much as possible. Use sabotage to fight back against exploitation.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

/* ─── component ─── */

export function TutorialDialog({ onComplete }: TutorialDialogProps) {
  const [step, setStep] = useState(0);
  const total = slides.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {slides.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-blue-400"
                  : i < step
                  ? "w-1.5 bg-blue-400/50"
                  : "w-1.5 bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 min-h-[420px] flex flex-col">
          <div className="flex-1">{slides[step].render()}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-800">
            {!isFirst ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
              >
                Skip
              </button>
            )}

            <span className="text-gray-600 text-xs">
              {step + 1} / {total}
            </span>

            {!isLast ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Let&apos;s Go!
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
