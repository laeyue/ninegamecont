import { Tier } from "@prisma/client";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Tier-based Tailwind theme classes
export function getTierTheme(tier: Tier) {
  switch (tier) {
    case Tier.CORE:
      return {
        bg: "bg-emerald-950",
        bgCard: "bg-emerald-900/50",
        border: "border-yellow-600/40",
        text: "text-yellow-100",
        accent: "text-yellow-400",
        button: "bg-yellow-600 hover:bg-yellow-500 text-emerald-950",
        buttonSecondary: "bg-emerald-700 hover:bg-emerald-600 text-emerald-50",
        badge: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
        header: "bg-emerald-900/80 border-yellow-600/30",
      };
    case Tier.SEMI_PERIPHERY:
      return {
        bg: "bg-slate-900",
        bgCard: "bg-slate-800/50",
        border: "border-blue-500/30",
        text: "text-blue-100",
        accent: "text-blue-400",
        button: "bg-blue-600 hover:bg-blue-500 text-white",
        buttonSecondary: "bg-slate-700 hover:bg-slate-600 text-slate-50",
        badge: "bg-blue-600/20 text-blue-400 border-blue-600/30",
        header: "bg-slate-800/80 border-blue-500/30",
      };
    case Tier.PERIPHERY:
      return {
        bg: "bg-stone-900",
        bgCard: "bg-stone-800/50",
        border: "border-amber-600/30",
        text: "text-amber-100",
        accent: "text-amber-400",
        button: "bg-amber-600 hover:bg-amber-500 text-stone-950",
        buttonSecondary: "bg-stone-700 hover:bg-stone-600 text-stone-50",
        badge: "bg-amber-600/20 text-amber-400 border-amber-600/30",
        header: "bg-stone-800/80 border-amber-600/30",
      };
  }
}
