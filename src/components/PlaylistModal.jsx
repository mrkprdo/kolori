import React, { useState } from "react";
import { Music, Plus, Trash2, GripVertical, Save } from "lucide-react";
import SavePlaylistModal from "./SavePlaylistModal";

export default function PlaylistModal({
  isOpen,
  onClose,
  currentPlaylist,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onReorderPlaylist,
  onSavePlaylist,
  customEffects,
  isDark,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  if (!isOpen) return null;

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPlaylist = [...currentPlaylist];
    const draggedItem = newPlaylist[draggedIndex];
    
    // Remove the dragged item
    newPlaylist.splice(draggedIndex, 1);
    
    // Insert it at the new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newPlaylist.splice(insertIndex, 0, draggedItem);
    
    onReorderPlaylist(newPlaylist);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
                  key={item.playlistItemId || item.id || `item-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-lg p-3 flex items-center gap-3 transition-all duration-200 cursor-move ${
                    draggedIndex === index
                      ? isDark 
                        ? "bg-gray-700 opacity-50 transform rotate-2" 
                        : "bg-gray-200 opacity-50 transform rotate-2"
                      : dragOverIndex === index
                      ? isDark
                        ? "bg-gray-700 border-2 border-blue-500"
                        : "bg-blue-50 border-2 border-blue-500"
                      : isDark 
                        ? "bg-gray-800" 
                        : "bg-gray-50"
                  } ${
                    draggedIndex !== null && draggedIndex !== index
                      ? "hover:bg-opacity-80"
                      : ""
                  }`}
                >
                  <GripVertical 
                    size={16} 
                    className={`text-gray-400 ${
                      draggedIndex === index ? "text-blue-500" : ""
                    }`} 
                  />
                  <div
                    className="w-6 h-6 rounded"
                    style={{ background: item.gradient }}
                  ></div>
                  <div className="flex-1 pointer-events-none">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.duration}s duration
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFromPlaylist(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded pointer-events-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  <Save size={16} />
                  Save Playlist
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Music size={48} className="mx-auto mb-4 opacity-50" />
              <div>No effects in playlist</div>
              <div className="text-sm">Add custom effects below to build your playlist</div>
            </div>
          )}

          <div
            className={`border-t pt-4 mt-4 ${
              isDark ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <h3 className="font-semibold mb-3">Add Custom Effects</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {customEffects && customEffects.length > 0 ? (
                customEffects.map((effect) => (
                  <button
                    key={effect.id}
                    onClick={() => onAddToPlaylist(effect)}
                    className={`w-full border rounded-lg p-3 flex items-center gap-3 ${
                      isDark
                        ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded"
                      style={{ background: effect.gradient }}
                    ></div>
                    <div className="flex-1 text-left text-sm">{effect.name}</div>
                    <Plus size={14} />
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Plus size={48} className="mx-auto mb-4 opacity-50" />
                  <div>No custom effects yet</div>
                  <div className="text-sm">Create custom effects from the main screen to add them to playlists</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Playlist Modal */}
      <SavePlaylistModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={(playlistName) => {
          onSavePlaylist(playlistName);
          setShowSaveModal(false);
        }}
        currentPlaylist={currentPlaylist}
        isDark={isDark}
      />
    </div>
  );
}
