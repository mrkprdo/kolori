import React from "react";
import { Music, Play, Square, Plus, Trash2, GripVertical } from "lucide-react";
import { SEASONAL_PRESETS, COLOR_PRESETS } from "./PresetGrid";

export default function PlaylistModal({
  isOpen,
  onClose,
  currentPlaylist,
  isPlaying,
  onTogglePlaylist,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  isDark,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div
        className={`w-full max-h-[80vh] rounded-t-2xl overflow-hidden ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div
          className={`p-4 border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music size={20} />
              <h2
                className={`text-lg font-semibold ${
                  isDark ? "text-white" : ""
                }`}
              >
                Playlist Builder
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full text-xl leading-none ${
                isDark ? "hover:bg-gray-800 text-white" : "hover:bg-gray-100"
              }`}
            >
              ×
            </button>
          </div>
        </div>

        <div
          className={`p-4 pb-6 overflow-y-auto max-h-96 ${
            isDark ? "text-white" : ""
          }`}
        >
          {currentPlaylist.length > 0 ? (
            <div className="space-y-2 mb-4">
              {currentPlaylist.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 flex items-center gap-3 ${
                    isDark ? "bg-gray-800" : "bg-gray-50"
                  }`}
                >
                  <GripVertical size={16} className="text-gray-400" />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ background: item.gradient }}
                  ></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.duration}s duration
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFromPlaylist(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={onTogglePlaylist}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                    isPlaying
                      ? "bg-red-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {isPlaying ? <Square size={16} /> : <Play size={16} />}
                  {isPlaying ? "Stop" : "Play"}
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isDark
                      ? "bg-green-900 text-green-200"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  Save Playlist
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Music size={48} className="mx-auto mb-4 opacity-50" />
              <div>No presets in playlist</div>
              <div className="text-sm">Add presets from the main screen</div>
            </div>
          )}

          <div
            className={`border-t pt-4 mt-4 ${
              isDark ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3 className="font-semibold mb-3">Add Presets</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[...SEASONAL_PRESETS, ...COLOR_PRESETS].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onAddToPlaylist(preset)}
                  className={`w-full border rounded-lg p-3 flex items-center gap-3 ${
                    isDark
                      ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded"
                    style={{ background: preset.gradient }}
                  ></div>
                  <div className="flex-1 text-left text-sm">{preset.name}</div>
                  <Plus size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
