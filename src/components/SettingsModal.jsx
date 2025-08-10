import React, { useState } from "react";
import { Plus, Check, Power, Trash2, Wifi, WifiOff, CircleDot, ExternalLink, Info, Calendar } from "lucide-react";
import DeviceForm from "./DeviceForm";
import AboutModal from "./AboutModal";

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  devices,
  activeDeviceId,
  onSetActiveDevice,
  onConnectDevice,
  onRemoveDevice,
  showDeviceForm,
  onShowDeviceForm,
  onHideDeviceForm,
  newDevice,
  onNewDeviceChange,
  onAddDevice,
  isDark,
  wledVersion,
  onWledVersionChange,
  scheduleMode,
  onScheduleChange,
}) {
  const [showAbout, setShowAbout] = useState(false);
  
  if (!isOpen) return null;

  const openWledInterface = (deviceIp) => {
    window.open(`http://${deviceIp}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div
          className={`p-4 border-b ${
            isDark ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}
            >
              Settings
            </h2>
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
          className={`p-4 pb-6 overflow-y-auto space-y-6 max-h-[80vh] ${
            isDark ? "text-white" : ""
          }`}
        >
          {/* Device Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">WLED Devices</h3>
              <button
                onClick={onShowDeviceForm}
                className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1"
              >
                <Plus size={14} />
                Add Device
              </button>
            </div>

            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`border rounded-lg p-4 ${
                    isDark
                      ? "border-gray-700 bg-gray-800"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{device.name}</h4>
                        <div className="flex items-center gap-1">
                          {device.isConnected ? (
                            <Wifi size={16} className="text-green-600" title="Connected" />
                          ) : (
                            <WifiOff size={16} className="text-red-600" title="Disconnected" />
                          )}
                          {activeDeviceId === device.id && (
                            <CircleDot size={16} className="text-blue-600" title="Active Device" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {device.ip}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openWledInterface(device.ip)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark
                            ? "bg-blue-900 text-blue-300 hover:bg-blue-800"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                        title="Open WLED web interface"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={() => onSetActiveDevice(device.id)}
                        disabled={activeDeviceId === device.id}
                        className={`p-2 rounded-lg transition-colors ${
                          activeDeviceId === device.id
                            ? "bg-blue-100 text-blue-800 cursor-not-allowed"
                            : isDark
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        title="Select as active device"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => onConnectDevice(device.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          device.isConnected
                            ? isDark
                              ? "bg-red-900 text-red-300 hover:bg-red-800"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                            : isDark
                              ? "bg-green-900 text-green-300 hover:bg-green-800"
                              : "bg-green-100 text-green-800 hover:bg-green-200"
                        }`}
                        title={device.isConnected ? "Disconnect device" : "Connect device"}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => onRemoveDevice(device.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark
                            ? "bg-red-900 text-red-300 hover:bg-red-800"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                        title="Remove device"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WLED Version Settings */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">WLED Version</h3>
            <select
              value={wledVersion}
              onChange={(e) => onWledVersionChange(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="0.15.x">v0.15.x (Latest)</option>
              <option value="0.14.x">v0.14.x</option>
              <option value="0.13.x">v0.13.x</option>
              <option value="0.12.x">v0.12.x</option>
            </select>
          </div>

          {/* Theme Settings */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Appearance</h3>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Schedule Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <h3 className="font-semibold">Schedule</h3>
            </div>
            <select
              value={scheduleMode}
              onChange={(e) => onScheduleChange(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="all-day">All Day</option>
              <option value="day">Day 7am-7pm</option>
              <option value="night">Night 7pm-7am</option>
            </select>
          </div>

          {/* About Section */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">About</h3>
            <button
              onClick={() => setShowAbout(true)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Info size={16} />
              App Info
            </button>
          </div>
        </div>
      </div>

      {/* About Modal */}
      <AboutModal 
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        isDark={isDark}
      />

      {/* Device Form Modal */}
      <DeviceForm
        isOpen={showDeviceForm}
        onClose={onHideDeviceForm}
        newDevice={newDevice}
        onDeviceChange={onNewDeviceChange}
        onAddDevice={onAddDevice}
        isDark={isDark}
      />
    </div>
  );
}
