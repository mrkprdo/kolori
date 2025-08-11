import { Settings, Wifi, WifiOff, Sun, Moon, Sunrise } from "lucide-react";
import { logger } from "../utils/logger";

export default function Header({
  deviceName,
  isConnected,
  devices,
  activeDeviceId,
  setActiveDeviceId,
  setShowSettings,
  isDark,
  scheduleMode,
}) {
  return (
    <div
      className={`shadow-sm border-b p-4 ${
        isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Kolori
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-lg text-xs font-medium max-w-[80px] truncate ${
                isConnected
                  ? isDark 
                    ? "bg-green-900 text-green-200" 
                    : "bg-green-100 text-green-800"
                  : isDark
                    ? "bg-red-900 text-red-200"
                    : "bg-red-100 text-red-800"
              }`}
              title={deviceName}
            >
              {deviceName.length > 12 ? `${deviceName.slice(0, 12)}...` : deviceName}
            </span>
            {devices.length > 1 && (
              <select
                value={activeDeviceId}
                onChange={(e) => {
                  const deviceId = parseInt(e.target.value);
                  const device = devices.find(d => d.id === deviceId);
                  logger.log('🔄 Device switched to:', device?.name);
                  setActiveDeviceId(deviceId);
                }}
                className={`text-xs px-2 py-1 rounded border ${
                  isDark
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-white border-gray-300"
                }`}
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scheduleMode && scheduleMode !== "off" && (
            <div className="relative">
              {scheduleMode === "day" && <Sunrise size={20} className="text-yellow-600" />}
              {scheduleMode === "night" && <Moon size={20} className="text-purple-600" />}
              {scheduleMode === "all-day" && <Sun size={20} className="text-blue-600" />}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                scheduleMode === "day" ? "bg-yellow-500" :
                scheduleMode === "night" ? "bg-purple-500" :
                "bg-blue-500"
              }`}></div>
            </div>
          )}
          <div className="relative">
            {isConnected ? (
              <Wifi size={20} className="text-green-600" />
            ) : (
              <WifiOff size={20} className="text-red-600" />
            )}
            <div
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
          </div>
          <button
            onClick={() => {
              logger.log('⚙️ Settings opened');
              setShowSettings(true);
            }}
            className={`p-2 rounded-full opacity-50 hover:opacity-100 transition-opacity ${
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
            }`}
          >
            <Settings size={18} className={isDark ? "text-gray-400" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
