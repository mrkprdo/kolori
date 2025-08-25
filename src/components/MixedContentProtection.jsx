import { Shield, CheckCircle, Globe, Wifi, ArrowRight } from "lucide-react";
import { useTranslations } from "../hooks/useTranslations.jsx";

export default function MixedContentProtection({ isDark, onAccept }) {
  const { t } = useTranslations();
  const isHttps = window.location.protocol === 'https:';
  
  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
    }`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${
              isDark ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-600"
            }`}>
              <Shield size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">{t("mixed_content_protection_title")}</h1>
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {t("mixed_content_protection_subtitle")}
          </p>
        </div>

        {/* Status Card */}
        <div className={`rounded-xl p-6 mb-6 border ${
          isDark 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Globe size={24} className={isDark ? "text-blue-400" : "text-blue-600"} />
              <span className="font-semibold">{t("current_connection")}</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isHttps 
                ? isDark 
                  ? "bg-green-900 text-green-300" 
                  : "bg-green-100 text-green-800"
                : isDark
                  ? "bg-orange-900 text-orange-300"
                  : "bg-orange-100 text-orange-800"
            }`}>
              {isHttps ? `🔒 ${t("https")}` : `🔓 ${t("http")}`}
            </div>
          </div>
          
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            <p className="mb-2">
              <strong>{t("current_url")}:</strong> {window.location.href}
            </p>
            <p>
              <strong>{t("protocol")}:</strong> {isHttps ? t("secure_connection") : t("standard_connection")}
            </p>
          </div>
        </div>

        {/* Protection Info */}
        <div className={`rounded-xl p-6 mb-6 border ${
          isDark 
            ? "bg-gray-800 border-gray-700" 
            : "bg-white border-gray-200"
        }`}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wifi size={20} />
            {t("how_device_communication_works")}
          </h2>
          
          <div className="space-y-4">
            {isHttps ? (
              <>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {t("mixed_content_protection_active")}
                    </p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {t("mixed_content_protection_active_explanation")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400">
                      {t("enhanced_security")}
                    </p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {t("enhanced_security_explanation")}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    {t("direct_communication")}
                  </p>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {t("direct_communication_explanation")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* What This Means */}
        <div className={`rounded-xl p-6 mb-8 ${
          isDark 
            ? "bg-blue-900/20 border border-blue-800" 
            : "bg-blue-50 border border-blue-200"
        }`}>
          <h3 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">
            {t("what_this_means_for_you")}:
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("full_access_to_wled")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("real_time_control")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("websocket_updates")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{t("no_additional_config")}</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={onAccept}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center gap-3 mx-auto ${
              isDark
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {t("i_understand_continue")}
            <ArrowRight size={20} />
          </button>
          
          <p className={`mt-6 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            {t("local_network_acknowledgement")}
          </p>
        </div>
      </div>
    </div>
  );
}