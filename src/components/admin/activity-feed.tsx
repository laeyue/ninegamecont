"use client";

import { ScrollText } from "lucide-react";
import type { GameEventLogData } from "@/types";

interface ActivityFeedProps {
  logs: GameEventLogData[];
}

export function ActivityFeed({ logs }: ActivityFeedProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ScrollText className="h-4 w-4 text-purple-400" />
        <h2 className="text-sm font-bold">Activity Feed</h2>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-sm">
            No activity yet
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="bg-black/20 rounded-lg p-2.5 border border-white/5"
            >
              <p className="text-sm text-gray-300">{log.message}</p>
              <p className="text-[10px] text-gray-600 mt-1">
                {new Date(log.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
