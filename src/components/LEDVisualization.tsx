import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LEDColor } from '../types';

interface LEDVisualizationProps {
  ledData: LEDColor[];
  subtextColor: string;
  liveViewLedSize?: 'compact' | 'normal' | 'large' | 'extra-large';
  containerWidth?: number; // Optional override for container width
  showLedCount?: boolean;
}

export default function LEDVisualization({ 
  ledData, 
  subtextColor, 
  liveViewLedSize = 'normal',
  containerWidth,
  showLedCount = true
}: LEDVisualizationProps) {
  const screenWidth = containerWidth || (Dimensions.get('window').width - 96); // Account for card padding + margins
  
  // Remove first LED (appears to be padding/status LED from WLED)
  const filteredLedData = ledData.slice(1);
  const ledCount = filteredLedData.length;
  
  // LED size multipliers based on setting
  const getSizeMultiplier = (size: string) => {
    switch (size) {
      case 'compact': return 0.7;
      case 'normal': return 1.0;
      case 'large': return 1.4;
      case 'extra-large': return 1.8;
      default: return 1.0;
    }
  };
  
  const sizeMultiplier = getSizeMultiplier(liveViewLedSize);
  
  // Calculate optimal LED size and layout based on count and size setting
  const getOptimalLayout = (count: number) => {
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
  
  const layout = getOptimalLayout(ledCount);
  
  const renderLED = (color: LEDColor, index: number) => {
    // Handle undefined color values
    const r = color.r || 0;
    const g = color.g || 0;
    const b = color.b || 0;
    
    const brightness = (r + g + b) / 3 / 255;
    const isActive = brightness > 0.1; // Consider LED "active" if it's not very dim
    
    return (
      <View
        key={index}
        style={[
          {
            width: layout.ledSize,
            height: layout.ledSize,
            marginRight: layout.spacing,
            marginBottom: layout.spacing,
            flexShrink: 0, // Prevent shrinking
            borderRadius: layout.type === 'matrix' ? 0.5 : Math.min(layout.ledSize / 3, 2),
            backgroundColor: `rgb(${r}, ${g}, ${b})`,
            shadowColor: isActive ? `rgb(${r}, ${g}, ${b})` : 'transparent',
            shadowOpacity: isActive ? Math.min(brightness * 0.8, 0.6) : 0,
            shadowRadius: Math.min(layout.ledSize / 2, 3),
            elevation: isActive ? 2 : 0,
          }
        ]}
      >
        {/* LED highlight effect for active LEDs */}
        {isActive && layout.ledSize > 4 && (
          <View
            style={{
              position: 'absolute',
              top: 0.5,
              left: 0.5,
              borderRadius: Math.min(layout.ledSize / 4, 1),
              height: Math.min(layout.ledSize / 3, 3),
              width: Math.min(layout.ledSize / 2, 2),
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
            }}
          />
        )}
      </View>
    );
  };
  
  return (
    <View>
      <View style={{ 
        flexDirection: 'row',
        flexWrap: 'wrap',
        maxWidth: screenWidth,
        width: '100%',
        paddingHorizontal: 4,
      }}>
        {filteredLedData.map((color, index) => renderLED(color, index))}
      </View>
      {showLedCount && (
        <Text style={{ 
          color: subtextColor, 
          fontSize: 12, 
          marginTop: 8,
          textAlign: 'left'
        }}>
          {ledCount} LED{ledCount !== 1 ? 's' : ''} live
        </Text>
      )}
    </View>
  );
}