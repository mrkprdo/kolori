/**
 * Utility functions for preset and gradient manipulation
 */

/**
 * Extract the primary color from a gradient string
 * @param gradient - CSS gradient string
 * @returns First color found in the gradient or fallback color
 */
export const extractPrimaryColor = (gradient: string): string => {
  if (!gradient || typeof gradient !== "string") {
    return "#6366f1"; // fallback color
  }

  // Extract first RGB/hex color from gradient string
  const colorMatch = gradient.match(
    /(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(\d+,\s*\d+,\s*\d+\))/
  );
  return colorMatch ? colorMatch[0] : "#6366f1";
};

/**
 * Get seasonal gradient based on preset name
 * @param presetName - Name of the preset
 * @returns CSS gradient string for the season
 */
export const getSeasonalGradient = (presetName: string): string => {
  const name = presetName.toLowerCase();

  if (
    name.includes("halloween") ||
    name.includes("fall") ||
    name.includes("autumn")
  ) {
    return "linear-gradient(135deg, #ff6600, #ff9933)";
  }
  if (name.includes("canada")) {
    return "linear-gradient(135deg, #ff0000, #ff4444)";
  }
  if (name.includes("christmas") || name.includes("holiday")) {
    return "linear-gradient(135deg, #228B22, #32CD32)";
  }
  if (name.includes("valentine")) {
    return "linear-gradient(135deg, #ff1493, #ff69b4)";
  }
  if (name.includes("easter") || name.includes("spring")) {
    return "linear-gradient(135deg, #98fb98, #ffb6c1)";
  }
  if (name.includes("july") || name.includes("independence")) {
    return "linear-gradient(135deg, #0066cc, #ff0000)";
  }

  // Default gradient
  return "linear-gradient(135deg, #6366f1, #8b5cf6)";
};

/**
 * Parse gradient string and extract colors for LinearGradient component
 * @param gradientString - CSS gradient string
 * @returns Object with colors array and optional locations
 */
export const parseGradientString = (
  gradientString: string
): { colors: string[]; locations?: number[] } => {
  if (!gradientString || typeof gradientString !== "string") {
    return { colors: ["#6366f1", "#8b5cf6"] }; // default gradient
  }

  // Extract colors from gradient string like "linear-gradient(135deg, rgb(255, 170, 0), rgb(255, 0, 0), rgb(0, 255, 0))"
  const colorMatches = gradientString.match(
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g
  );

  if (colorMatches && colorMatches.length > 0) {
    // Ensure at least 2 colors for LinearGradient
    if (colorMatches.length === 1) {
      return { colors: [colorMatches[0], colorMatches[0]] };
    }
    return { colors: colorMatches };
  }

  // Fallback: try to extract hex colors
  const hexMatches = gradientString.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g);
  if (hexMatches && hexMatches.length > 0) {
    // Ensure at least 2 colors for LinearGradient
    if (hexMatches.length === 1) {
      return { colors: [hexMatches[0], hexMatches[0]] };
    }
    return { colors: hexMatches };
  }

  // Final fallback
  return { colors: ["#6366f1", "#8b5cf6"] };
};
