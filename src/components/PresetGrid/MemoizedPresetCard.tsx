import React, { useMemo, useCallback } from 'react';
import { Animated } from 'react-native';
import PresetCard from './PresetCard';

interface MemoizedPresetCardProps {
  preset: any;
  index: number;
  activePreset: string | number | null;
  onPresetSelect: (id: string | number) => void;
  isDark: boolean;
  isDeleteMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string | number) => void;
  wiggleAnim?: Animated.Value;
  showIcon?: boolean;
}

const MemoizedPresetCard = React.memo(
  function MemoizedPresetCard({
    preset,
    index,
    activePreset,
    onPresetSelect,
    isDark,
    isDeleteMode,
    isSelected,
    onToggleSelection,
    wiggleAnim,
    showIcon = false,
  }: MemoizedPresetCardProps) {
    const isActive = useMemo(
      () => activePreset?.toString() === preset.id.toString(),
      [activePreset, preset.id]
    );

    const handleClick = useCallback(() => {
      onPresetSelect(preset.id);
    }, [onPresetSelect, preset.id]);

    return (
      <PresetCard
        preset={preset}
        animationDelay={index * 50}
        isActive={isActive}
        onClick={handleClick}
        showIcon={showIcon}
        isDark={isDark}
        isDeleteMode={isDeleteMode}
        isSelected={isSelected}
        onToggleSelection={onToggleSelection}
        wiggleAnim={wiggleAnim}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.preset.id === nextProps.preset.id &&
      prevProps.preset.name === nextProps.preset.name &&
      prevProps.preset.presetId === nextProps.preset.presetId &&
      prevProps.preset.effectName === nextProps.preset.effectName &&
      prevProps.index === nextProps.index &&
      prevProps.activePreset === nextProps.activePreset &&
      prevProps.isDark === nextProps.isDark &&
      prevProps.isDeleteMode === nextProps.isDeleteMode &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.showIcon === nextProps.showIcon
    );
  }
);

export default MemoizedPresetCard;
