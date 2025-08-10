import React from "react";
import { X, Github, Palette } from "lucide-react";

export default function AboutModal({ isOpen, onClose, isDark }) {
  if (!isOpen) return null;

  const openGitHub = () => {
    window.open('https://github.com/mrkprdo/kolori', '_blank');
  };

  const openProfile = () => {
    window.open('https://github.com/mrkprdo', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-lg rounded-2xl overflow-hidden ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                <Palette size={24} className="text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  About Kolori
                </h2>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  v1.0.0
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full text-xl leading-none ${
                isDark ? "hover:bg-gray-800 text-white" : "hover:bg-gray-100"
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 space-y-6 ${isDark ? "text-white" : "text-gray-900"}`}>
          {/* Description */}
          <div className="text-center space-y-3">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Kolori
            </div>
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              A modern, intuitive web interface for controlling WLED devices with style and ease.
            </p>
          </div>

          {/* Developer */}
          <div className={`text-center p-4 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-gray-50"
          }`}>
            <p className="text-sm mb-3">Developed with ❤️ by</p>
            <button
              onClick={openProfile}
              className={`font-semibold hover:underline ${
                isDark ? "text-blue-400" : "text-blue-600"
              }`}
            >
              @mrkprdo
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={openGitHub}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Github size={20} />
              View on GitHub
            </button>
            
            <div className={`text-center text-xs ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}>
              <p>This is an open-source project. Contributions are welcome!</p>
              <p className="mt-1">WLED is a trademark of the WLED project.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}