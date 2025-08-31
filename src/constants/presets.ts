// Seasonal Presets Configuration
// Migrated from kolori_old/src/constants/presets.js

export interface SeasonalPreset {
  id: number;
  name: string;
  icon: string;
  gradient: string;
}

export const SEASONAL_PRESETS: SeasonalPreset[] = [
  {
    id: 1,
    name: "Autumn",
    icon: "🍂",
    gradient: "linear-gradient(135deg, #ff6600, #ff9933)",
  },
  {
    id: 2,
    name: "Canada Day",
    icon: "🇨🇦",
    gradient: "linear-gradient(135deg, #ff0000, #ff4444)",
  },
  {
    id: 3,
    name: "Christmas",
    icon: "🎄",
    gradient: "linear-gradient(135deg, #228B22, #32CD32)",
  },
];