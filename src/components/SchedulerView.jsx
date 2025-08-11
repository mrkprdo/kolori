import { Sun, Moon, Sunrise, MinusCircle } from "lucide-react";

export default function SchedulerView({
  scheduleMode,
  onScheduleChange,
  onBack,
  isDark,
}) {
  return (
    <div className={`p-4 space-y-4 ${isDark ? "text-white" : ""}`}>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg ${
            isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
          }`}
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">Schedule</h1>
      </div>

      <div className="space-y-4">
        <div
          className={`w-full rounded-xl p-4 shadow-sm border-2 transition-all ${
            scheduleMode === "morning"
              ? isDark
                ? "border-green-400 bg-green-900 shadow-md"
                : "border-green-400 bg-green-50 shadow-md"
              : isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => scheduleMode === "morning" ? onScheduleChange("off") : onScheduleChange("morning")}
              className="flex items-center gap-4 flex-1"
            >
              <div className={`p-3 rounded-full ${
                scheduleMode === "morning" ? "bg-green-100" : "bg-yellow-100"
              }`}>
                <Sunrise className={`${
                  scheduleMode === "morning" ? "text-green-600" : "text-yellow-600"
                }`} size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-semibold ${
                  scheduleMode === "morning" && isDark ? "text-green-200" : ""
                }`}>Morning</div>
                <div className={`text-sm ${
                  scheduleMode === "morning" 
                    ? isDark ? "text-green-300" : "text-green-700"
                    : "text-gray-500"
                }`}>7 AM - 11 AM</div>
              </div>
            </button>
            {scheduleMode === "morning" && (
              <button
                onClick={() => onScheduleChange("off")}
                className={`p-2 rounded-lg ml-2 ${
                  isDark
                    ? "text-gray-400 hover:bg-gray-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Unset schedule"
              >
                <MinusCircle size={20} />
              </button>
            )}
          </div>
        </div>

        <div
          className={`w-full rounded-xl p-4 shadow-sm border-2 transition-all ${
            scheduleMode === "night"
              ? isDark
                ? "border-green-400 bg-green-900 shadow-md"
                : "border-green-400 bg-green-50 shadow-md"
              : isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => scheduleMode === "night" ? onScheduleChange("off") : onScheduleChange("night")}
              className="flex items-center gap-4 flex-1"
            >
              <div className={`p-3 rounded-full ${
                scheduleMode === "night" ? "bg-green-100" : "bg-purple-100"
              }`}>
                <Moon className={`${
                  scheduleMode === "night" ? "text-green-600" : "text-purple-600"
                }`} size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-semibold ${
                  scheduleMode === "night" && isDark ? "text-green-200" : ""
                }`}>Night</div>
                <div className={`text-sm ${
                  scheduleMode === "night" 
                    ? isDark ? "text-green-300" : "text-green-700"
                    : "text-gray-500"
                }`}>7 PM - Midnight</div>
              </div>
            </button>
            {scheduleMode === "night" && (
              <button
                onClick={() => onScheduleChange("off")}
                className={`p-2 rounded-lg ml-2 ${
                  isDark
                    ? "text-gray-400 hover:bg-gray-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Unset schedule"
              >
                <MinusCircle size={20} />
              </button>
            )}
          </div>
        </div>

        <div
          className={`w-full rounded-xl p-4 shadow-sm border-2 transition-all ${
            scheduleMode === "allday"
              ? isDark
                ? "border-green-400 bg-green-900 shadow-md"
                : "border-green-400 bg-green-50 shadow-md"
              : isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => scheduleMode === "allday" ? onScheduleChange("off") : onScheduleChange("allday")}
              className="flex items-center gap-4 flex-1"
            >
              <div className={`p-3 rounded-full ${
                scheduleMode === "allday" ? "bg-green-100" : "bg-blue-100"
              }`}>
                <Sun className={`${
                  scheduleMode === "allday" ? "text-green-600" : "text-blue-600"
                }`} size={24} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-semibold ${
                  scheduleMode === "allday" && isDark ? "text-green-200" : ""
                }`}>All Day</div>
                <div className={`text-sm ${
                  scheduleMode === "allday" 
                    ? isDark ? "text-green-300" : "text-green-700"
                    : "text-gray-500"
                }`}>Always on</div>
              </div>
            </button>
            {scheduleMode === "allday" && (
              <button
                onClick={() => onScheduleChange("off")}
                className={`p-2 rounded-lg ml-2 ${
                  isDark
                    ? "text-gray-400 hover:bg-gray-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title="Unset schedule"
              >
                <MinusCircle size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
