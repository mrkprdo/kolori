import React, { useState, useEffect, useCallback } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { createWledPreset } from '../config/wledApi';
import FloatingModal from './FloatingModal';

interface Effect {
  id: number;
  name: string;
}

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
  const [effects, setEffects] = useState<Effect[]>([]);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<number | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<number | null>(null);
  const [isLoadingEffects, setIsLoadingEffects] = useState(false);
  const [isLoadingPalettes, setIsLoadingPalettes] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const footerButtonSecondaryStyle = {
    flex: 1, 
    flexDirection: 'row' as const, 
    alignItems: 'center' as const, 
    justifyContent: 'center' as const, 
    paddingVertical: 14, 
    paddingHorizontal: 20,
    borderRadius: 12, 
    gap: 6,
    shadowColor: '#10b981',
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

  const fetchEffects = useCallback(async () => {
    if (selectedDevices.length === 0) {
      console.log('No devices selected for effects fetch');
      return;
    }

    setIsLoadingEffects(true);
    try {
      const device = selectedDevices[0]; // Use first selected device
      console.log('Fetching effects from device:', device.ip);
      const response = await fetch(`http://${device.ip}/json/eff`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const effectsData = await response.json();
      console.log('Effects data received:', effectsData);
      
      // Transform the effects data into the format we need
      const effectsList: Effect[] = effectsData.map((effect: string, index: number) => ({
        id: index,
        name: effect,
      }));
      
      console.log('Processed effects list:', effectsList.length, 'effects');
      setEffects(effectsList);
    } catch (error) {
      console.error('Failed to fetch effects:', error);
      Alert.alert(
        'Failed to Load Effects',
        `Could not load effects from the device. Please check your connection and try again.\n\nError: ${(error as Error).message}`
      );
    } finally {
      setIsLoadingEffects(false);
    }
  }, [selectedDevices.length > 0 ? selectedDevices[0]?.ip : null]);

  const fetchPalettes = useCallback(async () => {
    if (selectedDevices.length === 0) {
      console.log('No devices selected for palettes fetch');
      return;
    }

    setIsLoadingPalettes(true);
    try {
      const device = selectedDevices[0]; // Use first selected device
      console.log('Fetching palettes from device:', device.ip);
      const response = await fetch(`http://${device.ip}/json/pal`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const palettesData = await response.json();
      
      // Transform the palettes data into the format we need
      const palettesList: Palette[] = palettesData.map((palette: string, index: number) => ({
        id: index,
        name: palette,
      }));
      
      setPalettes(palettesList);
    } catch (error) {
      console.error('Failed to fetch palettes:', error);
      Alert.alert(
        'Failed to Load Palettes',
        `Could not load palettes from the device. Please check your connection and try again.\n\nError: ${(error as Error).message}`
      );
    } finally {
      setIsLoadingPalettes(false);
    }
  }, [selectedDevices.length > 0 ? selectedDevices[0]?.ip : null]);

  useEffect(() => {
    if (visible) {
      fetchEffects();
      fetchPalettes();
    }
  }, [visible, fetchEffects, fetchPalettes]);

  const testEffect = async () => {
    console.log('🧪 Testing effect:', selectedEffect, 'with palette:', selectedPalette);

    if (selectedEffect === null || selectedPalette === null) {
      Alert.alert('Incomplete Selection', 'Please select both an effect and a palette to test.');
      return;
    }

    if (selectedDevices.length === 0) {
      Alert.alert('No Device Selected', 'Please select a device to test the effect.');
      return;
    }

    const device = selectedDevices[0];
    if (!device.isConnected) {
      Alert.alert(
        'Device Disconnected', 
        `${device.name} is disconnected. Please check your device connection before testing effects.`
      );
      return;
    }

    setIsTesting(true);
    try {
      console.log('Sending test request to device:', device.ip);
      
      const response = await fetch(`http://${device.ip}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seg: {
            fx: selectedEffect,
            pal: selectedPalette,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Test effect response:', responseData);
    } catch (error) {
      console.error('Failed to test effect:', error);
      Alert.alert(
        'Test Failed',
        `Could not apply the effect to the device. Please check your connection and try again.\n\nError: ${(error as Error).message}`
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSavePreset = async (presetName: string) => {
    if (selectedEffect === null || selectedPalette === null) {
      Alert.alert('Incomplete Selection', 'Please select both an effect and a palette to save.');
      return;
    }

    if (selectedDevices.length === 0) {
      Alert.alert('No Device Selected', 'Please select a device to save the preset to.');
      return;
    }

    setIsSaving(true);
    try {
      const device = selectedDevices[0];
      console.log('Saving preset:', presetName, 'with effect:', selectedEffect, 'palette:', selectedPalette);
      
      // Use the new createWledPreset function from wledApi
      const result = await createWledPreset(
        device.ip,
        selectedEffect,
        selectedPalette,
        presetName,
        undefined, // Let it auto-generate preset ID
        device.protocol || 'http'
      );
      
      if (result.success) {
        console.log('Preset saved successfully:', result);
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
              // Close modal after refresh
              onClose();
            }
          }
        ]);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      Alert.alert(
        'Save Failed',
        `Could not save the preset to the device. Please check your connection and try again.\n\nError: ${(error as Error).message}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setEffects([]);
    setPalettes([]);
    setSelectedEffect(null);
    setSelectedPalette(null);
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
                    <View>
                      <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        maxWidth: 300, // Account for modal width
                      }}>
                        {liveLedData.map((color: any, index: number) => {
                          // Calculate optimal LED size based on count (same logic as PresetGrid)
                          const ledCount = liveLedData.length;
                          const screenWidth = 300; // Modal content width
                          
                          const getOptimalSize = (count: number) => {
                            if (count <= 20) {
                              return Math.min(Math.floor(screenWidth / count) - 2, 12);
                            } else if (count <= 100) {
                              const columns = Math.ceil(Math.sqrt(count));
                              return Math.min(Math.floor(screenWidth / columns) - 2, 8);
                            } else if (count <= 300) {
                              const columns = Math.ceil(Math.sqrt(count));
                              return Math.min(Math.floor(screenWidth / columns) - 1, 4);
                            } else {
                              const columns = Math.min(Math.ceil(Math.sqrt(count)), 40);
                              return Math.max(Math.floor(screenWidth / columns) - 1, 2);
                            }
                          };
                          
                          const ledSize = getOptimalSize(ledCount);
                          const brightness = (color.r + color.g + color.b) / 3 / 255;
                          const isActive = brightness > 0.1;
                          
                          return (
                            <View
                              key={index}
                              style={{
                                width: ledSize,
                                height: ledSize,
                                marginRight: 2,
                                marginBottom: 2,
                                borderRadius: Math.min(ledSize / 3, 2),
                                backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                                shadowColor: isActive ? `rgb(${color.r}, ${color.g}, ${color.b})` : 'transparent',
                                shadowOpacity: isActive ? Math.min(brightness * 0.8, 0.6) : 0,
                                shadowRadius: Math.min(ledSize / 2, 3),
                                elevation: isActive ? 2 : 0,
                              }}
                            >
                              {/* LED highlight effect for active LEDs */}
                              {isActive && ledSize > 4 && (
                                <View
                                  style={{
                                    position: 'absolute',
                                    top: 0.5,
                                    left: 0.5,
                                    borderRadius: Math.min(ledSize / 4, 1),
                                    height: Math.min(ledSize / 3, 3),
                                    width: Math.min(ledSize / 2, 2),
                                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                  }}
                                />
                              )}
                            </View>
                          );
                        })}
                      </View>
                      <Text style={{
                        fontSize: 12,
                        color: isDark ? '#9ca3af' : '#6b7280',
                        marginTop: 8,
                      }}>
                        {liveLedData.length} LED{liveLedData.length !== 1 ? 's' : ''} live
                      </Text>
                    </View>
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
                ) : (
                  <View style={{
                    backgroundColor: isDark ? '#374151' : '#f9fafb',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                  }}>
                    <Picker
                      selectedValue={selectedEffect}
                      onValueChange={(value) => setSelectedEffect(value)}
                      style={{
                        color: isDark ? '#ffffff' : '#111827',
                      }}
                      dropdownIconColor={isDark ? '#ffffff' : '#111827'}
                    >
                      <Picker.Item
                        label="Select an effect..."
                        value={null}
                        color={isDark ? '#9ca3af' : '#6b7280'}
                      />
                      {effects.map((effect) => (
                        <Picker.Item
                          key={effect.id}
                          label={effect.name}
                          value={effect.id}
                          color={isDark ? '#ffffff' : '#111827'}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Palettes Dropdown */}
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
                  <View style={{
                    backgroundColor: isDark ? '#374151' : '#f9fafb',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                  }}>
                    <Picker
                      selectedValue={selectedPalette}
                      onValueChange={(value) => setSelectedPalette(value)}
                      style={{
                        color: isDark ? '#ffffff' : '#111827',
                      }}
                      dropdownIconColor={isDark ? '#ffffff' : '#111827'}
                    >
                      <Picker.Item
                        label="Select a palette..."
                        value={null}
                        color={isDark ? '#9ca3af' : '#6b7280'}
                      />
                      {palettes.map((palette) => (
                        <Picker.Item
                          key={palette.id}
                          label={palette.name}
                          value={palette.id}
                          color={isDark ? '#ffffff' : '#111827'}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

            </>
          )}
        </ScrollView>
        
        {/* Sticky Footer with Action Buttons */}
        {selectedDevices.length > 0 && (
          <View style={stickyFooterStyle}>
            <View style={buttonContainerStyle}>
              <TouchableOpacity
                onPress={testEffect}
                disabled={isTesting || selectedEffect === null || selectedPalette === null}
                style={[
                  footerButtonSecondaryStyle,
                  {
                    backgroundColor: (isTesting || selectedEffect === null || selectedPalette === null) 
                      ? '#9ca3af' : '#10b981',
                    opacity: (isTesting || selectedEffect === null || selectedPalette === null) ? 0.6 : 1
                  }
                ]}
              >
                {isTesting && <ActivityIndicator size="small" color="white" />}
                <Ionicons name="play-outline" size={20} color="white" />
                <Text style={footerButtonTextStyle}>
                  {isTesting ? 'Testing...' : 'Test Effect'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowSaveModal(true)}
                disabled={selectedEffect === null || selectedPalette === null}
                style={[
                  footerButtonPrimaryStyle,
                  {
                    backgroundColor: (selectedEffect === null || selectedPalette === null) 
                      ? '#9ca3af' : '#3b82f6',
                    opacity: (selectedEffect === null || selectedPalette === null) ? 0.6 : 1
                  }
                ]}
              >
                <Ionicons name="save-outline" size={20} color="white" />
                <Text style={footerButtonTextStyle}>Save Preset</Text>
              </TouchableOpacity>
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