import { Shield, CheckCircle, Globe, Wifi, ArrowRight } from "lucide-react";

export default function MixedContentProtection({ isDark, onAccept }) {
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
          <h1 className="text-3xl font-bold mb-2">Mixed Content Protection</h1>
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Ensuring secure communication with your WLED devices
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
              <span className="font-semibold">Current Connection</span>
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
              {isHttps ? '🔒 HTTPS' : '🔓 HTTP'}
            </div>
          </div>
          
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            <p className="mb-2">
              <strong>Current URL:</strong> {window.location.href}
            </p>
            <p>
              <strong>Protocol:</strong> {isHttps ? 'Secure (HTTPS)' : 'Standard (HTTP)'}
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
            How Device Communication Works
          </h2>
          
          <div className="space-y-4">
            {isHttps ? (
              <>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Mixed Content Protection Active
                    </p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      This app runs in a special protected iframe that allows secure communication 
                      with HTTP WLED devices even when served over HTTPS.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400">
                      Enhanced Security
                    </p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Your connection to this website remains secure while allowing local 
                      device communication through controlled permissions.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    Direct Communication
                  </p>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Since this app is served over HTTP, it can communicate directly with 
                    your WLED devices without any restrictions.
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
            What this means for you:
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Full access to control your WLED devices</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>Real-time preset activation and effect control</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>WebSocket connections for live updates</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>No additional configuration required</span>
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
            I Understand, Continue
            <ArrowRight size={20} />
          </button>
          
          <p className={`mt-6 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            By continuing, you acknowledge that this app will communicate with devices on your local network.
          </p>
        </div>
      </div>
    </div>
  );
}