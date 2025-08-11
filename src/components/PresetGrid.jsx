import { useState, useEffect } from "react";
import { logger } from "../utils/logger";
import {
  Calendar,
  Palette,
  Play,
  ChevronDown,
  ChevronUp,
  Settings,
  Plus,
  Trash2,
  Pencil,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import DisconnectedOverlay from "./DisconnectedOverlay";
import { SEASONAL_PRESETS } from "../constants/presets";
import {
  createWledPreset,
  deleteWledPreset,
  activateWledEffect,
  checkWledHeartbeat,
  getWledEffects,
  getWledPalettes,
  createWledPresetViaWebSocket,
  deleteWledPlaylistViaWebSocket,
} from "../config/wledApi";
import { WLED_PALETTES_DATA } from "../constants/palettes.js";

// Custom Effects will be managed dynamically
const CUSTOM_EFFECTS = [];

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

function CustomEffectCard({
  effect,
  isActive,
  onClick,
  onRemove,
  onEdit,
  isDark,
}) {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = () => {
    onEdit(effect);
    setShowOptionsModal(false);
  };

  const handleDeleteConfirm = () => {
    onRemove(effect.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => onClick(effect.id)}
        className={`w-full rounded-xl shadow-sm border-2 transition-all overflow-hidden relative ${
          isActive
            ? "border-white shadow-lg ring-2 ring-blue-500"
            : "border-white/20 hover:border-white/40"
        }`}
        style={{ background: effect.gradient }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative p-4 text-white">
          <div className="font-medium text-sm drop-shadow-md mb-1">
            {effect.name}
          </div>
          <div className="text-xs opacity-75">
            {effect.effectName} - {effect.paletteName}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowOptionsModal(true);
        }}
        className={`absolute -top-2 -right-2 p-1 rounded-full transition-colors ${
          isDark
            ? "bg-gray-800 hover:bg-gray-700 text-gray-400"
            : "bg-white hover:bg-gray-100 text-gray-600"
        }`}
        title="More options"
      >
        <MoreVertical size={14} />
      </button>

      {/* Options Modal */}
      {showOptionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowOptionsModal(false)}
        >
          <div
            className={`p-4 rounded-lg shadow-lg min-w-48 ${
              isDark
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`font-medium mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Options
            </h3>
            <button
              onClick={handleEditClick}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Pencil size={16} />
              Modify
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full text-left px-3 py-2 rounded text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className={`p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 ${
              isDark
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`font-medium mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Delete Effect
            </h3>
            <p
              className={`mb-4 text-sm ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Are you sure you want to delete "{effect.name}"? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded transition-colors ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaylistCard({
  playlist,
  isActive,
  onClick,
  onRemove,
  onEdit,
  isDark,
}) {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = () => {
    onEdit(playlist);
    setShowOptionsModal(false);
  };

  const handleDeleteConfirm = () => {
    onRemove(playlist.id);
    setShowDeleteConfirm(false);
  };

  // Generate gradient from first 3 items in the playlist
  const generatePlaylistGradient = () => {
    const items = playlist.items || [];

    // Extract colors from gradients of first 3 effects
    const extractedColors = items.slice(0, 3).map((item) => {
      const gradient = item.gradient || "#6366f1";

      // If it's already a simple color, use it
      if (gradient.startsWith("#") || gradient.startsWith("rgb")) {
        return gradient;
      }

      // If it's a gradient, extract the first color
      const colorMatch = gradient.match(
        /(?:rgb\(\d+,\s*\d+,\s*\d+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})/
      );
      return colorMatch ? colorMatch[0] : "#6366f1";
    });

    // Fill with default colors if we don't have enough effects
    while (extractedColors.length < 3) {
      const defaultColors = ["#6366f1", "#8b5cf6", "#ec4899"];
      extractedColors.push(
        defaultColors[extractedColors.length % defaultColors.length]
      );
    }

    if (extractedColors.length === 1) {
      return `linear-gradient(135deg, ${extractedColors[0]}, ${extractedColors[0]})`;
    } else if (extractedColors.length === 2) {
      return `linear-gradient(135deg, ${extractedColors[0]}, ${extractedColors[1]})`;
    } else {
      return `linear-gradient(135deg, ${extractedColors[0]} 0%, ${extractedColors[1]} 50%, ${extractedColors[2]} 100%)`;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => onClick(playlist.id)}
        className={`w-full rounded-xl shadow-sm border-2 transition-all overflow-hidden relative ${
          isActive
            ? "border-white shadow-lg ring-2 ring-blue-500"
            : "border-white/20 hover:border-white/40"
        }`}
        style={{ background: generatePlaylistGradient() }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative p-4 text-white">
          <div className="font-medium text-sm drop-shadow-md mb-1">
            {playlist.name}
          </div>
          <div className="text-xs opacity-75">
            {playlist.items?.length || 0} effects
          </div>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowOptionsModal(true);
        }}
        className={`absolute -top-2 -right-2 p-1 rounded-full transition-colors ${
          isDark
            ? "bg-gray-800 hover:bg-gray-700 text-gray-400"
            : "bg-white hover:bg-gray-100 text-gray-600"
        }`}
        title="More options"
      >
        <MoreVertical size={14} />
      </button>

      {/* Options Modal */}
      {showOptionsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowOptionsModal(false)}
        >
          <div
            className={`p-4 rounded-lg shadow-lg min-w-48 ${
              isDark
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`font-medium mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Options
            </h3>
            <button
              onClick={handleDeleteClick}
              className="w-full text-left px-3 py-2 rounded text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className={`p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 ${
              isDark
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`font-medium mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Delete Playlist
            </h3>
            <p
              className={`mb-4 text-sm ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Are you sure you want to delete "{playlist.name}"? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded transition-colors ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PresetGrid({
  activePreset,
  onPresetSelect,
  isDark,
  currentPlaylist,
  onShowPlaylist,
  activeDevice,
  customEffects = [], // Add default value
  onAddCustomEffect,
  onRemoveCustomEffect,
  savedPlaylists,
  onPlaylistEdit,
  onPlaylistRemove,
  onPlaylistSelect, // New prop
  liveLedData, // New prop
}) {
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(() => {
    const saved = localStorage.getItem("kolori_seasonal_collapsed");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(
    () => {
      const saved = localStorage.getItem("kolori_custom_effects_collapsed");
      return saved !== null ? JSON.parse(saved) : true;
    }
  );

  const [isPlaylistsCollapsed, setIsPlaylistsCollapsed] = useState(() => {
    const saved = localStorage.getItem("kolori_playlists_collapsed");
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(
      "kolori_seasonal_collapsed",
      JSON.stringify(isSeasonalCollapsed)
    );
  }, [isSeasonalCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      "kolori_custom_effects_collapsed",
      JSON.stringify(isCustomEffectsCollapsed)
    );
  }, [isCustomEffectsCollapsed]);

  useEffect(() => {
    localStorage.setItem(
      "kolori_playlists_collapsed",
      JSON.stringify(isPlaylistsCollapsed)
    );
  }, [isPlaylistsCollapsed]);
  const [showEffectForm, setShowEffectForm] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState("");
  const [selectedPalette, setSelectedPalette] = useState("");
  const [effectName, setEffectName] = useState("");
  const [isCreatingEffect, setIsCreatingEffect] = useState(false);
  const [isTestingEffect, setIsTestingEffect] = useState(false);
  const [editingEffect, setEditingEffect] = useState(null);
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const [wledEffects, setWledEffects] = useState([]);
  const [wledPalettes, setWledPalettes] = useState([]);
  const [isLoadingEffects, setIsLoadingEffects] = useState(false);

  // Fetch effects and palettes from WLED device
  const fetchWledData = async () => {
    if (!activeDevice?.ip || !activeDevice.isConnected) {
      return;
    }

    setIsLoadingEffects(true);
    try {
      const [effectsResult, palettesResult] = await Promise.all([
        getWledEffects(activeDevice.ip, activeDevice.protocol || "http"),
        getWledPalettes(activeDevice.ip, activeDevice.protocol || "http"),
      ]);

      if (effectsResult.success) {
        setWledEffects(effectsResult.effects);
      } else {
        logger.error("Failed to fetch WLED effects:", effectsResult.message);
        // Fallback to basic effects if API fails
        setWledEffects([
          { id: 0, name: "Solid", effectId: 0 },
          { id: 1, name: "Rainbow", effectId: 9 },
          { id: 2, name: "Theater Chase", effectId: 11 },
        ]);
      }

      if (palettesResult.success) {
        setWledPalettes(palettesResult.palettes);
      } else {
        logger.error("Failed to fetch WLED palettes:", palettesResult.message);
        // Fallback to basic palettes if API fails
        setWledPalettes([
          { id: 0, name: "Default", paletteId: 0 },
          { id: 1, name: "Rainbow", paletteId: 11 },
          { id: 2, name: "Party", paletteId: 6 },
        ]);
      }
    } catch (error) {
      logger.error("Error fetching WLED data:", error);
      // Set fallback data on error
      setWledEffects([
        { id: 0, name: "Solid", effectId: 0 },
        { id: 1, name: "Rainbow", effectId: 9 },
        { id: 2, name: "Theater Chase", effectId: 11 },
      ]);
      setWledPalettes([
        { id: 0, name: "Default", paletteId: 0 },
        { id: 1, name: "Rainbow", paletteId: 11 },
        { id: 2, name: "Party", paletteId: 6 },
      ]);
    } finally {
      setIsLoadingEffects(false);
    }
  };

  // Load effects and palettes when device changes or becomes connected
  useEffect(() => {
    fetchWledData();
  }, [activeDevice?.id, activeDevice?.ip, activeDevice?.isConnected]);

  const allPresets = [...SEASONAL_PRESETS, ...customEffects];
  const activePresetData = allPresets.find((p) => p.id === activePreset);
  const hasActiveContent = activePresetData;

  const generateGradient = (paletteName) => {
    const paletteData = WLED_PALETTES_DATA[paletteName];
    if (!paletteData || paletteData.length === 0) {
      return `linear-gradient(135deg, #888, #555)`;
    }

    const colorStops = paletteData
      .map((color) => `rgb(${color[1]}, ${color[2]}, ${color[3]})`)
      .join(", ");

    return `linear-gradient(135deg, ${colorStops})`;
  };

  const addCustomEffect = async () => {
    if (!effectName || !selectedEffect || !selectedPalette) return;
    if (!activeDevice?.ip) {
      alert(
        "No active WLED device connected. Please add and connect a device first."
      );
      return;
    }

    if (!activeDevice.isConnected) {
      alert(
        `${activeDevice.name} is disconnected. Please check your device connection before creating effects.`
      );
      return;
    }

    setIsCreatingEffect(true);

    try {
      const effectData = wledEffects.find(
        (e) => e.effectId.toString() === selectedEffect
      );
      const paletteData = wledPalettes.find(
        (p) => p.paletteId.toString() === selectedPalette
      );

      if (editingEffect) {
        // Update existing effect
        const updatedEffects = customEffects.map((e) =>
          e.id === editingEffect.id
            ? {
                ...e,
                name: effectName,
                effectId: parseInt(selectedEffect),
                effectName: effectData?.name || "Unknown Effect",
                paletteId: parseInt(selectedPalette),
                paletteName: paletteData?.name || "Unknown Palette",
                gradient: generateGradient(paletteData.name),
              }
            : e
        );
        saveCustomEffectsToStorage(updatedEffects);
        if (onCustomEffectUpdate) {
          onCustomEffectUpdate(updatedEffects);
        }
      } else {
        // Create new effect - try WebSocket first, fallback to HTTP
        let result;

        // Try WebSocket method first (faster)
        try {
          result = await createWledPresetViaWebSocket(
            parseInt(selectedEffect),
            parseInt(selectedPalette),
            effectName,
            null, // Let it auto-generate ID
            {
              includeBrightness: true,
              includeSegmentBrightness: true,
              includeSegmentColors: false,
            }
          );

          if (result.success) {
            // Preset created successfully via WebSocket
          } else {
            throw new Error(result.message);
          }
        } catch (wsError) {
          // WebSocket preset creation failed, falling back to HTTP

          // Fallback to HTTP method
          result = await createWledPreset(
            activeDevice.ip,
            parseInt(selectedEffect),
            parseInt(selectedPalette),
            effectName,
            null, // presetId
            activeDevice.protocol || "http"
          );
        }

        if (!result.success) {
          alert(`Failed to create preset: ${result.message}`);
          return;
        }

        const newEffect = {
          id: Date.now(),
          name: effectName,
          effectId: parseInt(selectedEffect),
          effectName: effectData?.name || "Unknown Effect",
          paletteId: parseInt(selectedPalette),
          paletteName: paletteData?.name || "Unknown Palette",
          presetId: result.presetId,
          gradient: generateGradient(paletteData.name),
          isCustom: true,
        };

        onAddCustomEffect(newEffect);

        onPresetSelect(newEffect.id);
      }

      setEffectName("");
      setSelectedEffect("");
      setSelectedPalette("");
      setShowEffectForm(false);
      setEditingEffect(null);
    } catch (error) {
      alert(`Error creating preset: ${error.message}`);
    } finally {
      setIsCreatingEffect(false);
    }
  };

  const handleEditEffect = (effect) => {
    setEditingEffect(effect);
    setEffectName(effect.name);
    setSelectedEffect(effect.effectId.toString());
    setSelectedPalette(effect.paletteId.toString());
    setShowEffectForm(true);
  };

  const testEffect = async () => {
    logger.log(
      "🧪 Testing effect:",
      selectedEffect,
      "with palette:",
      selectedPalette
    );

    if (!selectedEffect || !selectedPalette) {
      alert("Please select both an effect and palette before testing.");
      return;
    }

    if (!activeDevice?.ip) {
      alert(
        "No active WLED device connected. Please add and connect a device first."
      );
      return;
    }

    if (!activeDevice.isConnected) {
      alert(
        `${activeDevice.name} is disconnected. Please check your device connection before testing effects.`
      );
      return;
    }

    setIsTestingEffect(true);

    try {
      const result = await activateWledEffect(
        activeDevice.ip,
        parseInt(selectedEffect),
        parseInt(selectedPalette),
        activeDevice.protocol || "http"
      );

      if (!result.success) {
        alert(`Failed to test effect: ${result.message}`);
      }
    } catch (error) {
      alert(`Error testing effect: ${error.message}`);
    } finally {
      setIsTestingEffect(false);
    }
  };

  const removeCustomEffect = async (effectId) => {
    const effect = customEffects.find((e) => e.id === effectId);
    if (!effect) return;

    try {
      // Delete preset from WLED device if it has a preset ID
      if (effect.presetId && activeDevice?.ip) {
        const result = await deleteWledPreset(
          activeDevice.ip,
          effect.presetId,
          activeDevice.protocol || "http"
        );
        if (!result.success) {
          logger.warn(`Failed to delete WLED preset: ${result.message}`);
        }
      }

      onRemoveCustomEffect(effectId);
    } catch (error) {
      logger.error("Error removing custom effect:", error);
      // Still remove from local state even if WLED deletion failed
      onRemoveCustomEffect(effectId);
    }
  };

  const retryConnection = async () => {
    if (!activeDevice?.ip) return;

    setIsRetryingConnection(true);

    try {
      const result = await checkWledHeartbeat(
        activeDevice.ip,
        activeDevice.protocol || "http"
      );
      // Manual connection check completed
    } catch (error) {
      logger.error("Error during manual connection check:", error);
    } finally {
      setIsRetryingConnection(false);
    }
  };

  const isDeviceDisconnected = activeDevice && !activeDevice.isConnected;

  return (
    <div
      className={`relative p-4 space-y-6 pb-24 ${isDark ? "text-white" : ""}`}
    >
      {/* Disconnected Device Overlay */}
      <DisconnectedOverlay
        isVisible={isDeviceDisconnected}
        deviceName={activeDevice?.name || "Device"}
        onRetry={retryConnection}
        isDark={isDark}
        isRetrying={isRetryingConnection}
      />

      {/* Live View Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Play size={20} />
          Live View
        </h2>
        <div
          className={`border rounded-xl p-4 ${
            isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {activePresetData && (
                <>
                  <div className="font-medium text-sm mb-1">
                    Active: {activePresetData.name}
                  </div>
                  {/* Live LED Data - Small LED Pills */}
                  {liveLedData.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-0.5 items-end">
                        {liveLedData.map((color, index) => (
                          <div
                            key={index}
                            className="relative"
                            style={{
                              width: "6px",
                              height: "11px",
                              backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                              borderRadius: "2px",
                              boxShadow: `0 0 4px rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`,
                              border: "0.2px solid rgba(255, 255, 255, 0.2)",
                            }}
                            title={`LED ${index + 1}: RGB(${color.r}, ${
                              color.g
                            }, ${color.b})`}
                          >
                            {/* LED highlight effect */}
                            <div
                              className="absolute top-0.5 left-0.5 rounded-full"
                              style={{
                                width: "2px",
                                height: "4px",
                                backgroundColor: "rgba(255, 255, 255, 0.4)",
                                borderRadius: "1px",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {liveLedData.length} LED
                        {liveLedData.length !== 1 ? "s" : ""} live
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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

      {/* Custom Effects */}
      <div>
        <button
          onClick={() => setIsCustomEffectsCollapsed(!isCustomEffectsCollapsed)}
          className="w-full text-left mb-3 flex items-center justify-between hover:opacity-75 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Palette size={20} />
            <h2 className="text-lg font-semibold">Custom Effects</h2>
          </div>
          {isCustomEffectsCollapsed ? (
            <ChevronDown size={20} />
          ) : (
            <ChevronUp size={20} />
          )}
        </button>
        {!isCustomEffectsCollapsed && (
          <div className="space-y-4">
            {/* Loading Effects Notice */}
            {isLoadingEffects && (
              <div
                className={`p-4 border rounded-xl text-center ${
                  isDark
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="text-sm text-gray-500">
                  Loading effects from WLED device...
                </div>
              </div>
            )}

            {/* No Device Connected Notice */}
            {!activeDevice?.isConnected && !isLoadingEffects && (
              <div
                className={`p-4 border rounded-xl text-center ${
                  isDark
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="text-sm text-gray-500">
                  Connect to a WLED device to load available effects
                </div>
              </div>
            )}

            {/* Add Effect Form */}
            {!showEffectForm &&
            activeDevice?.isConnected &&
            !isLoadingEffects ? (
              <button
                onClick={() => setShowEffectForm(true)}
                className={`w-full p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-colors ${
                  isDark
                    ? "border-gray-600 hover:border-gray-500 text-gray-400"
                    : "border-gray-300 hover:border-gray-400 text-gray-500"
                }`}
              >
                <Plus size={20} />
                <span>Add Custom Effect</span>
              </button>
            ) : (
              <div
                className={`p-4 border rounded-xl space-y-3 ${
                  isDark
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div>
                  <label
                    className={`block text-sm mb-1 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Effect Name
                  </label>
                  <input
                    type="text"
                    value={effectName}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 50); // Limit to 50 characters
                      setEffectName(value);
                    }}
                    placeholder="e.g., My Rainbow Effect"
                    maxLength={50}
                    className={`w-full px-3 py-2 rounded border ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 placeholder-gray-500"
                    }`}
                  />
                  <div
                    className={`text-xs mt-1 ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {effectName.length}/50 characters
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block text-sm mb-1 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Effect{" "}
                      {wledEffects.length > 0 &&
                        `(${wledEffects.length} available)`}
                    </label>
                    <select
                      value={selectedEffect}
                      onChange={(e) => setSelectedEffect(e.target.value)}
                      disabled={wledEffects.length === 0}
                      className={`w-full px-3 py-2 rounded border ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <option value="">
                        {wledEffects.length === 0
                          ? "Loading effects..."
                          : "Select Effect"}
                      </option>
                      {wledEffects.map((effect) => (
                        <option key={effect.effectId} value={effect.effectId}>
                          {effect.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-sm mb-1 ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Palette{" "}
                      {wledPalettes.length > 0 &&
                        `(${wledPalettes.length} available)`}
                    </label>
                    <select
                      value={selectedPalette}
                      onChange={(e) => setSelectedPalette(e.target.value)}
                      disabled={wledPalettes.length === 0}
                      className={`w-full px-3 py-2 rounded border ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <option value="">
                        {wledPalettes.length === 0
                          ? "Loading palettes..."
                          : "Select Palette"}
                      </option>
                      {wledPalettes.map((palette) => (
                        <option
                          key={palette.paletteId}
                          value={palette.paletteId}
                        >
                          {palette.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={testEffect}
                    disabled={
                      !selectedEffect || !selectedPalette || isTestingEffect
                    }
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isTestingEffect ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={addCustomEffect}
                    disabled={
                      !effectName ||
                      !selectedEffect ||
                      !selectedPalette ||
                      isCreatingEffect
                    }
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingEffect
                      ? editingEffect
                        ? "Updating..."
                        : "Creating..."
                      : editingEffect
                      ? "Update Effect"
                      : "Add Effect"}
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setShowEffectForm(false);
                      setEffectName("");
                      setSelectedEffect("");
                      setSelectedPalette("");
                      setEditingEffect(null);
                    }}
                    className={`w-full py-2 px-4 rounded transition-colors ${
                      isDark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Custom Effects Grid */}
            {customEffects.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {customEffects.map((effect) => (
                  <CustomEffectCard
                    key={effect.id}
                    effect={effect}
                    isActive={activePreset === effect.id}
                    onClick={onPresetSelect}
                    onRemove={removeCustomEffect}
                    onEdit={handleEditEffect}
                    isDark={isDark}
                  />
                ))}
              </div>
            ) : (
              <div
                className={`p-4 border rounded-xl text-center ${
                  isDark
                    ? "border-gray-700 bg-gray-800 text-gray-400"
                    : "border-gray-300 bg-gray-50 text-gray-500"
                }`}
              >
                No custom effects found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playlists */}
      <div>
        <button
          onClick={() => setIsPlaylistsCollapsed(!isPlaylistsCollapsed)}
          className="w-full text-left mb-3 flex items-center justify-between hover:opacity-75 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Play size={20} />
            <h2 className="text-lg font-semibold">Playlists</h2>
          </div>
          {isPlaylistsCollapsed ? (
            <ChevronDown size={20} />
          ) : (
            <ChevronUp size={20} />
          )}
        </button>

        {!isPlaylistsCollapsed && (
          <div className="space-y-4">
            {/* Create Playlist Button */}
            {customEffects.length > 0 && (
              <button
                onClick={onShowPlaylist}
                className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 font-medium ${
                  isDark
                    ? "bg-blue-900 text-blue-200"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                <Play size={18} />
                Create Playlist
              </button>
            )}

            {savedPlaylists && savedPlaylists.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {savedPlaylists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    isActive={playlist.isActive}
                    onClick={(playlistId) => {
                      onPlaylistSelect(playlistId);
                    }}
                    onRemove={onPlaylistRemove}
                    onEdit={onPlaylistEdit}
                    isDark={isDark}
                  />
                ))}
              </div>
            ) : (
              customEffects.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Play size={48} className="mx-auto mb-4 opacity-50" />
                  <div>No playlists saved yet</div>
                  <div className="text-sm">
                    Create custom effects first to build playlists
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PresetGrid;
