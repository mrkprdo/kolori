import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function Notification({ 
  isVisible, 
  type = "success", 
  title, 
  message, 
  onClose,
  autoClose = true,
  duration = 4000,
  isDark
}) {
  const timerRef = useRef(null);

  // Simple auto-close timer
  useEffect(() => {
    if (isVisible && autoClose) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, autoClose, duration]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-green-500" />;
      case "error":
        return <XCircle size={20} className="text-red-500" />;
      default:
        return <CheckCircle size={20} className="text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return isDark ? "border-green-700 bg-green-900 text-green-200" : "border-green-500 bg-green-50";
      case "error":
        return isDark ? "border-red-700 bg-red-900 text-red-200" : "border-red-500 bg-red-50";
      default:
        return isDark ? "border-blue-700 bg-blue-900 text-blue-200" : "border-blue-500 bg-blue-50";
    }
  };

  const isNativePlatform = Capacitor.isNativePlatform();
  
  return (
    <div 
      className="fixed z-50 top-4 right-4 transform translate-x-0 opacity-100 transition-all duration-300"
    >
      <div
        className={`max-w-sm w-full shadow-lg rounded-lg border-l-4 p-4 ${getColors()}`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            {title && (
              <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"} mb-1`}>
                {title}
              </div>
            )}
            {message && (
              <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {message}
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-500"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}