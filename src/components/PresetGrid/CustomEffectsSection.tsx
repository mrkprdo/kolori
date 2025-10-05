import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomEffect } from '../../types';
import { sharedStyles } from './styles';

interface CustomEffectsSectionProps {
  customEffects: CustomEffect[];
  activePreset: string | number | null;
  activeDevice: { isConnected?: boolean } | undefined;
  isCollapsed: boolean;
  isDeleteMode: boolean;
  selectedForDelete: Set<string | number>;
  wiggleAnim: Animated.Value;
  isCooldownActive: boolean;
  cooldownProgress: number;
  cooldownAnimRef: Animated.Value;
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onToggleCollapse: () => void;
  onPresetSelect: (id: string | number) => void;
  onToggleSelection: (id: string | number) => void;
  onGenerateRandom: () => void;
  PresetCard: React.ComponentType<any>;
}

const CustomEffectsSection: React.FC<CustomEffectsSectionProps> = ({
  customEffects,
  activePreset,
  activeDevice,
  isCollapsed,
  isDeleteMode,
  selectedForDelete,
  wiggleAnim,
  isCooldownActive,
  cooldownProgress,
  cooldownAnimRef,
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onToggleCollapse,
  onPresetSelect,
  onToggleSelection,
  onGenerateRandom,
  PresetCard,
}) => {
  return (
    <View
      style={[
        sharedStyles.sectionCard,
        { backgroundColor: cardBackground, borderColor },
      ]}
    >
      <TouchableOpacity
        onPress={onToggleCollapse}
        style={sharedStyles.sectionHeader}
      >
        <View style={sharedStyles.headerLeft}>
          <Ionicons name="color-palette" size={20} color={textColor} />
          <Text style={[sharedStyles.sectionTitle, { color: textColor }]}>
            Custom Effects ({customEffects.length})
          </Text>
        </View>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={subtextColor}
        />
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={sharedStyles.sectionContent}>
          {/* Random Custom Effect Button */}
          {activeDevice?.isConnected && (
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={isCooldownActive ? undefined : onGenerateRandom}
                disabled={isCooldownActive}
                style={[
                  {
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: isCooldownActive
                      ? isDark
                        ? '#4b5563'
                        : '#e5e7eb'
                      : isDark
                      ? '#374151'
                      : '#f3f4f6',
                    borderColor: isDark ? '#6b7280' : '#d1d5db',
                    opacity: isCooldownActive ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="dice"
                    size={18}
                    color={isCooldownActive ? subtextColor : textColor}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      marginLeft: 8,
                      color: isCooldownActive ? subtextColor : textColor,
                    }}
                  >
                    {isCooldownActive
                      ? `Cooldown (${Math.ceil(3 - cooldownProgress * 3)}s)`
                      : 'Generate Random Effect'}
                  </Text>
                </View>
                {isCooldownActive && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      height: 3,
                      width: cooldownAnimRef.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: '#3b82f6',
                    }}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}

          {!activeDevice?.isConnected ? (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name="wifi-outline"
                size={24}
                color={subtextColor}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: subtextColor,
                  textAlign: 'center',
                }}
              >
                Connect to a WLED device to load available effects
              </Text>
            </View>
          ) : (
            <View>
              {customEffects.length > 0 ? (
                <View style={sharedStyles.grid}>
                  {customEffects.map((preset, index) => (
                    <PresetCard
                      key={`device-${preset.id}-${index}`}
                      preset={preset}
                      index={index}
                      activePreset={activePreset}
                      onPresetSelect={onPresetSelect}
                      isDark={isDark}
                      isDeleteMode={isDeleteMode}
                      isSelected={selectedForDelete.has(preset.id)}
                      onToggleSelection={onToggleSelection}
                      wiggleAnim={wiggleAnim}
                      showIcon={false}
                    />
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderRadius: 8,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name="color-palette-outline"
                    size={24}
                    color={subtextColor}
                    style={{ marginBottom: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: subtextColor,
                      textAlign: 'center',
                    }}
                  >
                    No presets or custom effects found.
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: subtextColor,
                      marginTop: 4,
                      textAlign: 'center',
                    }}
                  >
                    Save presets on your WLED device or create custom effects
                    here.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default CustomEffectsSection;
