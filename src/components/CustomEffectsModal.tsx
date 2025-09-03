import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

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
      animationType="fade"
      transparent
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 400,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
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
              borderColor: isDark ? '#4b5563' : '#d1d5db',
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: isDark ? '#ffffff' : '#111827',
              marginBottom: 4,
            }}
          />
          
          <Text style={{
            fontSize: 12,
            color: isDark ? '#9ca3af' : '#6b7280',
            marginBottom: 24,
            textAlign: 'right',
          }}>
            {presetName.length}/50
          </Text>
          
          <View style={{
            flexDirection: 'row',
            gap: 12,
          }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                paddingVertical: 12,
                paddingHorizontal: 16,
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
              disabled={isLoading || !presetName.trim()}
              style={{
                flex: 1,
                backgroundColor: (!presetName.trim() || isLoading) ? '#9ca3af' : '#3b82f6',
                paddingVertical: 12,
                paddingHorizontal: 16,
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
  const [liveViewEnabled, setLiveViewEnabled] = useState(false);
  const [liveLedData, setLiveLedData] = useState<any[]>([]);

  const containerStyle = {
    flex: 1,
    backgroundColor: isDark ? '#111827' : '#f9fafb',
  };

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
      
      // First, apply the effect to create the preset state
      await fetch(`http://${device.ip}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seg: [{
            fx: selectedEffect,
            pal: selectedPalette,
          }],
        }),
      });

      // Then save it as a preset with the given name
      const saveResponse = await fetch(`http://${device.ip}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          psave: -1, // Save to next available slot
          n: presetName, // Preset name
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(`HTTP ${saveResponse.status}: ${saveResponse.statusText}`);
      }

      setShowSaveModal(false);
      Alert.alert('Preset Saved', `"${presetName}" has been saved to your WLED device!`);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={containerStyle}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#e5e7eb',
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}>
          <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
            <Ionicons 
              name="close" 
              size={24} 
              color={isDark ? '#ffffff' : '#111827'} 
            />
          </TouchableOpacity>
          <Text style={{
            flex: 1,
            fontSize: 20,
            fontWeight: 'bold',
            textAlign: 'center',
            color: isDark ? '#ffffff' : '#111827',
          }}>
            Add Custom Effects
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
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

              {/* Action Buttons */}
              <View style={sectionStyle}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? '#ffffff' : '#111827',
                  marginBottom: 16,
                }}>
                  Actions
                </Text>
                
                <TouchableOpacity
                  onPress={testEffect}
                  disabled={isTesting || selectedEffect === null || selectedPalette === null}
                  style={{
                    backgroundColor: (isTesting || selectedEffect === null || selectedPalette === null) 
                      ? '#9ca3af' : '#10b981',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {isTesting && <ActivityIndicator size="small" color="white" />}
                  <Ionicons 
                    name="play-outline" 
                    size={20} 
                    color="white" 
                  />
                  <Text style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                    {isTesting ? 'Testing...' : 'Test Effect'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setShowSaveModal(true)}
                  disabled={selectedEffect === null || selectedPalette === null}
                  style={{
                    backgroundColor: (selectedEffect === null || selectedPalette === null) 
                      ? '#9ca3af' : '#3b82f6',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons 
                    name="save-outline" 
                    size={20} 
                    color="white" 
                  />
                  <Text style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                    Save Preset
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Save Preset Modal */}
      <SavePresetModal
        visible={showSaveModal}
        isDark={isDark}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSavePreset}
        isLoading={isSaving}
      />
    </Modal>
  );
}