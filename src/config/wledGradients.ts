import { WLED_PALETTES_DATA, PaletteColor } from "../constants/palettes";

/**
 * WLED Gradient Generation Utilities
 * Functions for generating gradients for presets and playlists
 */

/**
 * Generate gradient for playlists based on name and content
 */
export const generatePlaylistGradient = (
  playlistName: string,
  itemCount: number
): { colors: string[]; gradient: string } => {
  const name = playlistName.toLowerCase();

  // Name-based gradients
  const gradients: Record<string, { colors: string[]; gradient: string }> = {
    fire: {
      colors: ["#ff4500", "#ff6500", "#ffb347"],
      gradient: "linear-gradient(135deg, #ff4500, #ff6500, #ffb347)",
    },
    rainbow: {
      colors: ["#ff0000", "#ff7700", "#ffff00", "#00ff00", "#0077ff", "#4b0082"],
      gradient: "linear-gradient(135deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #4b0082)",
    },
    ocean: {
      colors: ["#006994", "#47b5d6", "#87ceeb"],
      gradient: "linear-gradient(135deg, #006994, #47b5d6, #87ceeb)",
    },
    sunset: {
      colors: ["#ff4500", "#ff6347", "#ffa500"],
      gradient: "linear-gradient(135deg, #ff4500, #ff6347, #ffa500)",
    },
    forest: {
      colors: ["#228b22", "#32cd32", "#90ee90"],
      gradient: "linear-gradient(135deg, #228b22, #32cd32, #90ee90)",
    },
    party: {
      colors: ["#ff1493", "#00ffff", "#9400d3", "#ff4500"],
      gradient: "linear-gradient(135deg, #ff1493, #00ffff, #9400d3, #ff4500)",
    },
    chill: {
      colors: ["#6a5acd", "#87ceeb", "#dda0dd"],
      gradient: "linear-gradient(135deg, #6a5acd, #87ceeb, #dda0dd)",
    },
  };

  // Check for keyword matches
  for (const [keyword, gradient] of Object.entries(gradients)) {
    if (name.includes(keyword)) return gradient;
  }

  // Fallback: Generate gradient based on playlist name hash and item count
  const hash = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash + itemCount * 30) % 360;
  const hue3 = (hash + itemCount * 60) % 360;

  const colors = [
    `hsl(${hue1}, 70%, 50%)`,
    `hsl(${hue2}, 70%, 60%)`,
    `hsl(${hue3}, 70%, 55%)`,
  ];

  return {
    colors,
    gradient: `linear-gradient(135deg, ${colors.join(", ")})`,
  };
};

/**
 * Helper function to generate gradient based on palette ID
 */
export const generatePresetGradient = (paletteId: number): string => {
  const paletteNames = Object.keys(WLED_PALETTES_DATA);
  const paletteName = paletteNames[paletteId] || paletteNames[0];

  const paletteData = WLED_PALETTES_DATA[paletteName];
  if (!paletteData || paletteData.length === 0) {
    return `linear-gradient(135deg, #888, #555)`;
  }

  const colorStops = paletteData
    .map(
      (color: PaletteColor) =>
        `rgb(${color.red}, ${color.green}, ${color.blue})`
    )
    .join(", ");

  return `linear-gradient(135deg, ${colorStops})`;
};

/**
 * Function to create/save LinearGradient-compatible colors for React Native
 */
export const generateLinearGradientColors = (
  paletteId: number
): readonly string[] => {
  const paletteNames = Object.keys(WLED_PALETTES_DATA);
  const paletteName = paletteNames[paletteId] || paletteNames[0];

  const paletteData = WLED_PALETTES_DATA[paletteName];
  if (!paletteData || paletteData.length === 0) {
    return ["#888888", "#555555"] as const;
  }

  const colors = paletteData.map(
    (color: PaletteColor) => `rgb(${color.red}, ${color.green}, ${color.blue})`
  );

  if (colors.length === 1) {
    return [colors[0], colors[0]] as const;
  }

  return colors;
};
