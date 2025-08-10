import React, { useState, useEffect } from "react";
import {
  Calendar,
  Palette,
  Play,
  ChevronDown,
  ChevronUp,
  Music,
  Settings,
  Plus,
  Trash2,
  MoreVertical,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { SEASONAL_PRESETS } from "../constants/presets";
import { createWledPreset, deleteWledPreset, activateWledEffect } from "../config/wledApi";

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

function CustomEffectCard({ effect, isActive, onClick, onRemove, isDark }) {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowOptionsModal(false);
    setShowDeleteConfirm(true);
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
          <div className="h-8 mb-2"></div>
          <div className="font-medium text-sm drop-shadow-md">{effect.name}</div>
          <div className="text-xs opacity-75 mt-1">
            {effect.effectName} • {effect.paletteName}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowOptionsModal(true);
        }}
        className={`absolute -top-2 -right-2 p-1 rounded-full transition-colors ${
          isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-400" : "bg-white hover:bg-gray-100 text-gray-600"
        }`}
        title="More options"
      >
        <MoreVertical size={14} />
      </button>

      {/* Options Modal */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOptionsModal(false)}>
          <div 
            className={`p-4 rounded-lg shadow-lg min-w-48 ${
              isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className={`p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 ${
              isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
              Delete Effect
            </h3>
            <p className={`mb-4 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Are you sure you want to delete "{effect.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded transition-colors ${
                  isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
  isPlaying,
  currentPlaylist,
  onShowPlaylist,
  onShowScheduler,
  activeDevice,
  onCustomEffectUpdate,
}) {
  const [isSeasonalCollapsed, setIsSeasonalCollapsed] = useState(true);
  const [isCustomEffectsCollapsed, setIsCustomEffectsCollapsed] = useState(true);
  const [showEffectForm, setShowEffectForm] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState("");
  const [selectedPalette, setSelectedPalette] = useState("");
  const [effectName, setEffectName] = useState("");
  const [isCreatingEffect, setIsCreatingEffect] = useState(false);
  const [isTestingEffect, setIsTestingEffect] = useState(false);

  // localStorage key for custom effects
  const CUSTOM_EFFECTS_STORAGE_KEY = "kolori_custom_effects";

  // Helper functions for localStorage
  const loadCustomEffectsFromStorage = () => {
    try {
      const stored = localStorage.getItem(CUSTOM_EFFECTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn("Failed to load custom effects from localStorage:", error);
      return [];
    }
  };

  const saveCustomEffectsToStorage = (effects) => {
    try {
      localStorage.setItem(CUSTOM_EFFECTS_STORAGE_KEY, JSON.stringify(effects));
    } catch (error) {
      console.warn("Failed to save custom effects to localStorage:", error);
    }
  };

  // Initialize custom effects from localStorage
  const [customEffects, setCustomEffects] = useState(() => loadCustomEffectsFromStorage());

  // Sync with parent component on mount to pass initial custom effects from localStorage
  useEffect(() => {
    if (onCustomEffectUpdate && customEffects.length > 0) {
      onCustomEffectUpdate(customEffects);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to sync initial state

  // Mock WLED effects - in real implementation, these would be fetched from WLED device
  const WLED_EFFECTS = [
    { id: 0, name: "Solid" },
    { id: 1, name: "Blink" },
    { id: 2, name: "Breathe" },
    { id: 3, name: "Wipe" },
    { id: 4, name: "Wipe Random" },
    { id: 5, name: "Random Colors" },
    { id: 6, name: "Sweep" },
    { id: 7, name: "Dynamic" },
    { id: 8, name: "Colorloop" },
    { id: 9, name: "Rainbow" },
    { id: 10, name: "Scan" },
    { id: 11, name: "Theater Chase" },
    { id: 12, name: "Fade" },
    { id: 13, name: "Smooth" },
  ];

  // Mock WLED palettes - in real implementation, these would be fetched from WLED device
  const WLED_PALETTES = [
    { id: 0, name: "Default" },
    { id: 1, name: "Random Cycle" },
    { id: 2, name: "Primary Color" },
    { id: 3, name: "Based on Primary" },
    { id: 4, name: "Set Colors" },
    { id: 5, name: "Based on Set" },
    { id: 6, name: "Party" },
    { id: 7, name: "Cloud" },
    { id: 8, name: "Lava" },
    { id: 9, name: "Ocean" },
    { id: 10, name: "Forest" },
    { id: 11, name: "Rainbow" },
    { id: 12, name: "Rainbow Bands" },
    { id: 13, name: "Sunset" },
    { id: 14, name: "Rivendell" },
  ];

  const allPresets = [...SEASONAL_PRESETS, ...customEffects];
  const activePresetData = allPresets.find((p) => p.id === activePreset);
  const hasActiveContent =
    activePresetData || (isPlaying && currentPlaylist.length > 0);

  const addCustomEffect = async () => {
    if (!effectName || !selectedEffect || !selectedPalette) return;
    if (!activeDevice?.ip) {
      alert('No active WLED device connected. Please add and connect a device first.');
      return;
    }
    
    setIsCreatingEffect(true);
    
    try {
      const effectData = WLED_EFFECTS.find(e => e.id.toString() === selectedEffect);
      const paletteData = WLED_PALETTES.find(p => p.id.toString() === selectedPalette);
      
      // Create preset on WLED device
      const result = await createWledPreset(
        activeDevice.ip,
        parseInt(selectedEffect),
        parseInt(selectedPalette),
        effectName
      );
      
      if (!result.success) {
        alert(`Failed to create preset: ${result.message}`);
        return;
      }
      
      const newEffect = {
        id: Date.now(),
        name: effectName,
        effectId: parseInt(selectedEffect),
        effectName: effectData.name,
        paletteId: parseInt(selectedPalette),
        paletteName: paletteData.name,
        presetId: result.presetId,
        gradient: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`,
        isCustom: true
      };
      
      const updatedEffects = [...customEffects, newEffect];
      setCustomEffects(updatedEffects);
      saveCustomEffectsToStorage(updatedEffects);
      
      setEffectName("");
      setSelectedEffect("");
      setSelectedPalette("");
      setShowEffectForm(false);
      
      // Notify parent component if callback provided
      if (onCustomEffectUpdate) {
        onCustomEffectUpdate(updatedEffects);
      }
      
    } catch (error) {
      alert(`Error creating preset: ${error.message}`);
    } finally {
      setIsCreatingEffect(false);
    }
  };

  const testEffect = async () => {
    if (!selectedEffect || !selectedPalette) {
      alert('Please select both an effect and palette before testing.');
      return;
    }
    
    if (!activeDevice?.ip) {
      alert('No active WLED device connected. Please add and connect a device first.');
      return;
    }

    setIsTestingEffect(true);

    try {
      const result = await activateWledEffect(
        activeDevice.ip,
        parseInt(selectedEffect),
        parseInt(selectedPalette)
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
    const effect = customEffects.find(e => e.id === effectId);
    if (!effect) return;
    
    try {
      // Delete preset from WLED device if it has a preset ID
      if (effect.presetId && activeDevice?.ip) {
        const result = await deleteWledPreset(activeDevice.ip, effect.presetId);
        if (!result.success) {
          console.warn(`Failed to delete WLED preset: ${result.message}`);
        }
      }
      
      const updatedEffects = customEffects.filter(e => e.id !== effectId);
      setCustomEffects(updatedEffects);
      saveCustomEffectsToStorage(updatedEffects);
      
      // Notify parent component if callback provided
      if (onCustomEffectUpdate) {
        onCustomEffectUpdate(updatedEffects);
      }
      
    } catch (error) {
      console.error('Error removing custom effect:', error);
      // Still remove from local state even if WLED deletion failed
      const updatedEffects = customEffects.filter(e => e.id !== effectId);
      setCustomEffects(updatedEffects);
      saveCustomEffectsToStorage(updatedEffects);
      
      if (onCustomEffectUpdate) {
        onCustomEffectUpdate(updatedEffects);
      }
    }
  };

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
            {/* Add Effect Form */}
            {!showEffectForm ? (
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
              <div className={`p-4 border rounded-xl space-y-3 ${
                isDark ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-gray-50"
              }`}>
                <div>
                  <label className={`block text-sm mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
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
                  <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {effectName.length}/50 characters
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Effect
                    </label>
                    <select
                      value={selectedEffect}
                      onChange={(e) => setSelectedEffect(e.target.value)}
                      className={`w-full px-3 py-2 rounded border ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <option value="">Select Effect</option>
                      {WLED_EFFECTS.map((effect) => (
                        <option key={effect.id} value={effect.id}>
                          {effect.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Palette
                    </label>
                    <select
                      value={selectedPalette}
                      onChange={(e) => setSelectedPalette(e.target.value)}
                      className={`w-full px-3 py-2 rounded border ${
                        isDark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <option value="">Select Palette</option>
                      {WLED_PALETTES.map((palette) => (
                        <option key={palette.id} value={palette.id}>
                          {palette.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowEffectForm(false);
                      setEffectName("");
                      setSelectedEffect("");
                      setSelectedPalette("");
                    }}
                    className={`flex-1 py-2 px-4 rounded transition-colors ${
                      isDark
                        ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCustomEffect}
                    disabled={!effectName || !selectedEffect || !selectedPalette || isCreatingEffect}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingEffect ? "Creating..." : "Add Effect"}
                  </button>
                </div>
              </div>
            )}
            
            {/* Custom Effects Grid */}
            {customEffects.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {customEffects.map((effect) => (
                  <CustomEffectCard
                    key={effect.id}
                    effect={effect}
                    isActive={activePreset === effect.id}
                    onClick={onPresetSelect}
                    onRemove={removeCustomEffect}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PresetGrid;
