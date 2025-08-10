import React from "react";
import { Music, Calendar } from "lucide-react";

export default function QuickActions({
  onShowPlaylist,
  onShowScheduler,
  isDark,
}) {
  return (
    <div className="flex gap-3 px-4">
      <button
        onClick={onShowPlaylist}
        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 font-medium ${
          isDark ? "bg-blue-900 text-blue-200" : "bg-blue-50 text-blue-700"
        }`}
      >
        <Music size={18} />
        Playlist
      </button>
      <button
        onClick={onShowScheduler}
        className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 font-medium ${
          isDark
            ? "bg-purple-900 text-purple-200"
            : "bg-purple-50 text-purple-700"
        }`}
      >
        <Calendar size={18} />
        Schedule
      </button>
    </div>
  );
}
