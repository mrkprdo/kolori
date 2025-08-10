import React from "react";

export default function DeviceForm({
  isOpen,
  onClose,
  newDevice,
  onDeviceChange,
  onAddDevice,
  isDark,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        className={`max-w-md w-full mx-4 rounded-lg p-6 ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <h3
          className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : ""}`}
        >
          Add WLED Device
        </h3>

        <div className="space-y-4">
          <div>
            <label
              className={`block text-sm mb-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Device Name
            </label>
            <input
              type="text"
              value={newDevice.name}
              onChange={(e) =>
                onDeviceChange({ ...newDevice, name: e.target.value })
              }
              placeholder="e.g., Bedroom LEDs"
              className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm mb-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              IP Address
            </label>
            <input
              type="text"
              value={newDevice.ip}
              onChange={(e) =>
                onDeviceChange({ ...newDevice, ip: e.target.value })
              }
              placeholder="192.168.1.100"
              className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm mb-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Description (Optional)
            </label>
            <input
              type="text"
              value={newDevice.description || ""}
              onChange={(e) =>
                onDeviceChange({ ...newDevice, description: e.target.value })
              }
              placeholder="e.g., Under cabinet lighting"
              className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className={`flex-1 py-2 px-4 rounded transition-colors ${
              isDark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onAddDevice}
            disabled={!newDevice.name || !newDevice.ip}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Device
          </button>
        </div>
      </div>
    </div>
  );
}
