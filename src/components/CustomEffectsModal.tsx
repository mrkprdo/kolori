import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWledPreset } from '../config/wledApi';
import FloatingModal from './FloatingModal';
import LEDVisualization from './LEDVisualization';
import CustomDropdown from './CustomDropdown';
import { WLED_EFFECTS } from '../data/wledEffects';
import { WLED_PALETTES_DATA, WLED_PALETTES_DEF, PaletteColor } from '../constants/palettes';
import { LinearGradient } from 'expo-linear-gradient';
import { wledWebSocketService } from '../services/wled';

// Cache for gradient colors to avoid recalculating
const paletteGradientCache = new Map<string, [string, string, ...string[]]>();

// Helper function to convert palette colors to LinearGradient colors
const getPaletteGradientColors = (paletteName: string): [string, string, ...string[]] => {
  // Check cache first
  if (paletteGradientCache.has(paletteName)) {
    return paletteGradientCache.get(paletteName)!;
  }

  const paletteData = WLED_PALETTES_DATA[paletteName];

  if (!paletteData || paletteData.length === 0) {
    const defaultGradient: [string, string, ...string[]] = ['#888888', '#555555'];
    paletteGradientCache.set(paletteName, defaultGradient);
    return defaultGradient;
  }

  // Convert palette color data to RGB strings
  const colors = paletteData.map((color: PaletteColor) =>
    `rgb(${color.red}, ${color.green}, ${color.blue})`
  );

  // Ensure at least 2 colors for LinearGradient
  let result: [string, string, ...string[]];
  if (colors.length === 0) {
    result = ['#888888', '#555555'];
  } else if (colors.length === 1) {
    result = [colors[0], colors[0]];
  } else {
    result = colors as [string, string, ...string[]];
  }

  // Cache the result
  paletteGradientCache.set(paletteName, result);
  return result;
};

// Custom Palette Dropdown Item Component
const PaletteDropdownItem = React.memo<{
  item: { id: number; label: string; value: any };
  isSelected: boolean;
  isDark: boolean;
  onPress: (item: any) => void;
}>(({ item, isSelected, isDark, onPress }) => {
  const handlePress = React.useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const gradientColors = React.useMemo(() =>
    getPaletteGradientColors(item.label),
    [item.label]
  );

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
        backgroundColor: isSelected
          ? (isDark ? '#374151' : '#f3f4f6')
          : 'transparent',
        minHeight: 56, // Taller to accommodate gradient
      }}
      activeOpacity={0.8}
    >
      {/* Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: 40,
          height: 24,
          borderRadius: 4,
          marginRight: 12,
          borderWidth: 2,
          borderColor: isDark ? '#4b5563' : '#1e293b',
        }}
      />

      {/* Palette Name */}
      <Text
        style={{
          fontSize: 16,
          flex: 1,
          color: isDark ? '#ffffff' : '#111827',
          fontWeight: isSelected ? '600' : '400',
        }}
        numberOfLines={1}
      >
        {item.label}
      </Text>

      {/* Selection Indicator */}
      {isSelected && (
        <Ionicons
          name="checkmark"
          size={20}
          color="#3b82f6"
        />
      )}
    </TouchableOpacity>
  );
});

// Custom Palette Dropdown Component
const PaletteDropdown = React.memo<{
  data: { id: number; label: string; value: any }[];
  selectedValue: any;
  onValueChange: (value: any) => void;
  placeholder?: string;
  isDark?: boolean;
  disabled?: boolean;
}>(({ data, selectedValue, onValueChange, placeholder = 'Select a palette...', isDark = false, disabled = false }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [debouncedSearchText, setDebouncedSearchText] = React.useState('');
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounce search text updates
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  const filteredData = React.useMemo(() => {
    if (debouncedSearchText.trim() === '') {
      return data;
    } else {
      const searchLower = debouncedSearchText.toLowerCase();
      return data.filter(item =>
        item.label.toLowerCase().includes(searchLower)
      );
    }
  }, [debouncedSearchText, data]);

  const openDropdown = React.useCallback(() => {
    if (disabled) return;
    setIsVisible(true);
    setSearchText('');
  }, [disabled]);

  const closeDropdown = React.useCallback(() => {
    setIsVisible(false);
    setSearchText('');
  }, []);

  const selectItem = React.useCallback((item: any) => {
    onValueChange(item.value);
    closeDropdown();
  }, [onValueChange, closeDropdown]);

  const getSelectedLabel = React.useCallback(() => {
    const selectedItem = data.find(item => item.value === selectedValue);
    return selectedItem?.label || placeholder;
  }, [data, selectedValue, placeholder]);

  const isSelected = selectedValue !== null && selectedValue !== undefined;

  const selectedGradientColors = React.useMemo((): [string, string, ...string[]] => {
    if (!isSelected) return ['#888888', '#555555'];
    const selectedItem = data.find(item => item.value === selectedValue);
    return selectedItem ? getPaletteGradientColors(selectedItem.label) : ['#888888', '#555555'];
  }, [isSelected, selectedValue, data]);

  return (
    <>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 8,
          borderWidth: 2,
          backgroundColor: isDark ? '#374151' : '#f9fafb',
          borderColor: isDark ? '#4b5563' : '#1e293b',
          minHeight: 50,
          opacity: disabled ? 0.6 : 1,
        }}
        onPress={openDropdown}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {/* Selected Palette Gradient Preview */}
        {isSelected && (
          <LinearGradient
            colors={selectedGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 32,
              height: 20,
              borderRadius: 4,
              marginRight: 12,
              borderWidth: 2,
              borderColor: isDark ? '#4b5563' : '#1e293b',
            }}
          />
        )}

        <Text
          style={{
            fontSize: 16,
            flex: 1,
            marginRight: 8,
            color: isSelected
              ? (isDark ? '#ffffff' : '#111827')
              : (isDark ? '#9ca3af' : '#6b7280'),
          }}
          numberOfLines={1}
        >
          {getSelectedLabel()}
        </Text>

        <Ionicons
          name="chevron-down"
          size={20}
          color={isDark ? '#9ca3af' : '#6b7280'}
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
          activeOpacity={1}
          onPress={closeDropdown}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              height: '60%',
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: isDark ? '#4b5563' : '#1e293b',
            }}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 0.5,
              borderBottomColor: isDark ? '#374151' : '#e5e7eb',
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDark ? '#ffffff' : '#111827',
              }}>
                Select Palette
              </Text>
              <TouchableOpacity
                onPress={closeDropdown}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: isDark ? '#374151' : '#e5e7eb',
            }}>
              <Ionicons
                name="search"
                size={20}
                color={isDark ? '#9ca3af' : '#6b7280'}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  color: isDark ? '#ffffff' : '#111827',
                }}
                placeholder="Search palettes..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Palettes List */}
            <FlatList
              data={filteredData}
              keyExtractor={(item) => `palette-${item.id}`}
              renderItem={({ item }) => (
                <PaletteDropdownItem
                  item={item}
                  isSelected={item.value === selectedValue}
                  isDark={isDark}
                  onPress={selectItem}
                />
              )}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={true}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 56,
                offset: 56 * index,
                index,
              })}
              ListEmptyComponent={
                <View style={{
                  alignItems: 'center',
                  paddingVertical: 32,
                }}>
                  <Ionicons
                    name="search-outline"
                    size={32}
                    color={isDark ? '#6b7280' : '#9ca3af'}
                  />
                  <Text style={{
                    fontSize: 16,
                    marginTop: 8,
                    color: isDark ? '#9ca3af' : '#6b7280',
                  }}>
                    No palettes found
                  </Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

interface CustomEffectsModalProps {
  visible: boolean;
  isDark?: boolean;
  onClose: () => void;
  selectedDevices?: any[];
  liveLedData?: any[];
  liveViewEnabled?: boolean;
  onLiveViewToggle?: (enabled: boolean) => void;
  onRefreshPresets?: () => Promise<void>;
}

interface SavePresetModalProps {
  visible: boolean;
  isDark?: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading?: boolean;
}

const SavePresetModal: React.FC<SavePresetModalProps> = ({
  visible,
  isDark = false,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    if (!presetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }
    if (presetName.length > 50) {
      Alert.alert('Error', 'Preset name must be 50 characters or less');
      return;
    }
    onSave(presetName.trim());
  };

  const handleClose = () => {
    setPresetName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
    >
      <View style={{
        flex: 1,
        backgroundColor: Platform.OS === 'ios' ? (isDark ? '#1f2937' : '#ffffff') : 'rgba(0, 0, 0, 0.5)',
        justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
        alignItems: Platform.OS === 'ios' ? 'stretch' : 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 0,
      }}>
        <View style={{
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#1f2937' : '#ffffff'),
          borderRadius: Platform.OS === 'ios' ? 0 : 12,
          padding: 24,
          marginHorizontal: Platform.OS === 'ios' ? 0 : 32,
          minWidth: Platform.OS === 'ios' ? '100%' : 280,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#111827',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            Save Custom Preset
          </Text>

          <Text style={{
            fontSize: 14,
            color: isDark ? '#9ca3af' : '#6b7280',
            marginBottom: 8,
          }}>
            Preset Name
          </Text>

          <TextInput
            value={presetName}
            onChangeText={setPresetName}
            placeholder="My Custom Effect"
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            maxLength={50}
            style={{
              backgroundColor: isDark ? '#374151' : '#f9fafb',
              borderWidth: 2,
              borderColor: isDark ? '#4b5563' : '#1e293b',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: isDark ? '#ffffff' : '#111827',
              marginBottom: 4,
            }}
            autoFocus
          />

          <Text style={{
            fontSize: 12,
            color: isDark ? '#9ca3af' : '#6b7280',
            marginBottom: 20,
            textAlign: 'right',
          }}>
            {presetName.length}/50
          </Text>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                flex: 1,
                backgroundColor: isDark ? '#4b5563' : '#f3f4f6',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: isDark ? '#4b5563' : '#1e293b',
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDark ? '#9ca3af' : '#6b7280',
              }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={!presetName.trim() || isLoading}
              style={{
                flex: 1,
                backgroundColor: (!presetName.trim() || isLoading) ? '#9ca3af' : '#3b82f6',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 2,
                borderColor: isDark ? '#4b5563' : '#1e293b',
              }}
            >
              {isLoading && <ActivityIndicator size="small" color="white" />}
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: 'white',
              }}>
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Renders a modal UI for selecting, previewing, applying, and saving custom WLED effects and palettes for a connected device.
 *
 * @param visible - Whether the modal is visible
 * @param isDark - Optional flag to render dark theme styles
 * @param onClose - Callback invoked when the modal is closed
 * @param selectedDevices - Array of connected devices; the first device is used for device-specific actions
 * @param liveLedData - Optional live LED data used by the live visualization
 * @param liveViewEnabled - Whether the live view visualization is enabled
 * @param onLiveViewToggle - Optional callback invoked with the new live view enabled state
 * @param onRefreshPresets - Optional callback to refresh presets after a successful save
 * @returns A React element representing the Custom Effects modal
 */
export default function CustomEffectsModal({
  visible,
  isDark = false,
  onClose,
  selectedDevices = [],
  liveLedData = [],
  liveViewEnabled = false,
  onLiveViewToggle,
  onRefreshPresets,
}: CustomEffectsModalProps) {
  // Use static data instead of device queries
  const [selectedEffect, setSelectedEffect] = useState<number | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deviceDimensions, setDeviceDimensions] = useState<'1D' | '2D' | null>(null);
  const selectedEffectRef = useRef<number | null>(null);

  // Detect WLED device dimensions
  const detectWledDimensions = useCallback(async (deviceIp: string): Promise<'1D' | '2D' | null> => {
    try {
      const response = await fetch(`http://${deviceIp}/settings/s.js?p=10`, {
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
      }

      const responseText = await response.text();
      const sompMatch = responseText.match(/d\.Sf\.SOMP\.value\s*=\s*(\d+)/);

      if (sompMatch) {
        const sompValue = parseInt(sompMatch[1]);
        return sompValue === 0 ? '1D' : '2D';
      }
      return null;
    } catch (error) {
      console.error('Failed to detect WLED dimensions:', error);
      return null;
    }
  }, []);

  // Detect device dimensions when modal opens and device is available
  useEffect(() => {
    if (visible && selectedDevices.length > 0 && selectedDevices[0].isConnected) {
      const deviceIp = selectedDevices[0].ip;
      detectWledDimensions(deviceIp)
        .then(dimensions => {
          setDeviceDimensions(dimensions);
        })
        .catch(error => {
          console.error('Failed to detect device dimensions:', error);
          setDeviceDimensions(null);
        });
    } else {
      setDeviceDimensions(null);
    }
  }, [visible, selectedDevices, detectWledDimensions]);

  // Filter effects based on device capabilities
  const effects = useMemo(() => {
    return WLED_EFFECTS.filter(effect => {
      if (!effect || effect.name === `Unknown Effect ${effect.id}`) {
        return false;
      }

      // If device dimensions are unknown, default to 1D filtering (safer)
      if (deviceDimensions === null) {
        return effect.supports1D;
      }

      // Filter based on detected device dimensions
      if (deviceDimensions === '1D') {
        return effect.supports1D; // Include effects that support 1D
      } else if (deviceDimensions === '2D') {
        return effect.supports1D || effect.supports2D; // Include both 1D and 2D effects
      }

      return false;
    }).sort((a, b) => {
      // Keep "Solid" first, then alphabetical
      if (a.name === 'Solid') return -1;
      if (b.name === 'Solid') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [deviceDimensions]);

  const palettes = useMemo(() => {
    // Use the static palette definitions
    return WLED_PALETTES_DEF;
  }, []);

  // Memoize palette dropdown data to prevent infinite re-renders
  const memoizedPaletteData = useMemo(() => {
    return palettes.map(palette => ({
      id: palette.id,
      label: palette.name,
      value: palette.id,
    }));
  }, [palettes]);

  // Memoize effects dropdown data to prevent re-renders
  const memoizedEffectsData = useMemo(() => {
    return effects.map(effect => ({
      id: effect.id,
      label: effect.displayName,
      value: effect.id,
    }));
  }, [effects]);

  const sectionStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 12,
    marginBottom: 6,
    padding: 16,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  };

  const buttonContainerStyle = {
    paddingTop: 4,
    flexDirection: 'row' as const,
    gap: 8,
  };

  const footerButtonPrimaryStyle = {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#1e293b',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  };

  const footerButtonTextStyle = {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'white',
  };

  // Clear form when modal opens
  useEffect(() => {
    if (visible) {
      selectedEffectRef.current = null;
      setSelectedEffect(null);
      setSelectedPalette(null);
      setShowSaveModal(false);
      setIsSaving(false);
    } else {
      // Reset device dimensions when modal closes
      setDeviceDimensions(null);
    }
  }, [visible]);

  const applyEffect = useCallback(async (effectId: number, paletteId: number | null) => {
    if (selectedDevices.length === 0) {
      return;
    }

    const device = selectedDevices[0];
    if (!device.isConnected) {
      return;
    }

    try {
      const currentEffect = effects.find(e => e.id === effectId);

      // Build the command - only include palette if the effect supports it
      const command: any = {
        seg: [{
          fx: effectId,
        }],
      };

      if (currentEffect?.supportsPalette && paletteId !== null) {
        command.seg[0].pal = paletteId;
      }

      wledWebSocketService.sendCommand(command);
    } catch (error) {
      console.error('Error applying effect:', error);
    }
  }, [selectedDevices, effects]);

  const handleEffectChange = useCallback((effectId: number | null) => {
    selectedEffectRef.current = effectId;
    setSelectedEffect(effectId);

    if (effectId !== null) {
      const selectedEffectData = effects.find(e => e.id === effectId);
      if (selectedEffectData) {
        if (selectedEffectData.supportsPalette) {
          // Effect supports palettes - set default palette if palettes are loaded
          if (palettes.length > 0 && selectedPalette === null) {
            // Find "Default" palette or use first palette as default
            const defaultPalette = palettes.find(p => p.name.toLowerCase().includes('default')) || palettes[0];
            setSelectedPalette(defaultPalette.id);

            // Auto-apply the effect with the default palette
            applyEffect(effectId, defaultPalette.id);
            return;
          } else if (palettes.length > 0 && selectedPalette !== null) {
            // Keep current palette selection
            applyEffect(effectId, selectedPalette);
            return;
          }
        } else {
          // Effect doesn't support palettes - reset palette selection and auto-apply
          setSelectedPalette(null);
          applyEffect(effectId, null);
          return;
        }
      }
    }

    // Auto-apply the effect (for effects that support palettes but none selected yet)
    if (effectId !== null) {
      applyEffect(effectId, selectedPalette);
    }
  }, [effects, palettes, selectedPalette, applyEffect]);

  const getSelectedEffect = () => {
    return effects.find(e => e.id === selectedEffect);
  };

  const handlePaletteChange = useCallback((paletteId: number | null) => {
    setSelectedPalette(paletteId);
    // Auto-apply the effect with new palette
    if (selectedEffectRef.current !== null) {
      applyEffect(selectedEffectRef.current, paletteId);
    }
  }, [applyEffect]);

  const handleSavePreset = async (presetName: string) => {
    const currentEffect = getSelectedEffect();
    if (selectedEffect === null) {
      Alert.alert('Incomplete Selection', 'Please select an effect to save.');
      return;
    }

    if (currentEffect?.supportsPalette && selectedPalette === null) {
      Alert.alert('Incomplete Selection', 'Please select a palette for this effect.');
      return;
    }

    if (selectedDevices.length === 0) {
      Alert.alert('No Device Selected', 'Please select a device to save the preset to.');
      return;
    }

    const device = selectedDevices[0];

    // Enhanced device validation
    if (!device || !device.ip) {
      Alert.alert('Error', 'No WLED device connected. Please connect to a device first.');
      return;
    }

    // Validate device is actually connected
    if (!device.isConnected) {
      Alert.alert('Error', 'WLED device is not connected. Please check your device connection.');
      return;
    }

    setIsSaving(true);
    try {
      // Use the new createWledPreset function from wledApi with enhanced error handling
      const result = await createWledPreset(
        device.ip,
        selectedEffect!,
        selectedPalette || 0, // Use 0 as default palette ID if null
        presetName,
        undefined, // Let it auto-generate preset ID
        device.protocol || 'http'
      );

      if (!result.success) {
        const errorMessage = result.message || 'Failed to save preset to WLED device';
        console.error('Preset save failed:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!result.presetId) {
        console.warn('Preset saved but no preset ID returned');
      }
      setShowSaveModal(false);

      // Refresh the preset list from the device
      if (onRefreshPresets) {
        try {
          await onRefreshPresets();
        } catch (error) {
          console.error('Failed to refresh presets:', error);
        }
      }

      Alert.alert('Preset Saved', `"${presetName}" has been saved to your WLED device!`, [
        {
          text: 'OK',
          onPress: () => {
            // Reset form and close modal
            selectedEffectRef.current = null;
            setSelectedEffect(null);
            setSelectedPalette(null);
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Preset save error - Full details:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        deviceInfo: {
          ip: device?.ip,
          protocol: device?.protocol,
          isConnected: device?.isConnected
        }
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Preset Save Failed',
        `Could not save preset to WLED device:\n\n${errorMessage}\n\nPlease check:\n• Device is connected\n• Device is responding\n• Network connection is stable`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Clear all form data and reset state
    selectedEffectRef.current = null;
    setSelectedEffect(null);
    setSelectedPalette(null);
    setShowSaveModal(false);
    setIsSaving(false);
    setDeviceDimensions(null);
    onClose();
  };

  const footerContent = selectedDevices.length > 0 ? (
    <View style={buttonContainerStyle}>
      {(() => {
        const currentEffect = getSelectedEffect();
        const isEffectSelected = selectedEffect !== null;
        const isPaletteRequired = currentEffect?.supportsPalette && selectedPalette === null;
        const canSave = isEffectSelected && !isPaletteRequired;

        return (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS === 'ios') {
                Alert.prompt(
                  'Save Custom Preset',
                  'Enter preset name:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Save',
                      onPress: (text) => {
                        if (text && text.trim()) {
                          handleSavePreset(text.trim());
                        }
                      }
                    }
                  ],
                  'plain-text',
                  '',
                  'default'
                );
              } else {
                setShowSaveModal(true);
              }
            }}
            disabled={!canSave}
            style={[
              footerButtonPrimaryStyle,
              {
                backgroundColor: canSave ? '#3b82f6' : '#9ca3af',
                opacity: canSave ? 1 : 0.6,
                flex: 1, // Make it take full width
              }
            ]}
          >
            <Ionicons name="save-outline" size={20} color="white" />
            <Text style={footerButtonTextStyle}>Save Preset</Text>
          </TouchableOpacity>
        );
      })()}
    </View>
  ) : undefined;

  return (
    <>
    <FloatingModal
      visible={visible}
      isDark={isDark}
      onClose={handleClose}
      title="Add Custom Effects"
      scrollable={true}
      footer={footerContent}
    >
      {selectedDevices.length === 0 && (
            <View style={[sectionStyle, { alignItems: 'center', padding: 24 }]}>
              <Ionicons
                name="warning-outline"
                size={48}
                color={isDark ? '#fbbf24' : '#f59e0b'}
              />
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                color: isDark ? '#ffffff' : '#111827',
                marginTop: 12,
                textAlign: 'center',
              }}>
                No Device Selected
              </Text>
              <Text style={{
                fontSize: 14,
                color: isDark ? '#9ca3af' : '#6b7280',
                marginTop: 4,
                textAlign: 'center',
              }}>
                Please select a WLED device to apply effects.
              </Text>
            </View>
          )}

          {selectedDevices.length > 0 && (
            <>
              {/* Effects and Palette Dropdown */}
              <View style={sectionStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isDark ? '#ffffff' : '#111827',
                  }}>
                    Effect
                  </Text>
                  {deviceDimensions && (
                    <Text style={{
                      fontSize: 12,
                      color: isDark ? '#9ca3af' : '#6b7280',
                      backgroundColor: isDark ? '#374151' : '#f3f4f6',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}>
                      {deviceDimensions} Device
                    </Text>
                  )}
                </View>

                <CustomDropdown
                  data={memoizedEffectsData}
                  selectedValue={selectedEffect}
                  onValueChange={handleEffectChange}
                  placeholder="Select an effect..."
                  isDark={isDark}
                  searchable={true}
                />

                {/* Palettes Dropdown - Only show if effect is selected and supports palettes */}
                {(() => {
                  const currentEffect = getSelectedEffect();
                  // Hide palette dropdown by default - only show when effect is selected and supports palettes
                  const showPalettes = selectedEffect !== null && currentEffect && currentEffect.supportsPalette;

                  if (!showPalettes) return null;

                  return (
                    <>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: isDark ? '#ffffff' : '#111827',
                        marginTop: 16,
                        marginBottom: 12,
                      }}>
                        Palette
                      </Text>

                      <PaletteDropdown
                        data={memoizedPaletteData}
                        selectedValue={selectedPalette}
                        onValueChange={handlePaletteChange}
                        placeholder="Select a palette..."
                        isDark={isDark}
                      />
                    </>
                  );
                })()}
              </View>

            </>
          )}
    </FloatingModal>

      {/* Save Preset Modal - Only for non-iOS platforms */}
      {Platform.OS !== 'ios' && (
        <SavePresetModal
          visible={showSaveModal}
          isDark={isDark}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSavePreset}
          isLoading={isSaving}
        />
      )}
    </>
  );
}