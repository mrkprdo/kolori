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
      () => {
        if (!activePreset) return false;

        // Direct match by id
        if (activePreset.toString() === preset.id.toString()) {
          return true;
        }

        // Match by presetId if available
        if (preset.presetId && activePreset.toString() === preset.presetId.toString()) {
          return true;
        }

        // For WLED presets with "wled_X" format, match numeric part
        if (typeof preset.id === 'string' && preset.id.startsWith('wled_')) {
          const numericId = parseInt(preset.id.replace('wled_', ''));
          if (activePreset.toString() === numericId.toString()) {
            return true;
          }
        }

        return false;
      },
      [activePreset, preset.id, preset.presetId]
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
    // Helper to check if this card is active
    const isCardActive = (activePreset: string | number | null, preset: any) => {
      if (!activePreset) return false;
      if (activePreset.toString() === preset.id.toString()) return true;
      if (preset.presetId && activePreset.toString() === preset.presetId.toString()) return true;
      if (typeof preset.id === 'string' && preset.id.startsWith('wled_')) {
        const numericId = parseInt(preset.id.replace('wled_', ''));
        if (activePreset.toString() === numericId.toString()) return true;
      }
      return false;
    };

    // Only check if this card's active state changed, not all activePreset changes
    const wasActive = isCardActive(prevProps.activePreset, prevProps.preset);
    const isActive = isCardActive(nextProps.activePreset, nextProps.preset);

    return (
      prevProps.preset.id === nextProps.preset.id &&
      prevProps.preset.name === nextProps.preset.name &&
      prevProps.preset.presetId === nextProps.preset.presetId &&
      prevProps.preset.effectName === nextProps.preset.effectName &&
      prevProps.index === nextProps.index &&
      wasActive === isActive && // Only re-render if THIS card's active state changed
      prevProps.isDark === nextProps.isDark &&
      prevProps.isDeleteMode === nextProps.isDeleteMode &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.showIcon === nextProps.showIcon
    );
  }
);

export default MemoizedPresetCard;
