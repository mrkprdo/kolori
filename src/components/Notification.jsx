import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

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
  const [isShowing, setIsShowing] = useState(false);

  const handleClose = useCallback(() => {
    setIsShowing(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, autoClose, duration, handleClose]);

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

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isShowing 
          ? "transform translate-x-0 opacity-100" 
          : "transform translate-x-full opacity-0"
      }`}
      style={{
        top: 'calc(env(safe-area-inset-top) + 1rem)',
        right: 'calc(env(safe-area-inset-right) + 1rem)',
      }}
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
              onClick={handleClose}
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