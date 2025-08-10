import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDark,
  isDestructive = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`max-w-md w-full rounded-2xl overflow-hidden ${
          isDark ? "bg-gray-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isDestructive 
                  ? "bg-red-100 text-red-600" 
                  : "bg-blue-100 text-blue-600"
              }`}>
                <AlertTriangle size={24} />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {title}
              </h2>
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
        <div className={`p-6 ${isDark ? "text-white" : "text-gray-900"}`}>
          <p className={`text-sm leading-relaxed ${
            isDark ? "text-gray-300" : "text-gray-600"
          }`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className={`p-6 border-t flex gap-3 ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}>
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
              isDark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-white transition-colors ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}