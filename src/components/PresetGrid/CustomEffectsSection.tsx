import React from 'react';
import { View, Text, TouchableOpacity, Animated, Platform, ToastAndroid, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomEffect } from '../../types';
import { sharedStyles } from './styles';

interface CustomEffectsSectionProps {
  customEffects: CustomEffect[];
  activePreset: string | number | null;
  bootPresetId: number | null;
  activeDevice: { isConnected?: boolean } | undefined;
  isCollapsed: boolean;
  isBlocked?: boolean;
  blockReason?: 'offline' | 'audioReactive';
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
  onLongPress?: (preset: any, isDeletable?: boolean) => void;
  onToggleSelection: (id: string | number) => void;
  onGenerateRandom: () => void;
  PresetCard: React.ComponentType<any>;
}

const CustomEffectsSection: React.FC<CustomEffectsSectionProps> = ({
  customEffects,
  activePreset,
  bootPresetId,
  activeDevice,
  isCollapsed,
  isBlocked = false,
  blockReason = 'offline',
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
  onLongPress,
  onToggleSelection,
  onGenerateRandom,
  PresetCard,
}) => {
  return (
    <View
      style={[
        sharedStyles.sectionCard,
        { backgroundColor: cardBackground, borderColor: isDark ? '#4b5563' : '#1e293b', position: 'relative' },
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
                    borderWidth: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: isCooldownActive
                      ? isDark
                        ? '#4b5563'
                        : '#e5e7eb'
                      : isDark
                      ? '#374151'
                      : '#f3f4f6',
                    borderColor: isDark ? '#4b5563' : '#1e293b',
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
                      bootPresetId={bootPresetId}
                      onPresetSelect={onPresetSelect}
                      onLongPress={onLongPress}
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

      {/* Overlay when blocked - covers entire section */}
      {isBlocked && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (blockReason === 'offline') {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Connect to a WLED device to change presets', ToastAndroid.SHORT);
              } else {
                Alert.alert('Device Offline', 'Connect to a WLED device to change presets');
              }
            } else {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Turn off Audio Reactive to change presets', ToastAndroid.SHORT);
              } else {
                Alert.alert('Audio Reactive Active', 'Turn off Audio Reactive to change presets');
              }
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            borderRadius: 12,
          }}
        >
          <View
            style={{
              backgroundColor: cardBackground,
              borderRadius: 10,
              padding: 12,
              borderWidth: 2,
              borderColor: blockReason === 'offline' ? '#ef4444' : '#3b82f6',
              maxWidth: '70%',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons
              name={blockReason === 'offline' ? 'cloud-offline' : 'musical-notes'}
              size={28}
              color={blockReason === 'offline' ? '#ef4444' : '#3b82f6'}
              style={{ marginBottom: 6 }}
            />
            <Text style={{ fontSize: 15, fontWeight: '600', color: textColor, marginBottom: 4 }}>
              {blockReason === 'offline' ? 'Device Offline' : 'Audio Reactive Active'}
            </Text>
            <Text style={{ fontSize: 11, color: subtextColor, textAlign: 'center', lineHeight: 14 }}>
              {blockReason === 'offline'
                ? 'Connect to a WLED device to change presets.'
                : 'Turn off Audio Reactive to change presets.'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CustomEffectsSection;
