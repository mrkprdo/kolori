import { useState } from "react";
import { Plus, Check, Trash2, Wifi, WifiOff, CircleDot, ExternalLink, Info, Calendar, Sun, Moon, Clock, Monitor, Palette, Pencil, X, Download, Loader2, RotateCw, RefreshCw, Settings, Globe } from "lucide-react";
import DeviceForm from "./DeviceForm";
import AboutModal from "./AboutModal";
import DeviceDiscoveryModal from "./DeviceDiscoveryModal";
import { useTranslations } from "../hooks/useTranslations.jsx";

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  devices,
  activeDeviceId,
  onSetActiveDevice,
  onRemoveDevice,
  onUpdateDevice,
  showDeviceForm,
  onShowDeviceForm,
  onHideDeviceForm,
  newDevice,
  onNewDeviceChange,
  onAddDevice,
  onAutoAddDevice,
  isDark,
  scheduleMode,
  onScheduleChange,
  onManualTurnOn,
  onManualTurnOff,
  onTestScheduleLogic,
  onFetchWledPresets,
}) {
  const { t, setLanguage, language } = useTranslations();
  const [showAbout, setShowAbout] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");

  if (!isOpen) return null;

  const openWledInterface = (device) => {
    const protocol = device.protocol || 'http';
    window.open(`${protocol}://${device.ip}`, '_blank');
  };

  const handleEditClick = (device) => {
    setEditingDeviceId(device.id);
    setNewDeviceName(device.name);
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setNewDeviceName("");
  };

  const handleSaveEdit = (deviceId) => {
    if (newDeviceName.trim() === "") return;
    onUpdateDevice(deviceId, { name: newDeviceName.trim() });
    setEditingDeviceId(null);
    setNewDeviceName("");
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
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`text-lg font-semibold ${isDark ? "text-white" : ""}`}
            >
              {t("settings")}
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
          
          {/* Tab Navigation */}
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab("devices")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "devices"
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                  : isDark
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Monitor size={16} className="inline mr-2" />
              {t("devices")}
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "config"
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700"
                  : isDark
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Settings size={16} className="inline mr-2" />
              {t("config")}
            </button>
          </div>
        </div>

        <div
          className={`p-4 pb-6 overflow-y-auto space-y-6 max-h-[80vh] ${
            isDark ? "text-white" : ""
          }`}
        >
          {/* Devices Tab */}
          {activeTab === "devices" && (
            <div className="space-y-6">
              {/* Device Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t("wled_devices")}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDiscoveryModal(true)}
                  className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 hover:bg-green-600 transition-colors sm:px-3 sm:text-sm"
                >
                  <RefreshCw size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">{t("scan_for_devices")}</span>
                  <span className="xs:hidden">{t("scan")}</span>
                </button>
                <button
                  onClick={onShowDeviceForm}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 hover:bg-blue-600 transition-colors sm:px-3 sm:text-sm"
                >
                  <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">{t("add_device")}</span>
                  <span className="xs:hidden">{t("add")}</span>
                </button>
              </div>
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
                      {editingDeviceId === device.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newDeviceName}
                            onChange={(e) => setNewDeviceName(e.target.value)}
                            className={`w-full max-w-xs px-2 py-1 rounded-md border ${
                              isDark
                                ? "bg-gray-700 border-gray-600 text-white"
                                : "bg-white border-gray-300"
                            }`}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{device.name}</h4>
                          <div className="flex items-center gap-1">
                            {device.isConnected ? (
                              <Wifi size={16} className="text-green-600" title={t("connected")} />
                            ) : (
                              <WifiOff size={16} className="text-red-600" title={t("disconnected")} />
                            )}
                            {activeDeviceId === device.id && (
                              <CircleDot size={16} className="text-blue-600" title={t("active_device")} />
                            )}
                          </div>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {device.ip}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {editingDeviceId === device.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(device.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "bg-green-900 text-green-300 hover:bg-green-800"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            }`}
                            title={t("save_changes")}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title={t("cancel_editing")}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onFetchWledPresets()}
                            disabled={!device.isConnected}
                            className={`p-2 rounded-lg transition-colors ${
                              !device.isConnected
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : isDark
                                ? "bg-purple-900 text-purple-200 hover:bg-purple-800"
                                : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                            }`}
                            title={t("sync_wled_presets")}
                          >
                            <RotateCw size={14} />
                          </button>
                          <button
                            onClick={() => openWledInterface(device)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "bg-blue-900 text-blue-300 hover:bg-blue-800"
                                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            }`}
                            title={t("open_wled_interface")}
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={() => handleEditClick(device)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            title={t("edit_device_name")}
                          >
                            <Pencil size={14} />
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
                            title={t("select_active_device")}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => onRemoveDevice(device.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "bg-red-900 text-red-300 hover:bg-red-800"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                            title={t("remove_device")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

            </div>
          )}

          {/* Config Tab */}
          {activeTab === "config" && (
            <div className="space-y-6">
              {/* Schedule Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{t("schedule")}</h3>
              </div>
              <div className="flex items-center gap-2">
                
                <select
                  value={scheduleMode}
                  onChange={(e) => onScheduleChange(e.target.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    isDark
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <option value="all-day">🕐 All Day</option>
                  <option value="day">☀️ Day 7am-7pm</option>
                  <option value="night">🌙 Night 7pm-7am</option>
                </select>
              </div>
            </div>
            
            {/* Manual Control Buttons for Testing */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("manual_control_testing")}</span>
              <div className="flex gap-2">
                <button
                  onClick={onManualTurnOn}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    isDark
                      ? "bg-green-900 text-green-200 hover:bg-green-800"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
                  }`}
                >
                  {t("turn_on")}
                </button>
                <button
                  onClick={onManualTurnOff}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    isDark
                      ? "bg-red-900 text-red-200 hover:bg-red-800"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}
                >
                  {t("turn_off")}
                </button>
              </div>
            </div>

            {/* Schedule Debug Button */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t("schedule_debug")}</span>
              <button
                onClick={onTestScheduleLogic}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  isDark
                    ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                }`}
              >
                🧪 {t("test_schedule")}
              </button>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette size={16} />
              <h3 className="font-semibold">{t("appearance")}</h3>
            </div>
            <select
              value={theme}
              onChange={(e) => onThemeChange(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize border ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="light">☀️ Light</option>
              <option value="dark">🌙 Dark</option>
              <option value="system">🖥️ System</option>
            </select>
          </div>

          {/* Language Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} />
              <h3 className="font-semibold">{t("language")}</h3>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              }`}
            >
              <option value="en">🇺🇸 English</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>

          {/* About Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={16} />
              <h3 className="font-semibold">{t("about")}</h3>
            </div>
            <button
              onClick={() => setShowAbout(true)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isDark
                  ? "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t("app_info")}
            </button>
          </div>
            </div>
          )}
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

      {/* Device Discovery Modal */}
      <DeviceDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        onDeviceSelect={(deviceData) => {
          if (deviceData && deviceData.autoAdd) {
            // Handle auto-add devices by calling the parent's auto-add handler
            // We need to pass this through props
            if (onAutoAddDevice) {
              onAutoAddDevice(deviceData);
            }
          } else {
            // Handle manual device selection (open form)
            onShowDeviceForm();
          }
        }}
        isDark={isDark}
        savedDevices={devices}
      />
    </div>
  );
}
