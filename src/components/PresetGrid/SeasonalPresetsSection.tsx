import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, ToastAndroid, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeasonalPreset } from '../../types';
import { getSeasonalGradient } from '../../utils/presetUtils';
import { sharedStyles } from './styles';

interface SeasonalPresetsSectionProps {
  seasonalPresets: SeasonalPreset[];
  activePreset: string | number | null;
  isCollapsed: boolean;
  isBlocked?: boolean;
  blockReason?: 'offline' | 'audioReactive';
  isDark: boolean;
  cardBackground: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  onToggleCollapse: () => void;
  onPresetSelect: (id: string | number) => void;
  PresetCard: React.ComponentType<any>;
}

const MemoizedSeasonalPresetCard = React.memo(
  function MemoizedSeasonalPresetCard({
    preset,
    index,
    activePreset,
    onPresetSelect,
    isDark,
    PresetCard,
  }: {
    preset: any;
    index: number;
    activePreset: string | number | null;
    onPresetSelect: (id: string | number) => void;
    isDark: boolean;
    PresetCard: React.ComponentType<any>;
  }) {
    const gradient = useMemo(
      () => getSeasonalGradient(preset.name),
      [preset.name]
    );

    const presetObj = useMemo(
      () => ({
        id: preset.presetId,
        name: preset.name,
        icon: preset.icon,
        gradient: gradient,
      }),
      [preset.presetId, preset.name, preset.icon, gradient]
    );

    const isActive = useMemo(
      () => activePreset?.toString() === preset.presetId.toString(),
      [activePreset, preset.presetId]
    );

    const handleClick = useCallback(() => {
      onPresetSelect(preset.presetId);
    }, [onPresetSelect, preset.presetId]);

    return (
      <PresetCard
        preset={presetObj}
        animationDelay={index * 50}
        isActive={isActive}
        onClick={handleClick}
        showIcon={true}
        isDark={isDark}
        isDeleteMode={false}
        isSelected={false}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.preset.presetId === nextProps.preset.presetId &&
      prevProps.preset.name === nextProps.preset.name &&
      prevProps.preset.icon === nextProps.preset.icon &&
      prevProps.index === nextProps.index &&
      prevProps.activePreset === nextProps.activePreset &&
      prevProps.isDark === nextProps.isDark
    );
  }
);

const SeasonalPresetsSection: React.FC<SeasonalPresetsSectionProps> = ({
  seasonalPresets,
  activePreset,
  isCollapsed,
  isBlocked = false,
  blockReason = 'offline',
  isDark,
  cardBackground,
  borderColor,
  textColor,
  subtextColor,
  onToggleCollapse,
  onPresetSelect,
  PresetCard,
}) => {
  return (
    <View
      style={[
        sharedStyles.sectionCard,
        { backgroundColor: cardBackground, borderColor, position: 'relative' },
      ]}
    >
      <TouchableOpacity
        onPress={onToggleCollapse}
        style={sharedStyles.sectionHeader}
      >
        <View style={sharedStyles.headerLeft}>
          <Ionicons name="calendar" size={20} color={textColor} />
          <Text style={[sharedStyles.sectionTitle, { color: textColor }]}>
            Seasonal Presets
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
          <View style={sharedStyles.grid}>
            {seasonalPresets.map((preset, index) => (
              <MemoizedSeasonalPresetCard
                key={`seasonal-${preset.id}-${index}`}
                preset={preset}
                index={index}
                activePreset={activePreset}
                onPresetSelect={onPresetSelect}
                isDark={isDark}
                PresetCard={PresetCard}
              />
            ))}
          </View>
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
        />
      )}
    </View>
  );
};

export default SeasonalPresetsSection;
