import React, { useState, useEffect } from "react";
import { Play, Save, X, Music } from "lucide-react";

export default function SavePlaylistModal({
  isOpen,
  onClose,
  onSave,
  currentPlaylist,
  isDark,
}) {
  const [playlistName, setPlaylistName] = useState("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-generate a playlist name when modal opens
      const timestamp = new Date().toLocaleDateString();
      setPlaylistName(`My Playlist ${timestamp}`);
    }
  }, [isOpen]);

  useEffect(() => {
    // Validate playlist name
    setIsValid(playlistName.trim().length > 0 && playlistName.trim().length <= 50);
  }, [playlistName]);

  const handleSave = () => {
    if (isValid && currentPlaylist.length > 0) {
      onSave(playlistName.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setPlaylistName("");
    onClose();
  };

  if (!isOpen) return null;

  // Generate combined gradient from playlist items
  const generatePreviewGradient = () => {
    const gradients = currentPlaylist.slice(0, 3).map(item => item.gradient || '#6366f1');
    
    if (gradients.length === 0) {
      return 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    } else if (gradients.length === 1) {
      return `linear-gradient(135deg, ${gradients[0]}, ${gradients[0]})`;
    } else if (gradients.length === 2) {
      return `linear-gradient(135deg, ${gradients[0]}, ${gradients[1]})`;
    } else {
      return `linear-gradient(135deg, ${gradients[0]} 0%, ${gradients[1]} 50%, ${gradients[2]} 100%)`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-2xl overflow-hidden shadow-xl ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Save size={20} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Save Playlist
                </h2>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Create a new playlist with {currentPlaylist.length} effects
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-colors ${
                isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Playlist Preview */}
          <div className="space-y-3">
            <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Playlist Preview
            </label>
            <div
              className="w-full h-20 rounded-xl relative overflow-hidden shadow-inner"
              style={{ background: generatePreviewGradient() }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="relative z-10 p-4 h-full flex items-center justify-between">
                <div className="text-white">
                  <div className="font-semibold text-lg">
                    {playlistName || "Untitled Playlist"}
                  </div>
                  <div className="text-white/80 text-sm">
                    {currentPlaylist.length} custom effects
                  </div>
                </div>
                <Play size={24} className="text-white/80" />
              </div>
            </div>
          </div>

          {/* Playlist Name Input */}
          <div className="space-y-2">
            <label 
              htmlFor="playlistName"
              className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              Playlist Name
            </label>
            <input
              id="playlistName"
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Enter playlist name..."
              maxLength={50}
              className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
              } focus:outline-none focus:ring-0`}
            />
            <div className="flex justify-between items-center">
              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {playlistName.length}/50 characters
              </span>
              {!isValid && playlistName.length > 0 && (
                <span className="text-red-500 text-xs">
                  Please enter a valid name
                </span>
              )}
            </div>
          </div>

          {/* Effects List */}
          <div className="space-y-3">
            <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              Effects in Playlist
            </label>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {currentPlaylist.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isDark ? "bg-gray-800" : "bg-gray-50"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: item.gradient }}
                  ></div>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      {item.name}
                    </div>
                    <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {item.duration || 30}s duration
                    </div>
                  </div>
                  <Music size={14} className={isDark ? "text-gray-400" : "text-gray-500"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-6 border-t ${
            isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || currentPlaylist.length === 0}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isValid && currentPlaylist.length > 0
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : isDark
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Save size={16} />
              Save Playlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}