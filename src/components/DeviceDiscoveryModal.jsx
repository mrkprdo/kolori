import { useState, useEffect } from "react";
import { X, Wifi, Loader2, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { logger } from "../utils/logger";
import { useTranslations } from "../hooks/useTranslations.jsx";

export default function DeviceDiscoveryModal({ isOpen, onClose, onDeviceSelect, isDark, savedDevices = [] }) {
  const { t } = useTranslations();
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [addingDevices, setAddingDevices] = useState(new Set()); // Track which devices are being added

  // Check if a discovered device already exists in saved devices (by IP only)
  const isDeviceAlreadySaved = (discoveredDevice) => {
    return savedDevices.some(savedDevice => 
      savedDevice.ip === discoveredDevice.ip
    );
  };

  // Get current network IP using WebRTC
  const getCurrentNetworkIP = () => {
    return new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      const timeout = setTimeout(() => {
        pc.close();
        reject(new Error("Timed out while trying to determine local IP"));
      }, 5000);
      
      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          const candidate = ice.candidate.candidate;
          const ipMatch = candidate.match(/(192\.168\.[0-9]{1,3}\.[0-9]{1,3}|10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})/);
          if (ipMatch) {
            clearTimeout(timeout);
            pc.close();
            resolve(ipMatch[0]);
          }
        }
      };
      
      pc.onicecandidateerror = () => {
        clearTimeout(timeout);
        pc.close();
        reject(new Error("Could not determine local network IP"));
      };
    });
  };

  // Check if a device is a WLED device
  const checkWLEDDevice = async (ip) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://${ip}/json/info`, {
        signal: controller.signal,
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const info = await response.json();
        return {
          ip,
          name: info.name || `WLED Device (${ip})`,
          version: info.ver || 'Unknown',
          mac: info.mac || 'Unknown',
          brand: info.brand || 'WLED',
        };
      }
    } catch (error) {
      // Expected for non-WLED devices
    }
    return null;
  };

  // Scan network for WLED devices
  const scanForDevices = async () => {
    setScanning(true);
    setDiscoveredDevices([]);
    setScanStatus("scanning");
    setScanProgress(0);

    try {
      logger.log("🔍 Getting current network IP...");
      const currentIP = await getCurrentNetworkIP();
      logger.log("📍 Current IP:", currentIP);
      
      const networkBase = currentIP.substring(0, currentIP.lastIndexOf('.'));
      logger.log("🌐 Scanning network:", networkBase + ".x");
      
      const batchSize = 10;
      const totalIPs = 255;
      
      for (let i = 1; i <= totalIPs; i += batchSize) {
        const batch = [];
        
        for (let j = i; j < Math.min(i + batchSize, totalIPs + 1); j++) {
          const ip = `${networkBase}.${j}`;
          batch.push(
            checkWLEDDevice(ip).then(device => {
              setScanProgress(prev => prev + (100 / totalIPs));
              return device;
            })
          );
        }
        
        const batchResults = await Promise.all(batch);
        const validDevices = batchResults.filter(device => device !== null);
        
        if (validDevices.length > 0) {
          logger.log("✅ Found WLED devices:", validDevices);
          setDiscoveredDevices(prev => [...prev, ...validDevices]);
        }
        
        // Small delay between batches to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setScanStatus("complete");
    } catch (error) {
      logger.error("❌ Error scanning for devices:", error);
      setScanStatus("error");
    } finally {
      setScanning(false);
    }
  };

  const handleDeviceSelect = (device) => {
    onDeviceSelect(device);
    onClose();
  };

  const handleAddNewDevice = async (device) => {
    const deviceKey = `${device.ip}-${device.name}`;
    
    // Set loading state for this device
    setAddingDevices(prev => new Set(prev).add(deviceKey));
    
    try {
      logger.log("🚀 Auto-adding device:", device.name, device.ip);
      
      // Create the device object with discovered info
      const newDeviceData = {
        name: device.name,
        ip: device.ip,
        protocol: "http", // Default to HTTP for WLED devices
        mdns: "",
        autoAdd: true
      };
      
      // Call the parent's device selection handler with auto-add flag
      onDeviceSelect(newDeviceData);
      
      // Close modal after successful add
      onClose();
      
    } catch (error) {
      logger.error("❌ Error auto-adding device:", error);
      // Remove loading state on error
      setAddingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceKey);
        return newSet;
      });
    }
  };

  const handleStartScan = () => {
    scanForDevices();
  };

  // Auto-start scan when modal opens and reset when it closes
  useEffect(() => {
    if (isOpen) {
      // Start scanning immediately when modal opens
      scanForDevices();
    } else {
      // Reset state when modal closes
      setScanning(false);
      setScanStatus("idle");
      setScanProgress(0);
      setDiscoveredDevices([]);
      setAddingDevices(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl ${
        isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("device_discovery")}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {scanStatus === "scanning" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 size={20} className="animate-spin text-green-500" />
                  <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {t("scanning_network")}
                  </span>
                </div>
                <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2`}>
                  <div 
                    className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {Math.round(scanProgress)}% complete
                </p>
                
                {discoveredDevices.length > 0 && (
                  <p className={`text-sm ${isDark ? "text-green-400" : "text-green-600"} font-medium`}>
                    {t("scan_complete", { count: discoveredDevices.length })}
                  </p>
                )}
              </div>
            </div>
          )}

          {scanStatus === "complete" && (
            <div className="text-center space-y-4">
              {discoveredDevices.length > 0 ? (
                <>
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                    isDark ? "bg-green-100" : "bg-green-100"
                  }`}>
                    <CheckCircle size={32} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {t("scan_complete", { count: discoveredDevices.length })}
                    </h3>
                    <div className="space-y-2">
                      {discoveredDevices.map((device, index) => {
                        const isAlreadySaved = isDeviceAlreadySaved(device);
                        const deviceKey = `${device.ip}-${device.name}`;
                        const isAdding = addingDevices.has(deviceKey);
                        return (
                          <div
                            key={index}
                            className={`p-2 rounded-lg border cursor-pointer hover:bg-opacity-50 ${
                              isDark 
                                ? "bg-gray-700 border-gray-600 hover:bg-gray-600" 
                                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                            }`}
                            onClick={() => handleDeviceSelect(device)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {device.name}
                                  </p>
                                  {!isAlreadySaved && (
                                    <span className="text-xs text-red-500 font-bold">
                                      * {t("new")}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"} text-left`}>
                                  {device.ip} • v{device.version}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAlreadySaved ? (
                                  <CheckCircle size={14} className="text-green-500" />
                                ) : isAdding ? (
                                  <div className="flex items-center gap-1">
                                    <Loader2 size={12} className="animate-spin text-blue-500" />
                                    <span className="text-xs text-blue-500">{t("adding")}</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddNewDevice(device);
                                    }}
                                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                  >
                                    {t("add")}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                    isDark ? "bg-yellow-100" : "bg-yellow-100"
                  }`}>
                    <AlertCircle size={32} className="text-yellow-500" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {t("no_devices_found")}
                    </h3>
                    <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {t("no_devices_found_explanation")}
                    </p>
                    <button
                      onClick={handleStartScan}
                      className="bg-gradient-to-r from-green-500 to-teal-500 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-teal-600 transition-all"
                    >
                      {t("scan_again")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {scanStatus === "error" && (
            <div className="text-center space-y-4">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                isDark ? "bg-red-100" : "bg-red-100"
              }`}>
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div>
                <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {t("scan_failed")}
                </h3>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("scan_failed_explanation")}
                </p>
                <button
                  onClick={handleStartScan}
                  className="bg-gradient-to-r from-green-500 to-teal-500 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-teal-600 transition-all"
                >
                  {t("try_again")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}