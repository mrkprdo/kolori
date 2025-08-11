import { WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

export default function DisconnectedOverlay({ 
  isVisible, 
  deviceName, 
  onRetry, 
  isDark,
  isRetrying = false 
}) {
  if (!isVisible) return null;

  return (
    <div className={`absolute inset-0 z-40 flex items-center justify-center ${
      isDark ? "bg-gray-900/95" : "bg-white/95"
    } backdrop-blur-sm`}>
      <div className={`max-w-md w-full mx-4 p-6 rounded-2xl text-center ${
        isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
      } shadow-xl`}>
        {/* Icon */}
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isDark ? "bg-red-900/50" : "bg-red-100"
        }`}>
          <WifiOff size={32} className="text-red-500" />
        </div>

        {/* Title */}
        <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          Device Disconnected
        </h3>

        {/* Message */}
        <p className={`text-sm mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          <span className="font-medium">{deviceName}</span> is currently offline. 
          Preset controls are disabled until the connection is restored.
        </p>

        {/* Status indicators */}
        <div className={`flex items-center justify-center gap-2 mb-6 p-3 rounded-lg ${
          isDark ? "bg-gray-700/50" : "bg-gray-50"
        }`}>
          <AlertTriangle size={16} className="text-amber-500" />
          <span className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Connection lost • Retrying automatically
          </span>
        </div>

        {/* Retry button */}
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isRetrying
              ? isDark 
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          <RefreshCw size={16} className={isRetrying ? "animate-spin" : ""} />
          {isRetrying ? "Checking Connection..." : "Check Connection Now"}
        </button>

        {/* Help text */}
        <p className={`text-xs mt-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Make sure the device is powered on and connected to the same network
        </p>
      </div>
    </div>
  );
}