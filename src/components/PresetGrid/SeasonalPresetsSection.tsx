import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SeasonalPreset } from '../../types';
import { getSeasonalGradient } from '../../utils/presetUtils';
import { sharedStyles } from './styles';

interface SeasonalPresetsSectionProps {
  seasonalPresets: SeasonalPreset[];
  activePreset: string | number | null;
  isCollapsed: boolean;
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
    const presetObj = useMemo(
      () => ({
        id: preset.presetId,
        name: preset.name,
        icon: preset.icon,
        gradient: getSeasonalGradient(preset.name),
      }),
      [preset.presetId, preset.name, preset.icon]
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
        { backgroundColor: cardBackground, borderColor },
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
    </View>
  );
};

export default SeasonalPresetsSection;
