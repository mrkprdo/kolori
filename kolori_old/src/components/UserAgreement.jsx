import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, XCircle, Scroll } from "lucide-react";

export default function UserAgreement({ isDark, onAccept, onReject }) {
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleScroll = (e) => {
    const element = e.target;
    const isScrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isScrolledToBottom) {
      setHasScrolled(true);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark ? "bg-gray-900" : "bg-gray-50"
    }`}>
      <div className={`max-w-2xl w-full rounded-2xl shadow-2xl ${
        isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Shield size={28} className="text-blue-500" />
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Terms of Use & Privacy Agreement
            </h1>
          </div>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Please read carefully before using Kolori
          </p>
        </div>

        {/* Agreement Content */}
        <div 
          className={`p-6 max-h-96 overflow-y-auto ${isDark ? "text-gray-300" : "text-gray-700"}`}
          onScroll={handleScroll}
        >
          <div className="space-y-6">
            {/* Liability Disclaimer */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-red-500" />
                <h2 className={`text-lg font-semibold ${isDark ? "text-red-400" : "text-red-600"}`}>
                  Liability Disclaimer
                </h2>
              </div>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>IMPORTANT:</strong> By using Kolori, you acknowledge and agree that:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>No Warranty:</strong> This application is provided "as is" without any warranties, 
                    express or implied, including but not limited to warranties of merchantability, 
                    fitness for a particular purpose, or non-infringement.
                  </li>
                  <li>
                    <strong>Device Safety:</strong> I am not liable for any damage, malfunction, or 
                    failure of your WLED devices, LED strips, or any connected hardware that may 
                    result from using this application.
                  </li>
                  <li>
                    <strong>Property Damage:</strong> I am not responsible for any property damage, 
                    electrical issues, fire hazards, or personal injury that may occur from the 
                    use of this application with your LED devices.
                  </li>
                  <li>
                    <strong>Use at Your Own Risk:</strong> You use this application entirely at your 
                    own risk and responsibility.
                  </li>
                </ul>
              </div>
            </section>

            {/* WLED & Open Source */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Scroll size={20} className="text-blue-500" />
                <h2 className={`text-lg font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  WLED Integration & Open Source
                </h2>
              </div>
              <div className="text-sm space-y-3">
                <p>
                  Kolori is an open-source user interface wrapper for WLED devices and does not modify 
                  the core WLED firmware functionality. By proceeding, you agree that:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>You will use WLED devices and firmware "as is"</li>
                  <li>You understand that Kolori communicates with WLED via standard APIs</li>
                  <li>Any issues with WLED functionality should be addressed with the WLED project</li>
                  <li>You are responsible for ensuring your WLED devices are properly configured</li>
                  <li>This application is open-source and available for modification and distribution</li>
                  <li>You may freely use, study, modify, and distribute this software</li>
                </ul>
              </div>
            </section>

            {/* Privacy & Data Collection */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={20} className="text-green-500" />
                <h2 className={`text-lg font-semibold ${isDark ? "text-green-400" : "text-green-600"}`}>
                  Privacy & Data Collection
                </h2>
              </div>
              <div className="text-sm space-y-3">
                <p>
                  Your privacy is important. Here's what you need to know about data handling:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>No Cloud Storage:</strong> No data is transmitted to or stored on 
                    any cloud servers or remote databases.
                  </li>
                  <li>
                    <strong>Local Storage Only:</strong> Your device configurations, preferences, 
                    and settings are stored locally in your browser's localStorage only.
                  </li>
                  <li>
                    <strong>No Cookies:</strong> We do not use tracking cookies or session cookies.
                  </li>
                  <li>
                    <strong>No Analytics:</strong> We do not collect usage metrics, analytics, 
                    or telemetry data of any kind.
                  </li>
                  <li>
                    <strong>No Personal Information:</strong> We do not collect, store, or 
                    transmit any personal information.
                  </li>
                  <li>
                    <strong>Local Network Only:</strong> Communication occurs directly between 
                    your browser and your WLED devices on your local network.
                  </li>
                </ul>
              </div>
            </section>

            {/* Terms of Use */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-purple-500" />
                <h2 className={`text-lg font-semibold ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  Terms of Use
                </h2>
              </div>
              <div className="text-sm space-y-3">
                <p>By using this application, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Use the application for legitimate and lawful purposes only</li>
                  <li>Not use the application in ways that could harm your devices or network</li>
                  <li>Take full responsibility for your device configurations and usage</li>
                  <li>Respect the open-source nature of this project and its contributors</li>
                  <li>Understand that this agreement may be updated without prior notice</li>
                </ul>
              </div>
            </section>
          </div>
        </div>

        {/* Scroll Indicator */}
        {!hasScrolled && (
          <div className={`px-6 py-2 text-center text-sm ${
            isDark ? "text-yellow-400" : "text-yellow-600"
          }`}>
            ↓ Please scroll down to read the complete agreement ↓
          </div>
        )}

        {/* Action Buttons */}
        <div className={`p-6 border-t ${
          isDark ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex gap-4">
            <button
              onClick={onReject}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"
              }`}
            >
              <XCircle size={20} />
              I Disagree
            </button>
            <button
              onClick={onAccept}
              disabled={!hasScrolled}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                hasScrolled
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle size={20} />
              I Agree & Continue
            </button>
          </div>
          
          {!hasScrolled && (
            <p className={`text-center text-xs mt-2 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}>
              Please read the complete agreement to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}