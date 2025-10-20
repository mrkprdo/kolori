import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomEffect, SavedPlaylist, Device } from '../types';
import { generatePlaylistGradient, createWledPlaylist } from '../config/wledApi';
import FloatingModal from './FloatingModal';
import CustomDropdown from './CustomDropdown';

interface PlaylistItem {
  id: string;
  presetId: number | null;
}

interface PlaylistCreationModalProps {
  visible: boolean;
  isDark?: boolean;
  onClose: () => void;
  customEffects: CustomEffect[];
  onSavePlaylist: (playlist: SavedPlaylist) => void;
  onRefreshPresets?: () => Promise<void>;
  device: Device;
  savedPlaylists?: SavedPlaylist[];
}

interface SavePlaylistModalProps {
  visible: boolean;
  isDark?: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading?: boolean;
}

const SavePlaylistModal: React.FC<SavePlaylistModalProps> = ({
  visible,
  isDark = false,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [playlistName, setPlaylistName] = useState('');

  const handleSave = () => {
    if (playlistName.trim()) {
      onSave(playlistName.trim());
      setPlaylistName('');
    }
  };

  const handleClose = () => {
    setPlaylistName('');
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
            Save Playlist
          </Text>

          <TextInput
            value={playlistName}
            onChangeText={setPlaylistName}
            placeholder="Enter playlist name..."
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
              marginBottom: 8,
            }}
            autoFocus
          />

          <Text style={{
            fontSize: 12,
            color: isDark ? '#9ca3af' : '#6b7280',
            textAlign: 'right',
            marginBottom: 20,
          }}>
            {playlistName.length}/50
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
              disabled={!playlistName.trim() || isLoading}
              style={{
                flex: 1,
                backgroundColor: (!playlistName.trim() || isLoading) ? '#9ca3af' : '#3b82f6',
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

export default function PlaylistCreationModal({
  visible,
  isDark = false,
  onClose,
  customEffects,
  onSavePlaylist,
  onRefreshPresets,
  device,
  savedPlaylists = [],
}: PlaylistCreationModalProps) {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([
    { id: '1', presetId: null }
  ]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Clear form when modal opens - memoized to prevent unnecessary re-renders
  React.useEffect(() => {
    if (visible) {
      setPlaylistItems([{ id: '1', presetId: null }]);
      setShowSaveModal(false);
      setIsSaving(false);
    }
  }, [visible]);

  const styles = React.useMemo(() => ({
    section: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 3,
      elevation: 2,
      borderWidth: 2,
      borderColor: isDark ? '#4b5563' : '#1e293b',
      marginBottom: 6,
    },
    buttonContainer: {
      paddingTop: 4,
      flexDirection: 'row' as const,
      gap: 8,
    },
    footerButtonPrimary: {
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
    },
    footerButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: 'white',
    },
  }), [isDark]);

  const addNewPlaylistItem = () => {
    const newId = (playlistItems.length + 1).toString();
    setPlaylistItems([...playlistItems, { id: newId, presetId: null }]);
  };

  const removePlaylistItem = (id: string) => {
    if (playlistItems.length > 1) {
      setPlaylistItems(playlistItems.filter(item => item.id !== id));
    }
  };

  const updatePlaylistItem = (id: string, presetId: number) => {
    setPlaylistItems(playlistItems.map(item => 
      item.id === id ? { ...item, presetId } : item
    ));
  };

  const handleSavePlaylist = async (playlistName: string) => {
    const validItems = playlistItems.filter(item => item.presetId !== null);
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please select at least one preset for the playlist');
      return;
    }

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
      // First, fetch current playlists to check for name conflicts
      console.log('🔍 Checking for existing playlists with name:', playlistName);
      
      // Check local playlists first (from savedPlaylists passed via KoloriApp)
      // We'll need to get this from props or context - for now let's refresh from device
      if (onRefreshPresets) {
        try {
          await onRefreshPresets();
        } catch (error) {
          console.warn('Could not fetch latest playlists for validation:', error);
        }
      }

      // Check if name exists in customEffects (presets from WLED device)
      const existingPreset = customEffects.find(effect => 
        effect.name.toLowerCase() === playlistName.toLowerCase()
      );

      // Check if name exists in savedPlaylists (local and device playlists)
      const existingPlaylist = savedPlaylists.find(playlist => 
        playlist.name.toLowerCase() === playlistName.toLowerCase()
      );

      if (existingPreset || existingPlaylist) {
        const itemType = existingPlaylist ? 'playlist' : 'preset';
        Alert.alert(
          'Name Already Exists', 
          `A ${itemType} with the name "${playlistName}" already exists. Please choose a different name.`,
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      console.log('✅ Playlist name is unique, proceeding with save...');
      // Create playlist items for WLED
      const wledPlaylistItems = validItems.map(item => ({
        presetId: item.presetId!,
        duration: 30 // Default 30 seconds
      }));

      // Save playlist to WLED device with enhanced error handling
      console.log('🔄 Attempting to save playlist to WLED device:', {
        deviceIp: device.ip,
        protocol: device.protocol || 'http',
        playlistName,
        itemCount: wledPlaylistItems.length
      });

      const result = await createWledPlaylist(
        device.ip,
        wledPlaylistItems,
        playlistName,
        device.protocol || 'http'
      );

      console.log('📡 WLED API Response:', result);

      if (!result.success) {
        const errorMessage = result.message || 'Failed to save playlist to WLED device';
        console.error('❌ Playlist save failed:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!result.presetId) {
        console.warn('⚠️ Playlist saved but no preset ID returned');
      }

      

      const playlistGradientData = generatePlaylistGradient(playlistName, validItems.length);

      // Create local playlist data for storage
      // IMPORTANT: For playlists to be activatable on WLED device, we must use the presetId from WLED
      // If no presetId is returned, this means the playlist creation failed on the device
      if (!result.presetId) {
        throw new Error('WLED device did not return a preset ID for the playlist. Playlist may not have been saved properly.');
      }

      const playlistId = result.presetId;
      console.log('💾 Creating local playlist data with WLED preset ID:', playlistId);

      const playlistData: SavedPlaylist = {
        id: playlistId,
        presetId: playlistId, // Store the WLED preset ID for activation
        name: playlistName,
        items: validItems.map((item, index) => {
          const effect = customEffects.find(e => (e.presetId || e.id) === item.presetId);
          return {
            name: effect?.name || `Effect ${index + 1}`,
            presetId: item.presetId!,
            duration: 30, // Default 30 seconds
            gradient: effect?.gradient || '#6366f1',
            playlistItemId: `${item.presetId}_${index}`,
          };
        }),
        isActive: false,
        gradient: playlistGradientData.gradient,
      };

      console.log('✅ Calling onSavePlaylist with data:', playlistData);
      onSavePlaylist(playlistData);
      
      // Refresh presets if callback is provided
      if (onRefreshPresets) {
        try {
          await onRefreshPresets();
        } catch (error) {
          console.error('Failed to refresh presets:', error);
        }
      }

      setShowSaveModal(false);
      Alert.alert('Success', `Playlist "${playlistName}" has been saved to WLED device!`, [
        {
          text: 'OK',
          onPress: () => {
            // Reset form and close modal
            setPlaylistItems([{ id: '1', presetId: null }]);
            onClose();
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Playlist save error - Full details:', {
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
      Alert.alert('Playlist Save Failed', `Could not save playlist to WLED device:\n\n${errorMessage}\n\nPlease check:\n• Device is connected\n• Device is responding\n• Network connection is stable`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    // Refresh presets when modal is closed to pick up any changes
    if (onRefreshPresets) {
      try {
        await onRefreshPresets();
      } catch (error) {
        console.error('Failed to refresh presets on modal close:', error);
      }
    }

    // Clear all form data and reset state
    setPlaylistItems([{ id: '1', presetId: null }]);
    setShowSaveModal(false);
    setIsSaving(false);
    onClose();
  };

  const footerContent = (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        onPress={() => {
          if (Platform.OS === 'ios') {
            Alert.prompt(
              'Save Playlist',
              'Enter playlist name:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: (text) => {
                    if (text && text.trim()) {
                      handleSavePlaylist(text.trim());
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
        disabled={
          playlistItems.filter(item => item.presetId !== null).length === 0 ||
          customEffects.length === 0
        }
        style={[
          styles.footerButtonPrimary,
          {
            backgroundColor: (
              playlistItems.filter(item => item.presetId !== null).length === 0 ||
              customEffects.length === 0
            ) ? '#9ca3af' : '#3b82f6',
            opacity: (
              playlistItems.filter(item => item.presetId !== null).length === 0 ||
              customEffects.length === 0
            ) ? 0.6 : 1
          }
        ]}
      >
        <Ionicons name="save-outline" size={20} color="white" />
        <Text style={styles.footerButtonText}>Save Playlist</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <FloatingModal
      visible={visible}
      isDark={isDark}
      onClose={handleClose}
      title="Create Playlist"
      scrollable={true}
      footer={footerContent}
    >
      <View style={styles.section}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDark ? '#e5e7eb' : '#374151',
                marginBottom: 16,
              }}>
                Playlist Effects
              </Text>
              
              {playlistItems.map((item, index) => (
                <View key={item.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 2,
                  borderColor: isDark ? '#4b5563' : '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.15 : 0.03,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                  {/* Dropdown */}
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <CustomDropdown
                      data={customEffects.map(effect => ({
                        id: effect.id,
                        label: effect.name,
                        value: effect.presetId || effect.id,
                      }))}
                      selectedValue={item.presetId}
                      onValueChange={(value) => {
                        if (value !== null) {
                          updatePlaylistItem(item.id, value as number);
                        }
                      }}
                      placeholder="Select preset..."
                      isDark={isDark}
                      searchable={true}
                      containerStyle={{
                        minHeight: 44,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                      }}
                    />
                  </View>

                  {/* Remove button (only show for items beyond the first) */}
                  {index > 0 && (
                    <TouchableOpacity
                      onPress={() => removePlaylistItem(item.id)}
                      style={{
                        backgroundColor: '#ef4444',
                        borderRadius: 6,
                        padding: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Add Effect Button */}
              <TouchableOpacity
                onPress={addNewPlaylistItem}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: isDark ? '#374151' : '#d1d5db',
                  borderRadius: 10,
                  paddingVertical: 16,
                  marginTop: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.1 : 0.02,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Ionicons name="add" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: isDark ? '#9ca3af' : '#6b7280',
                  marginLeft: 8,
                }}>
                  Add Effect
                </Text>
              </TouchableOpacity>
      </View>
    </FloatingModal>

      {/* Save Playlist Modal - Only for non-iOS platforms */}
      {Platform.OS !== 'ios' && (
        <SavePlaylistModal
          visible={showSaveModal}
          isDark={isDark}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSavePlaylist}
          isLoading={isSaving}
        />
      )}
    </>
  );
}