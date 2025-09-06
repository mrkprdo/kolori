import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FloatingModal from './FloatingModal';
import { SeasonalPreset, WledDevice } from '../types';
import { loadDeviceSeasonalPresets, saveDeviceSeasonalPresets } from '../utils/storage';

interface SeasonalPresetsModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
  seasonalPresets: SeasonalPreset[];
  onUpdateSeasonalPresets: (presets: SeasonalPreset[]) => void;
  activeDevice?: WledDevice | null;
}

const defaultSeasonalPresets: SeasonalPreset[] = [
  { id: '1', name: 'Halloween/Fall', icon: '🍂', presetId: 1 },
  { id: '2', name: 'Canada Day', icon: '🇨🇦', presetId: 2 },
  { id: '3', name: 'Holidays', icon: '🎄', presetId: 3 },
];

export default function SeasonalPresetsModal({
  isVisible,
  onClose,
  isDark,
  seasonalPresets = defaultSeasonalPresets,
  onUpdateSeasonalPresets,
  activeDevice,
}: SeasonalPresetsModalProps) {
  const [editingPresets, setEditingPresets] = useState<SeasonalPreset[]>(seasonalPresets);
  const [isEditing, setIsEditing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Update editingPresets when seasonalPresets prop changes
  useEffect(() => {
    setEditingPresets(seasonalPresets);
  }, [seasonalPresets]);

  const styles = getStyles(isDark);

  const handleSave = async () => {
    // Validate that all preset IDs are unique and valid
    const presetIds = editingPresets.map(p => p.presetId);
    const uniqueIds = new Set(presetIds);
    
    if (presetIds.length !== uniqueIds.size) {
      Alert.alert('Error', 'Preset IDs must be unique');
      return;
    }

    if (presetIds.some(id => id < 1 || id > 250)) {
      Alert.alert('Error', 'Preset IDs must be between 1 and 250');
      return;
    }

    // Save to device-specific storage if device is available
    if (activeDevice) {
      try {
        await saveDeviceSeasonalPresets(activeDevice, editingPresets);
      } catch (error) {
        console.error('Failed to save device-specific seasonal presets:', error);
      }
    }

    onUpdateSeasonalPresets(editingPresets);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingPresets(seasonalPresets);
    setIsEditing(false);
  };

  const updatePreset = (index: number, field: keyof SeasonalPreset, value: string | number) => {
    const updated = [...editingPresets];
    if (field === 'presetId') {
      updated[index] = { ...updated[index], [field]: Number(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditingPresets(updated);
  };

  const addPreset = () => {
    const newId = Math.max(...editingPresets.map(p => Number(p.id))) + 1;
    const newPreset: SeasonalPreset = {
      id: newId.toString(),
      name: 'New Preset',
      icon: '✨',
      presetId: Math.max(...editingPresets.map(p => p.presetId)) + 1,
    };
    setEditingPresets([...editingPresets, newPreset]);
  };

  const removePreset = (index: number) => {
    if (editingPresets.length <= 1) {
      Alert.alert('Error', 'At least one seasonal preset is required');
      return;
    }
    setEditingPresets(editingPresets.filter((_, i) => i !== index));
  };

  const resetToDefault = () => {
    setConfirmText('');
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    if (confirmText.toLowerCase() === 'kolori') {
      setShowResetConfirm(false);
      setConfirmText('');
      setEditingPresets(defaultSeasonalPresets);
      
      // Save to device-specific storage if device is available
      if (activeDevice) {
        try {
          await saveDeviceSeasonalPresets(activeDevice, defaultSeasonalPresets);
        } catch (error) {
          console.error('Failed to save device-specific seasonal presets:', error);
        }
      }
      
      // Call the update function and wait for it to complete
      await onUpdateSeasonalPresets(defaultSeasonalPresets);
      
      setIsEditing(false);
    } else {
      Alert.alert('Reset Cancelled', 'Incorrect confirmation text. Please type "kolori" exactly.');
    }
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
    setConfirmText('');
  };

  return (
    <>
      <FloatingModal
        visible={isVisible}
        isDark={isDark}
        onClose={onClose}
        title="Seasonal Presets"
        scrollable={false}
      >
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.description}>
              Configure which WLED preset IDs to use for seasonal effects.
            </Text>

            {editingPresets.map((preset, index) => (
              <View key={preset.id} style={styles.presetCard}>
                <View style={styles.presetHeader}>
                  <View style={styles.presetInfo}>
                    <Text style={styles.presetIcon}>{preset.icon}</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.nameInput}
                        value={preset.name}
                        onChangeText={(text) => updatePreset(index, 'name', text)}
                        placeholder="Preset name"
                        placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                      />
                    ) : (
                      <Text style={styles.presetName}>{preset.name}</Text>
                    )}
                  </View>
                  {isEditing && (
                    <TouchableOpacity
                      onPress={() => removePreset(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.presetDetails}>
                  <Text style={styles.label}>Icon:</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.iconInput}
                      value={preset.icon}
                      onChangeText={(text) => updatePreset(index, 'icon', text)}
                      placeholder="🎄"
                      maxLength={2}
                    />
                  ) : (
                    <Text style={styles.value}>{preset.icon}</Text>
                  )}
                </View>

                <View style={styles.presetDetails}>
                  <Text style={styles.label}>Preset ID:</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.idInput}
                      value={preset.presetId.toString()}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9]/g, '');
                        if (numericValue === '' || (parseInt(numericValue) >= 1 && parseInt(numericValue) <= 250)) {
                          updatePreset(index, 'presetId', numericValue === '' ? 1 : parseInt(numericValue));
                        }
                      }}
                      placeholder="1"
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  ) : (
                    <Text style={styles.value}>{preset.presetId}</Text>
                  )}
                </View>
              </View>
            ))}

            {isEditing && (
              <TouchableOpacity onPress={addPreset} style={styles.addButton}>
                <Ionicons name="add" size={20} color="#3b82f6" />
                <Text style={styles.addButtonText}>Add Preset</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {!isEditing ? (
              <>
                <TouchableOpacity onPress={resetToDefault} style={styles.resetButton}>
                  <Ionicons name="refresh" size={16} color="#ef4444" />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                  <Ionicons name="pencil" size={16} color="#ffffff" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </FloatingModal>

      {/* Reset Confirmation Modal */}
      <FloatingModal
        visible={showResetConfirm}
        isDark={isDark}
        onClose={handleCancelReset}
        title="Confirm Reset"
        scrollable={false}
      >
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmText}>
            This will reset all seasonal presets to their default values.
          </Text>
          <Text style={styles.confirmWarning}>
            This action cannot be undone.
          </Text>
          <Text style={styles.confirmInstruction}>
            Type "Kolori" to confirm:
          </Text>
          
          <TextInput
            style={styles.confirmInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Enter confirmation text"
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            autoFocus
          />
          
          <View style={styles.confirmButtons}>
            <TouchableOpacity onPress={handleCancelReset} style={styles.confirmCancelButton}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleConfirmReset} 
              style={[
                styles.confirmResetButton,
                { opacity: confirmText.toLowerCase() === 'kolori' ? 1 : 0.5 }
              ]}
            >
              <Text style={styles.confirmResetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </FloatingModal>
    </>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  description: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  presetCard: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  presetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presetIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  presetName: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  nameInput: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#d1d5db',
    paddingBottom: 4,
  },
  removeButton: {
    padding: 4,
  },
  presetDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  iconInput: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#d1d5db',
    minWidth: 40,
    paddingBottom: 2,
  },
  idInput: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#374151' : '#d1d5db',
    minWidth: 60,
    paddingBottom: 4,
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  addButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#e5e7eb',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'transparent',
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  resetButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
    gap: 6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmContainer: {
    padding: 20,
    gap: 16,
  },
  confirmText: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  confirmWarning: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  confirmInstruction: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  confirmInput: {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: isDark ? '#374151' : '#d1d5db',
    borderRadius: 8,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 8,
  },
  confirmCancelText: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmResetButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  confirmResetText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});