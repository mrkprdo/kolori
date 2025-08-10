import React, { useState } from "react";
import {
  Calendar,
  Palette,
  Play,
  ChevronDown,
  ChevronUp,
  Music,
  Settings,
} from "lucide-react";
import { activateWledPreset } from "../config/wledApi";

const SEASONAL_PRESETS = [
  {
    id: 1,
    name: "Autumn",
    icon: "🍂",
    gradient: "linear-gradient(135deg, #ff6600, #ff9933)",
  },
  {
    id: 2,
    name: "Canada Day",
    icon: "🇨🇦",
    gradient: "linear-gradient(135deg, #ff0000, #ff4444)",
  },
  {
    id: 3,
    name: "Christmas",
    icon: "🎄",
    gradient: "linear-gradient(135deg, #228B22, #32CD32)",
  },
];

const COLOR_PRESETS = [
  {
    id: 5,
    name: "Sunset Glow",
    gradient: "linear-gradient(135deg, #ff7e5f, #feb47b)",
  },
  {
    id: 6,
    name: "Ocean Breeze",
    gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
  },
  {
    id: 7,
    name: "Candy Mix",
    gradient: "linear-gradient(135deg, #a8edea, #fed6e3)",
  },
  {
    id: 8,
    name: "Pastel Dreams",
    gradient: "linear-gradient(135deg, #ffecd2, #fcb69f)",
  },
  {
    id: 9,
    name: "Fire Dance",
    gradient: "linear-gradient(135deg, #ff512f, #f09819)",
  },
  {
    id: 10,
    name: "Forest Mist",
    gradient: "linear-gradient(135deg, #56ab2f, #a8e6cf)",
  },
  {
    id: 11,
    name: "Arctic Ice",
    gradient: "linear-gradient(135deg, #667eea, #764ba2)",
  },
  {
    id: 12,
    name: "Galaxy",
    gradient: "linear-gradient(135deg, #2c3e50, #4a90e2)",
  },
  {
    id: 13,
    name: "Coral Reef",
    gradient: "linear-gradient(135deg, #ff9a8b, #84fab0)",
  },
  {
    id: 14,
    name: "Mint Fresh",
    gradient: "linear-gradient(135deg, #a8e6cf, #88d8a3)",
  },
];

function PresetCard({ preset, isActive, onClick, showIcon = false }) {
  return (
    <button
      onClick={() => onClick(preset.id)}
      className={`rounded-xl shadow-sm border-2 transition-all overflow-hidden relative ${
        isActive
          ? "border-white shadow-lg ring-2 ring-blue-500"
          : "border-white/20 hover:border-white/40"
      }`}
      style={{ background: preset.gradient }}
    >
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="relative p-4 text-white">
        {showIcon && (
          <div className="text-3xl mb-2 drop-shadow-lg">{preset.icon}</div>
        )}
        {!showIcon && <div className="h-8 mb-2"></div>}
        <div className="font-medium text-sm drop-shadow-md">{preset.name}</div>
      </div>
    </button>
  );
}

export default function PresetGrid({
  activePreset,
  onPresetSelect,
  isDark,
  isPlaying,
  currentPlaylist,
  onShowPlaylist,
  onShowScheduler,
}) {
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isColorThemesCollapsed, setIsColorThemesCollapsed] = useState(true);

  const allPresets = [...SEASONAL_PRESETS, ...COLOR_PRESETS];
  const activePresetData = allPresets.find((p) => p.id === activePreset);
  const hasActiveContent =
    activePresetData || (isPlaying && currentPlaylist.length > 0);

  return (
    <div className={`p-4 space-y-6 pb-24 ${isDark ? "text-white" : ""}`}>
      {/* Current Playing Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Play size={20} />
          Current Playing
        </h2>
        {hasActiveContent ? (
          <div
            className={`border rounded-xl p-4 ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="flex-1">
                {activePresetData && (
                  <>
                    <div className="font-medium text-sm mb-1">
                      Active: {activePresetData.name}
                    </div>
                    <div
                      className="w-full h-3 rounded-full mb-2"
                      style={{ background: activePresetData.gradient }}
                    ></div>
                  </>
                )}
                {isPlaying && currentPlaylist.length > 0 && (
                  <div
                    className={`text-xs ${
                      isDark ? "text-green-400" : "text-green-600"
                    }`}
                  >
                    Playing playlist ({currentPlaylist.length} items)...
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`border rounded-xl p-4 text-center ${
              isDark
                ? "bg-gray-800 border-gray-700 text-gray-400"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <div className="text-sm">
              Selected animation or playlist will show here
            </div>
          </div>
        )}
      </div>

      {/* Deployment Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Settings size={20} />
          Deployment
        </h2>
        <div className="flex gap-3">
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
      </div>

      {/* Seasonal Presets */}
      <div>
        <button
          onClick={() => setIsSeasonalCollapsed(!isSeasonalCollapsed)}
          className="w-full text-left mb-3 flex items-center justify-between hover:opacity-75 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <h2 className="text-lg font-semibold">Seasonal Presets</h2>
          </div>
          {isSeasonalCollapsed ? (
            <ChevronDown size={20} />
          ) : (
            <ChevronUp size={20} />
          )}
        </button>
        {!isSeasonalCollapsed && (
          <div className="grid grid-cols-2 gap-3">
            {SEASONAL_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={activePreset === preset.id}
                onClick={onPresetSelect}
                showIcon={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Color Presets */}
      <div>
        <button
          onClick={() => setIsColorThemesCollapsed(!isColorThemesCollapsed)}
          className="w-full text-left mb-3 flex items-center justify-between hover:opacity-75 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Palette size={20} />
            <h2 className="text-lg font-semibold">Color Themes</h2>
          </div>
          {isColorThemesCollapsed ? (
            <ChevronDown size={20} />
          ) : (
            <ChevronUp size={20} />
          )}
        </button>
        {!isColorThemesCollapsed && (
          <div className="grid grid-cols-2 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={activePreset === preset.id}
                onClick={onPresetSelect}
                showIcon={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { SEASONAL_PRESETS, COLOR_PRESETS };
