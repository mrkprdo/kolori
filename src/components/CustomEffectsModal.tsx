import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWledPreset } from '../config/wledApi';
import FloatingModal from './FloatingModal';
import LEDVisualization from './LEDVisualization';
import CustomDropdown from './CustomDropdown';
import { WLEDEffectData, getEffectByName } from '../data/wledEffects';

interface Palette {
  id: number;
  name: string;
}

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
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderRadius: 12,
          padding: 24,
          marginHorizontal: 32,
          minWidth: 280,
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
              borderWidth: 1,
              borderColor: isDark ? '#4b5563' : '#d1d5db',
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

// Simple cache for device data
const deviceCache = new Map<string, {
  effects: WLEDEffectData[];
  palettes: Palette[];
  dimensions: '1D' | '2D' | null;
  timestamp: number;
}>();

const CACHE_DURATION = 30000; // 30 seconds cache

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
  const [effects, setEffects] = useState<WLEDEffectData[]>([]);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<number | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<number | null>(null);
  const [isLoadingEffects, setIsLoadingEffects] = useState(false);
  const [isLoadingPalettes, setIsLoadingPalettes] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const loadingRef = useRef<string | null>(null);
  const lastLoadedDeviceRef = useRef<string | null>(null);

  const sectionStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  };

  const containerStyle = {
    flex: 1,
  };

  const contentContainerStyle = {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  };

  const stickyFooterStyle = {
    borderTopWidth: 1, 
    borderTopColor: isDark ? '#374151' : '#e5e7eb', 
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: isDark ? 0.25 : 0.1,
    shadowRadius: 4,
    elevation: 4,
  };

  const buttonContainerStyle = {
    padding: 16,
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

  // Function to detect if WLED device is configured for 1D or 2D
  const detectWledDimensions = async (deviceIp: string): Promise<'1D' | '2D' | null> => {
    try {
      const response = await fetch(`http://${deviceIp}/settings/s.js?p=10`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
      }
      
      const responseText = await response.text();
      console.log('WLED settings response:', responseText);
      
      // Parse the JavaScript response to find d.Sf.SOMP.value
      // Look for the pattern d.Sf.SOMP.value=0 (1D) or d.Sf.SOMP.value=1 (2D)
      const sompMatch = responseText.match(/d\.Sf\.SOMP\.value\s*=\s*(\d+)/);
      
      if (sompMatch) {
        const sompValue = parseInt(sompMatch[1]);
        const dimensions = sompValue === 0 ? '1D' : '2D';
        console.log(`WLED device configured for: ${dimensions} (SOMP value: ${sompValue})`);
        return dimensions;
      } else {
        console.warn('Could not parse SOMP value from settings response');
        return null;
      }
    } catch (error) {
      console.error('Failed to detect WLED dimensions:', error);
      return null;
    }
  };

  const fetchEffects = useCallback(async () => {
    if (selectedDevices.length === 0) {
      console.log('No devices selected for effects fetch');
      return;
    }

    const device = selectedDevices[0];
    const cacheKey = `${device.ip}-effects`;
    const cached = deviceCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Using cached effects data');
      setEffects(cached.effects);
      return;
    }

    setIsLoadingEffects(true);
    try {
      console.log('Loading effects from device and lookup table:', device.ip);
      
      // Load device dimensions and effects list in parallel for better performance
      const [deviceDimensions, effectsResponse] = await Promise.all([
        detectWledDimensions(device.ip),
        fetch(`http://${device.ip}/json/eff`)
      ]);
      
      console.log('Device dimensions detected:', deviceDimensions);
      
      if (!effectsResponse.ok) {
        throw new Error(`HTTP ${effectsResponse.status}: ${effectsResponse.statusText || 'Unknown error'}`);
      }
      
      const deviceEffectsData: string[] = await effectsResponse.json();
      console.log('Successfully loaded effects list from device:', deviceEffectsData.length, 'effects');
      
      // Process effects in batches to avoid blocking the main thread
      const effectsList: WLEDEffectData[] = [];
      
      for (const effectName of deviceEffectsData) {
        const lookupEffect = getEffectByName(effectName);

        if (lookupEffect) {
          // Filter based on device dimensions configuration
          let shouldInclude = true;
          
          if (deviceDimensions === '1D' && !lookupEffect.supports1D) {
            shouldInclude = false;
          } else if (deviceDimensions === '2D' && !lookupEffect.supports2D) {
            shouldInclude = false;
          }
          
          if (shouldInclude) {
            effectsList.push(lookupEffect);
          }
        }
      }
      
      // Sort effects alphabetically, but keep "Solid" first
      const sortedEffectsList = effectsList.sort((a, b) => {
        if (a.name === 'Solid') return -1;
        if (b.name === 'Solid') return 1;
        return a.name.localeCompare(b.name);
      });
      
      console.log(`Processed effects list: ${sortedEffectsList.length} effects from device (filtered for ${deviceDimensions})`);
      
      // Cache the results
      const existingCache = deviceCache.get(cacheKey) || { 
        effects: [], 
        palettes: [], 
        dimensions: null, 
        timestamp: 0 
      };
      deviceCache.set(cacheKey, {
        ...existingCache,
        effects: sortedEffectsList,
        dimensions: deviceDimensions,
        timestamp: Date.now()
      });
      
      setEffects(sortedEffectsList);
      
    } catch (error) {
      console.error('Failed to load effects from device:', error);
      setEffects([]);
    } finally {
      setIsLoadingEffects(false);
    }
  }, [selectedDevices]);

  const fetchPalettes = useCallback(async () => {
    if (selectedDevices.length === 0) {
      console.log('No devices selected for palettes fetch');
      return;
    }

    const device = selectedDevices[0];
    const cacheKey = `${device.ip}-palettes`;
    const cached = deviceCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Using cached palettes data');
      setPalettes(cached.palettes);
      return;
    }

    setIsLoadingPalettes(true);
    try {
      console.log('Fetching palettes from device:', device.ip);
      const response = await fetch(`http://${device.ip}/json/pal`);
      
      if (!response.ok) {
        const errorMsg = response.statusText || 'Unknown error';
        if (response.status === 503) {
          throw new Error(`Device temporarily unavailable (${response.status}). The WLED device may be busy or restarting.`);
        } else if (response.status === 404) {
          throw new Error(`Palettes endpoint not found (${response.status}). This device may not support the json/pal API.`);
        } else {
          throw new Error(`HTTP ${response.status}: ${errorMsg}`);
        }
      }
      
      const palettesData = await response.json();
      
      // Transform the palettes data into the format we need
      const palettesList: Palette[] = palettesData.map((palette: string, index: number) => ({
        id: index,
        name: palette,
      }));
      
      console.log('Processed palettes list:', palettesList.length, 'palettes');
      
      // Cache the results
      const existingCache = deviceCache.get(cacheKey) || { 
        effects: [], 
        palettes: [], 
        dimensions: null, 
        timestamp: 0 
      };
      deviceCache.set(cacheKey, {
        ...existingCache,
        palettes: palettesList,
        timestamp: Date.now()
      });
      
      setPalettes(palettesList);
      
    } catch (error) {
      console.error('Failed to fetch palettes:', error);
      
      let errorMessage = 'Could not load palettes from the device.';
      if (error instanceof Error) {
        if (error.message.includes('503')) {
          errorMessage += ' The device appears to be temporarily unavailable. Please wait a moment and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage += ' The request timed out. Please check your network connection.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          errorMessage += ' Please check that the device is online and accessible.';
        } else {
          errorMessage += `\n\nError: ${error.message}`;
        }
      }
      
      Alert.alert('Failed to Load Palettes', errorMessage);
    } finally {
      setIsLoadingPalettes(false);
    }
  }, [selectedDevices]);

  // Memoize the current device IP to prevent infinite re-renders
  const currentDeviceIp = useMemo(() => {
    if (selectedDevices.length === 0) return null;
    const firstDevice = selectedDevices[0];
    return firstDevice?.ip || null;
  }, [selectedDevices.length, selectedDevices[0]?.ip]);

  // Clear form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedEffect(null);
      setSelectedPalette(null);
      setShowSaveModal(false);
      setIsSaving(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !currentDeviceIp) {
      return;
    }
    
    // Only load if the device has actually changed
    if (lastLoadedDeviceRef.current === currentDeviceIp) {
      return;
    }
    
    // Prevent multiple simultaneous loads for the same device
    if (loadingRef.current === currentDeviceIp) {
      return;
    }
    
    // Check if we already have cached data for this device
    const cacheKey = `${currentDeviceIp}-effects`;
    const cached = deviceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      // We have valid cached data, use it directly
      console.log('Using cached data for device:', currentDeviceIp);
      setEffects(cached.effects);
      setPalettes(cached.palettes);
      lastLoadedDeviceRef.current = currentDeviceIp;
      return;
    }
    
    loadingRef.current = currentDeviceIp;
    
    // Load effects and palettes in parallel for better performance
    Promise.all([fetchEffects(), fetchPalettes()]).finally(() => {
      loadingRef.current = null;
      lastLoadedDeviceRef.current = currentDeviceIp;
    }).catch(error => {
      console.error('Error loading effects or palettes:', error);
    });
  }, [visible, currentDeviceIp]);

  const handleEffectChange = (effectId: number | null) => {
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
            console.log(`Auto-selected default palette: "${defaultPalette.name}" (ID: ${defaultPalette.id})`);
            
            // Auto-apply the effect with the default palette
            applyEffect(effectId, defaultPalette.id);
            return;
          } else if (palettes.length > 0 && selectedPalette !== null) {
            // Keep current palette selection
            applyEffect(effectId, selectedPalette);
            return;
          }
          // If palettes aren't loaded yet, fetchPalettes will be triggered by the useEffect
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
  };

  const getSelectedEffect = () => {
    return effects.find(e => e.id === selectedEffect);
  };

  const handlePaletteChange = (paletteId: number | null) => {
    setSelectedPalette(paletteId);
    // Auto-apply the effect with new palette
    if (selectedEffect !== null) {
      applyEffect(selectedEffect, paletteId);
    }
  };

  const applyEffect = async (effectId: number, paletteId: number | null) => {
    if (selectedDevices.length === 0) {
      console.log('No device selected for effect application');
      return;
    }

    const device = selectedDevices[0];
    if (!device.isConnected) {
      console.log('Device not connected, skipping effect application');
      return;
    }

    try {
      const currentEffect = effects.find(e => e.id === effectId);
      
      // Build the request body - only include palette if the effect supports it
      const requestBody: any = {
        seg: {
          fx: effectId,
        },
      };

      if (currentEffect?.supportsPalette && paletteId !== null) {
        requestBody.seg.pal = paletteId;
      }

      const response = await fetch(`http://${device.ip}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`Failed to apply effect: HTTP ${response.status}`);
      } else {
        console.log(`Applied effect ${effectId} with palette ${paletteId} to device ${device.ip}`);
      }
    } catch (error) {
      console.error('Error applying effect:', error);
    }
  };


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
      console.log('🔄 Attempting to save preset to WLED device:', {
        deviceIp: device.ip,
        protocol: device.protocol || 'http',
        presetName,
        effectId: selectedEffect,
        paletteId: selectedPalette
      });

      // Use the new createWledPreset function from wledApi with enhanced error handling
      const result = await createWledPreset(
        device.ip,
        selectedEffect!,
        selectedPalette || 0, // Use 0 as default palette ID if null
        presetName,
        undefined, // Let it auto-generate preset ID
        device.protocol || 'http'
      );

      console.log('📡 WLED API Response:', result);

      if (!result.success) {
        const errorMessage = result.message || 'Failed to save preset to WLED device';
        console.error('❌ Preset save failed:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!result.presetId) {
        console.warn('⚠️ Preset saved but no preset ID returned');
      }

      console.log('✅ Preset saved successfully:', result);
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
    setEffects([]);
    setPalettes([]);
    setSelectedEffect(null);
    setSelectedPalette(null);
    setShowSaveModal(false);
    setIsSaving(false);
    // Reset loading refs so fresh data can be loaded on next open
    lastLoadedDeviceRef.current = null;
    loadingRef.current = null;
    onClose();
  };

  return (
    <>
    <FloatingModal
      visible={visible}
      isDark={isDark}
      onClose={handleClose}
      title="Add Custom Effects"
      scrollable={false}
    >
      <View style={containerStyle}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={contentContainerStyle}>
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
                Please select a WLED device to load effects and palettes.
              </Text>
            </View>
          )}

          {selectedDevices.length > 0 && (
            <>
              {/* Live View Section */}
              <View style={sectionStyle}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isDark ? '#ffffff' : '#111827',
                  }}>
                    Live View
                  </Text>
                  <TouchableOpacity
                    onPress={() => onLiveViewToggle?.(!liveViewEnabled)}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: liveViewEnabled 
                        ? '#3b82f6' 
                        : isDark ? '#4b5563' : '#d1d5db',
                      justifyContent: 'center',
                      paddingHorizontal: 2,
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#ffffff',
                      transform: [{ translateX: liveViewEnabled ? 20 : 0 }],
                    }} />
                  </TouchableOpacity>
                </View>
                
                <View style={{
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 60,
                }}>
                  {liveViewEnabled && liveLedData.length > 0 ? (
                    <LEDVisualization 
                      ledData={liveLedData}
                      subtextColor={isDark ? '#9ca3af' : '#6b7280'}
                      liveViewLedSize="normal"
                      containerWidth={300} // Modal content width
                      showLedCount={true}
                    />
                  ) : liveViewEnabled ? (
                    <Text style={{
                      fontSize: 14,
                      color: isDark ? '#9ca3af' : '#6b7280',
                      textAlign: 'center',
                    }}>
                      No live data available
                    </Text>
                  ) : (
                    <Text style={{
                      fontSize: 14,
                      color: isDark ? '#9ca3af' : '#6b7280',
                      textAlign: 'center',
                    }}>
                      Live view disabled
                    </Text>
                  )}
                </View>
              </View>

              {/* Effects Dropdown */}
              <View style={sectionStyle}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#ffffff' : '#111827',
                  marginBottom: 12,
                }}>
                  Effect
                </Text>
                
                {isLoadingEffects ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={{
                      marginTop: 8,
                      color: isDark ? '#9ca3af' : '#6b7280',
                    }}>
                      Loading effects...
                    </Text>
                  </View>
                ) : effects.length === 0 ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Ionicons 
                      name="refresh-outline" 
                      size={32} 
                      color={isDark ? '#9ca3af' : '#6b7280'} 
                    />
                    <Text style={{
                      marginTop: 8,
                      marginBottom: 12,
                      color: isDark ? '#9ca3af' : '#6b7280',
                      textAlign: 'center',
                    }}>
                      Failed to load effects. Please try again.
                    </Text>
                    <TouchableOpacity
                      onPress={fetchEffects}
                      style={{
                        backgroundColor: '#3b82f6',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{
                        color: 'white',
                        fontWeight: '600',
                        fontSize: 14,
                      }}>
                        Retry
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <CustomDropdown
                    data={effects.map(effect => ({
                      id: effect.id,
                      label: effect.displayName,
                      value: effect.id,
                    }))}
                    selectedValue={selectedEffect}
                    onValueChange={handleEffectChange}
                    placeholder="Select an effect..."
                    isDark={isDark}
                    searchable={true}
                  />
                )}
              </View>

              {/* Palettes Dropdown - Only show if effect is selected and supports palettes */}
              {(() => {
                const currentEffect = getSelectedEffect();
                // Hide palette dropdown by default - only show when effect is selected and supports palettes
                const showPalettes = selectedEffect !== null && currentEffect && currentEffect.supportsPalette;
                
                if (!showPalettes) return null;
                
                return (
                  <View style={sectionStyle}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isDark ? '#ffffff' : '#111827',
                      marginBottom: 12,
                    }}>
                      Palette
                    </Text>
                    
                    {isLoadingPalettes ? (
                      <View style={{ alignItems: 'center', padding: 20 }}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                        <Text style={{
                          marginTop: 8,
                          color: isDark ? '#9ca3af' : '#6b7280',
                        }}>
                          Loading palettes...
                        </Text>
                      </View>
                    ) : (
                      <CustomDropdown
                        data={palettes.map(palette => ({
                          id: palette.id,
                          label: palette.name,
                          value: palette.id,
                        }))}
                        selectedValue={selectedPalette}
                        onValueChange={handlePaletteChange}
                        placeholder="Select a palette..."
                        isDark={isDark}
                        searchable={true}
                      />
                    )}
                  </View>
                );
              })()}

            </>
          )}
        </ScrollView>
        
        {/* Sticky Footer with Save Button */}
        {selectedDevices.length > 0 && (
          <View style={stickyFooterStyle}>
            <View style={buttonContainerStyle}>
              {(() => {
                const currentEffect = getSelectedEffect();
                const isEffectSelected = selectedEffect !== null;
                const isPaletteRequired = currentEffect?.supportsPalette && selectedPalette === null;
                const canSave = isEffectSelected && !isPaletteRequired;
                
                return (
                  <TouchableOpacity
                    onPress={() => setShowSaveModal(true)}
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
          </View>
        )}
      </View>
    </FloatingModal>

      {/* Save Preset Modal */}
      <SavePresetModal
        visible={showSaveModal}
        isDark={isDark}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSavePreset}
        isLoading={isSaving}
      />
    </>
  );
}