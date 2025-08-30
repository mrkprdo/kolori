import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function DeviceForm({
  isOpen,
  onClose,
  newDevice,
  onDeviceChange,
  onAddDevice,
  isDark,
}) {
  if (!isOpen) return null;

  // IP address validation function
  const isValidIP = (ip) => {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  // mDNS name validation function  
  const isValidMdns = (mdns) => {
    if (!mdns) return true; // Optional field
    // Allow hostnames with dots (e.g., wled-device.local, subdomain.domain.local)
    // Basic validation: letters, numbers, hyphens, dots, no consecutive dots or hyphens
    const mdnsPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,250}[a-zA-Z0-9])?$/;
    // Check for invalid patterns like consecutive dots or hyphens
    const hasConsecutiveDots = /\.\./.test(mdns);
    const hasConsecutiveHyphens = /--/.test(mdns);
    const startsOrEndsWithDotOrHyphen = /^[\.\-]|[\.\-]$/.test(mdns);
    
    return mdnsPattern.test(mdns) && !hasConsecutiveDots && !hasConsecutiveHyphens && !startsOrEndsWithDotOrHyphen;
  };

  // Check if at least one connection method is provided
  const hasValidConnection = () => {
    return (newDevice.ip && isValidIP(newDevice.ip)) || 
           (newDevice.mdns && isValidMdns(newDevice.mdns));
  };

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
              Device Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDevice.name}
              onChange={(e) => {
                const value = e.target.value.slice(0, 30); // Limit to 30 characters
                onDeviceChange({ ...newDevice, name: value });
              }}
              placeholder="e.g., Bedroom LEDs"
              maxLength={30}
              className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
            <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {newDevice.name.length}/30 characters
            </div>
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
              onChange={(e) => {
                const value = e.target.value;
                onDeviceChange({ ...newDevice, ip: value });
              }}
              placeholder="192.168.1.100"
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
              className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                newDevice.ip && !isValidIP(newDevice.ip)
                  ? "border-red-500 focus:ring-red-500"
                  : isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
            {newDevice.ip && !isValidIP(newDevice.ip) && (
              <div className="text-xs mt-1 text-red-500">
                Please enter a valid IP address (e.g., 192.168.1.100)
              </div>
            )}
          </div>

          <div>
            <label
              className={`block text-sm mb-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              mDNS Name
            </label>
            <input
              type="text"
              value={newDevice.mdns || ""}
              onChange={(e) => {
                const value = e.target.value;
                onDeviceChange({ ...newDevice, mdns: value });
              }}
              placeholder="wled-device or device.local"
              className={`w-full px-3 py-2 rounded border focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                newDevice.mdns && !isValidMdns(newDevice.mdns)
                  ? "border-red-500 focus:ring-red-500"
                  : isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
            {newDevice.mdns && !isValidMdns(newDevice.mdns) && (
              <div className="text-xs mt-1 text-red-500">
                Please enter a valid mDNS name (letters, numbers, hyphens, dots allowed)
              </div>
            )}
            <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Alternative to IP address. Examples: wled-device, device.local, subdomain.domain.local
            </div>
          </div>

          <div className={`p-3 rounded-lg ${isDark ? "bg-blue-900/20 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}>
            <div className={`text-sm ${isDark ? "text-blue-400" : "text-blue-600"}`}>
              <strong>Connection Options:</strong> Provide either an IP address OR mDNS name (or both). 
              The app will automatically test which one works and use the most reliable option.
            </div>
          </div>

          <div>
            <label
              className={`block text-sm mb-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Protocol
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="protocol"
                  value="http"
                  checked={newDevice.protocol === "http"}
                  onChange={(e) => onDeviceChange({ ...newDevice, protocol: e.target.value })}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  HTTP (Default)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="protocol"
                  value="https"
                  checked={newDevice.protocol === "https"}
                  onChange={(e) => onDeviceChange({ ...newDevice, protocol: e.target.value })}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  HTTPS (Secure)
                </span>
              </label>
            </div>
            <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Most WLED devices use HTTP. Use HTTPS only if your device supports SSL.
            </div>
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

        {/* Validation Message */}
        {(newDevice.validating || newDevice.validationMessage) && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            newDevice.validating 
              ? isDark ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-800"
              : newDevice.validationError
                ? isDark ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800"
                : isDark ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800"
          }`}>
            {newDevice.validating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : newDevice.validationError ? (
              <XCircle size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            <span className="text-sm">{newDevice.validationMessage}</span>
          </div>
        )}

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
            disabled={!newDevice.name || !hasValidConnection() || newDevice.validating}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {newDevice.validating && <Loader2 size={16} className="animate-spin" />}
            {newDevice.validating ? 'Validating...' : 'Add Device'}
          </button>
        </div>
      </div>
    </div>
  );
}
