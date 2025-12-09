import React, { useMemo, useCallback } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LEDColor } from '../types';

interface LEDVisualizationProps {
  ledData: LEDColor[];
  subtextColor: string;
  liveViewLedSize?: 'compact' | 'normal' | 'large' | 'extra-large';
  containerWidth?: number; // Optional override for container width
  showLedCount?: boolean;
  wledInfo?: any; // WLED device info containing matrix dimensions
  brightness?: number; // Brightness value 0-255 to apply dimming effect
}

// Function to detect if WLED supports 2D matrix and extract dimensions + mapping info
const detect2DMatrix = (wledInfo: any) => {
  if (!wledInfo) {
    return { is2D: false, width: 0, height: 0, serpentine: false, transpose: false, vertical: false };
  }

  // PRIORITY 1: Check for fresh WebSocket device info (most reliable)
  if (wledInfo.ledMatrix?.w && wledInfo.ledMatrix?.h) {
    return {
      is2D: true,
      width: wledInfo.ledMatrix.w,
      height: wledInfo.ledMatrix.h,
      serpentine: true, // Default for most matrices
      transpose: false,
      vertical: false
    };
  }

  // PRIORITY 2: Check for 2D matrix info in WLED device info
  if (wledInfo.leds?.matrix?.w && wledInfo.leds?.matrix?.h) {
    const serpentine = wledInfo.leds.matrix.serpentine ??
                      wledInfo.serpentine ??
                      wledInfo.leds.serpentine ??
                      true; // Default to true for most LED matrices

    return {
      is2D: true,
      width: wledInfo.leds.matrix.w,
      height: wledInfo.leds.matrix.h,
      serpentine: serpentine,
      transpose: wledInfo.leds.matrix.transpose || false,
      vertical: wledInfo.leds.matrix.vertical || false
    };
  }

  // PRIORITY 3: Check alternative matrix locations
  if (wledInfo.matrix?.w && wledInfo.matrix?.h) {
    return {
      is2D: true,
      width: wledInfo.matrix.w,
      height: wledInfo.matrix.h,
      serpentine: wledInfo.matrix.serpentine || false,
      transpose: wledInfo.matrix.transpose || false,
      vertical: wledInfo.matrix.vertical || false
    };
  }

  // PRIORITY 4: Check segment-based 2D configuration
  if (wledInfo.leds?.seglc && Array.isArray(wledInfo.leds.seglc)) {
    for (const segment of wledInfo.leds.seglc) {
      if (segment.m && segment.m !== 0 && segment.w && segment.h) { // m = matrix mode
        return {
          is2D: true,
          width: segment.w,
          height: segment.h,
          serpentine: segment.serpentine || false,
          transpose: segment.transpose || false,
          vertical: segment.vertical || false
        };
      }
    }
  }

  return { is2D: false, width: 0, height: 0, serpentine: false, transpose: false, vertical: false };
};

// Cache for 2D matrix layouts to prevent recalculation - MUST be outside component
const static2DLayoutCache = new Map();

// Memoized LED component - defined OUTSIDE to prevent recreation
const LED = React.memo<{ color: LEDColor; index: number; ledSize: number; spacing: number }>(
  ({ color, ledSize, spacing }) => {
    // Handle undefined color values
    let r = color.r || 0;
    let g = color.g || 0;
    let b = color.b || 0;
    const w = color.w || 0;

    // For RGBW LEDs, white channel might need to be added to RGB channels
    if (w > 0) {
      r = Math.min(255, r + Math.floor(w * 0.3));
      g = Math.min(255, g + Math.floor(w * 0.3));
      b = Math.min(255, b + Math.floor(w * 0.3));
    }

    const brightness = (r + g + b) / 3 / 255;
    const isActive = brightness > 0.1;
    const isOff = r === 0 && g === 0 && b === 0;

    const borderRadius = ledSize <= 6 ? 2 : Math.min(ledSize / 3, 4);
    const showHighlight = isActive && ledSize > 8 && brightness > 0.7;

    return (
      <View
        style={[
          styles.led,
          {
            width: ledSize,
            height: ledSize,
            marginRight: spacing,
            marginBottom: spacing,
            borderRadius,
            backgroundColor: isOff ? '#1e1e1e' : `rgb(${r}, ${g}, ${b})`,
          },
        ]}
      >
        {showHighlight && (
          <View style={styles.highlight} />
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if color actually changed
    return (
      prevProps.color.r === nextProps.color.r &&
      prevProps.color.g === nextProps.color.g &&
      prevProps.color.b === nextProps.color.b &&
      prevProps.color.w === nextProps.color.w &&
      prevProps.ledSize === nextProps.ledSize &&
      prevProps.spacing === nextProps.spacing
    );
  }
);

/**
 * Render a live LED visualization for either a 1D LED strip or a 2D WLED matrix.
 *
 * The component adapts layout and LED sizing based on LED count, optional `wledInfo` matrix metadata,
 * and the `liveViewLedSize` preference. When `wledInfo` indicates a 2D matrix, the component enforces
 * a matrix-aware layout and mapping (including serpentine/transpose/vertical wiring) and ignores the size
 * preference. Uses memoization and caching to minimize re-renders and layout recalculation.
 *
 * @param ledData - Array of LED color objects to display. For 1D strips the first LED is treated as a status LED and is omitted from the rendered strip.
 * @param subtextColor - Color used for the LED count subtext.
 * @param liveViewLedSize - Preferred size hint for 1D displays; ignored for detected 2D matrices.
 * @param containerWidth - Optional override for available rendering width; defaults to device width minus padding.
 * @param showLedCount - Whether to display the LED count text beneath the visualization.
 * @param wledInfo - Optional WLED device metadata used to detect matrix dimensions and mapping flags (width, height, serpentine, transpose, vertical).
 *
 * @returns The React element containing the LED grid/strip and optional LED count text.
 */
function LEDVisualization({
  ledData,
  subtextColor,
  liveViewLedSize = 'normal',
  containerWidth,
  showLedCount = true,
  wledInfo
}: LEDVisualizationProps) {

  // Detect matrix early to override size settings
  const earlyMatrixDetection = detect2DMatrix(wledInfo);

  // For 2D matrices, FORCE liveViewLedSize to be 'normal' and never change
  const effectiveLedSize = earlyMatrixDetection.is2D ? 'normal' : liveViewLedSize;

  const screenWidth = containerWidth || (Dimensions.get('window').width - 96); // Account for card padding + margins

  const matrixInfo = useMemo(() => {
    const detected = detect2DMatrix(wledInfo);

    // Validate LED count for 2D matrices
    if (detected.is2D && detected.width > 0 && detected.height > 0) {
      const expectedLedCount = detected.width * detected.height;
      const actualLedCount = ledData.length;

      // Only invalidate if LED count is drastically different (50% tolerance)
      const isSignificantMismatch = actualLedCount < (expectedLedCount * 0.5) || actualLedCount > (expectedLedCount * 1.5);

      if (isSignificantMismatch) {
        return { is2D: false, width: 0, height: 0, serpentine: false, transpose: false, vertical: false };
      }
    }
    return detected;
  }, [wledInfo, ledData.length]);

  const filteredLedData = useMemo(() => {
    // Use all LED data - MessageParser already skips status LED
    return ledData;
  }, [ledData]);

  const ledCount = filteredLedData.length;

  // Function to map matrix coordinates to LED index
  const mapMatrixToLEDIndex = useCallback(
    (row: number, col: number) => {
      if (!matrixInfo.is2D || matrixInfo.width <= 0 || matrixInfo.height <= 0) {
        const fallbackWidth = Math.max(matrixInfo.width, 1);
        return row * fallbackWidth + col;
      }

      const { width, height, serpentine, transpose, vertical } = matrixInfo;

      let mappedRow = row;
      let mappedCol = col;

      if (transpose) {
        const temp = mappedRow;
        mappedRow = mappedCol;
        mappedCol = temp;
      }

      const clamp = (value: number, min: number, max: number) => {
        if (value < min) return min;
        if (value > max) return max;
        return value;
      };

      if (vertical) {
        const columnIndex = clamp(mappedCol, 0, width - 1);
        let rowIndex = clamp(mappedRow, 0, height - 1);

        if (serpentine && columnIndex % 2 === 1) {
          rowIndex = height - 1 - rowIndex;
        }

        return columnIndex * height + rowIndex;
      }

      const rowIndex = clamp(mappedRow, 0, height - 1);
      let columnIndex = clamp(mappedCol, 0, width - 1);

      if (serpentine && rowIndex % 2 === 1) {
        columnIndex = width - 1 - columnIndex;
      }

      return rowIndex * width + columnIndex;
    },
    [matrixInfo]
  );

  const sizeMultiplier = useMemo(() => {
    // For 2D matrices, completely ignore the size setting
    if (matrixInfo.is2D) return 1.0; // Fixed value, never changes

    switch (effectiveLedSize) {
      case 'compact': return 0.7;
      case 'normal': return 1.0;
      case 'large': return 1.4;
      case 'extra-large': return 1.8;
      default: return 1.0;
    }
  }, [matrixInfo.is2D, effectiveLedSize]);

  // Calculate optimal LED size and layout based on count, size setting, and 2D matrix info
  const getOptimalLayout = (count: number) => {
    // If WLED has 2D matrix configuration, use STATIC CACHED layout
    if (matrixInfo.is2D && matrixInfo.width > 0 && matrixInfo.height > 0) {
      const cacheKey = `${matrixInfo.width}x${matrixInfo.height}x${screenWidth}`;

      // Check cache first
      if (static2DLayoutCache.has(cacheKey)) {
        return static2DLayoutCache.get(cacheKey);
      }

      const columns = matrixInfo.width;
      const rows = matrixInfo.height;
      const expectedCount = columns * rows;

      // Fixed constants for 2D matrix layout
      const PADDING = 16;
      const MAX_HEIGHT = 300;
      const MIN_LED_SIZE = 3;

      const availableWidth = screenWidth - PADDING;
      const availableHeight = Math.min(MAX_HEIGHT, availableWidth);

      const ledSizeByWidth = Math.floor(availableWidth / columns) - 1;
      const ledSizeByHeight = Math.floor(availableHeight / rows) - 1;

      const ledSize = Math.max(Math.min(ledSizeByWidth, ledSizeByHeight), MIN_LED_SIZE);
      const spacing = ledSize > 8 ? 1 : 0.5;

      const layout = {
        type: '2d-matrix',
        ledSize,
        columns,
        rows,
        spacing,
        expectedCount
      };

      // Cache the result
      static2DLayoutCache.set(cacheKey, layout);
      return layout;
    }
    if (count <= 20) {
      // Linear layout for small counts
      return {
        type: 'linear',
        ledSize: Math.max(Math.min(Math.floor((screenWidth / count) - 2) * sizeMultiplier, 12 * sizeMultiplier), 4),
        columns: count,
        spacing: 2
      };
    } else if (count <= 100) {
      // Grid layout for medium counts
      const columns = Math.ceil(Math.sqrt(count));
      const ledSize = Math.max(Math.min(Math.floor((screenWidth / columns) - 2) * sizeMultiplier, 8 * sizeMultiplier), 3);
      return {
        type: 'grid',
        ledSize,
        columns,
        spacing: 2
      };
    } else if (count <= 300) {
      // Dense grid for larger counts - optimize for visual appeal
      const spacing = 1;
      const minLedSize = Math.max(10 * sizeMultiplier, 6); // Minimum LED size for visibility
      const maxLedSize = 15 * sizeMultiplier; // Maximum LED size to keep grid compact
      
      // Calculate optimal columns that fit within screen width
      let columns = Math.floor(screenWidth / (minLedSize + spacing));
      
      // Ensure we don't exceed screen width
      while (columns * (minLedSize + spacing) > screenWidth && columns > 8) {
        columns--;
      }
      
      // Calculate LED size that fits exactly
      let ledSize = Math.floor((screenWidth - (columns * spacing)) / columns);
      ledSize = Math.min(Math.max(ledSize, minLedSize), maxLedSize);
      
      // Ensure minimum values
      columns = Math.max(columns, 8); // At least 8 columns
      
      return {
        type: 'dense',
        ledSize,
        columns,
        spacing
      };
    } else {
      // Matrix visualization for very large counts
      const columns = Math.min(Math.ceil(Math.sqrt(count)), 40);
      const ledSize = Math.max(Math.floor((screenWidth / columns) - 1) * sizeMultiplier, 2);
      return {
        type: 'matrix',
        ledSize,
        columns,
        spacing: 0.5
      };
    }
  };
  
  const layout = useMemo(() => {
    return getOptimalLayout(ledCount);
  }, [ledCount, screenWidth, matrixInfo.is2D, matrixInfo.width, matrixInfo.height, sizeMultiplier]);

  // Function to render LEDs based on layout type
  const renderLEDs = useMemo(() => {
    // For 2D matrix devices, render all LEDs to show the complete matrix
    // For 1D devices, limit LEDs for performance
    const maxLedsToRender = (layout.type === '2d-matrix' && matrixInfo.is2D)
      ? filteredLedData.length // Render all LEDs for 2D matrix
      : 300; // Cap for 1D devices
    const ledsToRender = filteredLedData.slice(0, maxLedsToRender);

    // Only use 2D matrix rendering if device is actually configured as 2D
    if (layout.type === '2d-matrix' && matrixInfo.is2D) {
      // For 2D matrix, create rows and arrange LEDs in proper grid
      const rows = [];
      const { width: matrixWidth, height: matrixHeight } = matrixInfo;

      for (let row = 0; row < matrixHeight; row++) {
        const rowLEDs = [];
        for (let col = 0; col < matrixWidth; col++) {
          // Use proper WLED matrix mapping instead of linear index
          const ledIndex = mapMatrixToLEDIndex(row, col);

          if (ledIndex < ledsToRender.length && ledsToRender[ledIndex]) {
            rowLEDs.push(
              <LED
                key={ledIndex}
                color={ledsToRender[ledIndex]}
                index={ledIndex}
                ledSize={layout.ledSize}
                spacing={layout.spacing}
              />
            );
          } else {
            // For 2D matrix, show missing data only if we truly don't have data for this LED
            const isMissingData = ledIndex >= ledsToRender.length;
            if (isMissingData) {
              // Don't render missing LEDs for 2D matrix - just skip them
              rowLEDs.push(
                <View
                  key={`missing-${row}-${col}`}
                  style={{
                    width: layout.ledSize,
                    height: layout.ledSize,
                    marginRight: layout.spacing,
                    backgroundColor: '#330000', // Red tint for missing
                    borderRadius: Math.min(layout.ledSize / 2, 4),
                    borderWidth: 0.5,
                    borderColor: '#660000',
                  }}
                />
              );
            }
          }
        }

        rows.push(
          <View
            key={`row-${row}`}
            style={{
              flexDirection: 'row',
              marginBottom: layout.spacing,
            }}
          >
            {rowLEDs}
          </View>
        );
      }

      return (
        <View style={{
          alignItems: 'center',
          paddingHorizontal: 4,
        }}>
          {rows}
        </View>
      );
    } else {
      // Default flexWrap layout for 1D and other layouts
      return (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          maxWidth: screenWidth,
          width: '100%',
          paddingHorizontal: 4,
        }}>
          {ledsToRender.map((color, index) => (
            <LED
              key={index}
              color={color}
              index={index}
              ledSize={layout.ledSize}
              spacing={layout.spacing}
            />
          ))}
        </View>
      );
    }
  }, [layout, matrixInfo, filteredLedData, screenWidth, mapMatrixToLEDIndex]);

  return (
    <View>
      {renderLEDs}
      {showLedCount && (
        <Text style={{
          color: subtextColor,
          fontSize: 12,
          marginTop: 8,
          textAlign: 'center'
        }}>
          {layout.type === '2d-matrix' && matrixInfo.is2D ? (
            `${matrixInfo.width}×${matrixInfo.height} matrix (${ledCount} LED${ledCount !== 1 ? 's' : ''})`
          ) : (
            `${ledCount} LED${ledCount !== 1 ? 's' : ''} live`
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  led: {
    flexShrink: 0,
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    borderRadius: 1,
    height: 2,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});

export default React.memo(LEDVisualization, (prevProps, nextProps) => {
  const prevMatrix = detect2DMatrix(prevProps.wledInfo);
  const nextMatrix = detect2DMatrix(nextProps.wledInfo);

  const basePropsEqual = (
    prevProps.ledData === nextProps.ledData &&
    prevProps.subtextColor === nextProps.subtextColor &&
    prevProps.containerWidth === nextProps.containerWidth &&
    prevProps.showLedCount === nextProps.showLedCount &&
    prevProps.brightness === nextProps.brightness
  );

  const matrixEqual = (
    prevMatrix.is2D === nextMatrix.is2D &&
    prevMatrix.width === nextMatrix.width &&
    prevMatrix.height === nextMatrix.height &&
    prevMatrix.serpentine === nextMatrix.serpentine &&
    prevMatrix.transpose === nextMatrix.transpose &&
    prevMatrix.vertical === nextMatrix.vertical
  );

  // If either prop set is 2D-capable, compare against matrix metadata (ignore led size pref)
  if (prevMatrix.is2D || nextMatrix.is2D) {
    return basePropsEqual && matrixEqual;
  }

  // For 1D strips, include the live view sizing preference in the equality check
  return basePropsEqual && prevProps.liveViewLedSize === nextProps.liveViewLedSize;
});