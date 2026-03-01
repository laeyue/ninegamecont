"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Newspaper } from "lucide-react";

export interface NewsItem {
  id: string;
  headline: string;
  type: "crisis" | "diplomacy" | "sabotage" | "system";
}

interface NewsFlashProps {
  item: NewsItem | null;
}

const TYPE_STYLES: Record<NewsItem["type"], { bg: string; label: string; border: string; icon: "alert" | "paper" }> = {
  crisis: {
    bg: "bg-red-700",
    label: "CRISIS ALERT",
    border: "border-red-500",
    icon: "alert",
  },
  diplomacy: {
    bg: "bg-amber-700",
    label: "WORLD NEWS",
    border: "border-amber-500",
    icon: "paper",
  },
  sabotage: {
    bg: "bg-orange-700",
    label: "BREAKING NEWS",
    border: "border-orange-500",
    icon: "alert",
  },
  system: {
    bg: "bg-blue-700",
    label: "ANNOUNCEMENT",
    border: "border-blue-500",
    icon: "paper",
  },
};

const DISPLAY_DURATION = 6000;

export function NewsFlash({ item }: NewsFlashProps) {
  const [visible, setVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<NewsItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Clear after exit animation
    setTimeout(() => setCurrentItem(null), 500);
  }, []);

  useEffect(() => {
    if (!item) return;

    // Show new item
    setCurrentItem(item);
    setVisible(true);

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Auto-dismiss after duration
    timerRef.current = setTimeout(dismiss, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item, dismiss]);

  if (!currentItem) return null;

  const style = TYPE_STYLES[currentItem.type];

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-500 ease-out ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* Backdrop glow */}
      <div className={`absolute inset-0 ${style.bg} opacity-90`} />

      {/* Top accent border */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${style.border.replace("border-", "bg-")} animate-pulse`} />

      {/* Content */}
      <div className="relative px-4 py-3">
        {/* Label badge */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className={`${style.bg} border ${style.border} px-3 py-0.5 rounded-sm`}>
            <div className="flex items-center gap-1.5">
              {style.icon === "alert" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-white animate-pulse" />
              ) : (
                <Newspaper className="h-3.5 w-3.5 text-white" />
              )}
              <span className="text-[11px] font-black tracking-[0.2em] text-white uppercase">
                {style.label}
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <p className="text-center text-white font-bold text-sm sm:text-base leading-snug px-2">
          {currentItem.headline}
        </p>
      </div>

      {/* Bottom accent border */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${style.border.replace("border-", "bg-")} animate-pulse`} />

      {/* Tap to dismiss */}
      <button
        onClick={dismiss}
        className="absolute inset-0 w-full h-full opacity-0"
        aria-label="Dismiss"
      />
    </div>
  );
}
