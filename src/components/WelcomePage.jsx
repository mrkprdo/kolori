import { Plus, Wifi, Palette, RefreshCw } from "lucide-react";

export default function WelcomePage({ isDark, onAddDevice }) {
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark ? "bg-gray-900" : "bg-gray-50"
    }`}>
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo/Title */}
        <div>
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Kolori
          </div>
          <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Control your WLED devices with style
          </p>
        </div>

        {/* Welcome illustration */}
        <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center ${
          isDark ? "bg-gray-800" : "bg-gray-100"
        }`}>
          <div className="relative">
            <Wifi size={48} className={`${isDark ? "text-gray-400" : "text-gray-500"}`} />
            <div className="absolute -top-2 -right-2">
              <Palette size={24} className="text-blue-500" />
            </div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="space-y-4">
          <h1 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Welcome to Kolori!
          </h1>
          <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
            To get started, you'll need to add your first WLED device. 
            Make sure your device is connected to the same network.
          </p>
        </div>

        {/* Add device button */}
        <div className="space-y-4">
          <button
            onClick={onAddDevice}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
          >
            <Plus size={20} />
            Add Your First Device
          </button>
          
          <button
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:from-green-600 hover:to-teal-600 transition-all shadow-lg"
          >
            <RefreshCw size={20} />
            Scan for Devices
          </button>
          
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            You'll need your WLED device's IP address
          </p>
        </div>

        {/* Quick tips */}
        <div className={`p-4 rounded-lg ${
          isDark ? "bg-gray-800 border border-gray-700" : "bg-blue-50 border border-blue-200"
        }`}>
          <h3 className={`font-semibold mb-2 ${
            isDark ? "text-blue-300" : "text-blue-800"
          }`}>
            Quick Tips:
          </h3>
          <ul className={`text-sm space-y-1 text-left ${
            isDark ? "text-gray-300" : "text-blue-700"
          }`}>
            <li>• Check your router's admin panel for connected devices</li>
            <li>• WLED devices usually show up as "wled-" followed by numbers</li>
            <li>• Make sure both devices are on the same WiFi network</li>
          </ul>
        </div>
      </div>
    </div>
  );
}