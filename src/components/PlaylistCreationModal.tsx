import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { CustomEffect, SavedPlaylist, Device } from '../types';
import { createWledPlaylist } from '../config/wledApi';
import FloatingModal from './FloatingModal';

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
              borderWidth: 1,
              borderColor: isDark ? '#4b5563' : '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: isDark ? '#ffffff' : '#111827',
              marginBottom: 20,
            }}
            autoFocus
          />
          
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
              disabled={!playlistName.trim() || isLoading}
              style={{
                flex: 1,
                backgroundColor: (!playlistName.trim() || isLoading) ? '#9ca3af' : '#3b82f6',
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
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

  const containerStyle = {
    flex: 1,
  };

  const contentContainerStyle = {
    paddingHorizontal: 12,
    paddingVertical: 8,
  };

  const sectionStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.25 : 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
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
    backgroundColor: isDark ? '#374151' : '#ffffff', 
    gap: 6,
    borderWidth: 1,
    borderColor: isDark ? '#4b5563' : '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.25 : 0.05,
    shadowRadius: 2,
    elevation: 1,
  };

  const footerButtonTextStyle = {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'white',
  };

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

    if (!device.ip) {
      Alert.alert('Error', 'No WLED device connected. Please connect to a device first.');
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

      // Save playlist to WLED device
      const result = await createWledPlaylist(
        device.ip,
        wledPlaylistItems,
        playlistName,
        device.protocol || 'http'
      );

      if (!result.success) {
        throw new Error(result.message || 'Failed to save playlist to WLED device');
      }

      // Create local playlist data for storage
      const playlistData: SavedPlaylist = {
        id: result.presetId || Date.now(),
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
      };

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
      console.error('Failed to save playlist:', error);
      Alert.alert('Error', `Failed to save playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    setPlaylistItems([{ id: '1', presetId: null }]);
    onClose();
  };

  return (
    <>
    <FloatingModal
      visible={visible}
      isDark={isDark}
      onClose={handleClose}
      title="Create Playlist"
      scrollable={false}
    >
      <View style={containerStyle}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={contentContainerStyle}>
          <View style={sectionStyle}>
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
                  borderWidth: 1,
                  borderColor: isDark ? '#4b5563' : '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.15 : 0.03,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                  {/* Dropdown */}
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{
                      backgroundColor: isDark ? '#4b5563' : '#ffffff',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: isDark ? '#6b7280' : '#d1d5db',
                    }}>
                      <Picker
                        selectedValue={item.presetId}
                        onValueChange={(value) => {
                          if (value !== null) {
                            updatePlaylistItem(item.id, value as number);
                          }
                        }}
                        style={{
                          color: isDark ? '#ffffff' : '#111827',
                          backgroundColor: 'transparent',
                        }}
                        dropdownIconColor={isDark ? '#9ca3af' : '#6b7280'}
                      >
                        <Picker.Item 
                          label="Select preset..." 
                          value={null}
                          color={isDark ? '#9ca3af' : '#6b7280'}
                        />
                        {customEffects.map((effect) => (
                          <Picker.Item
                            key={effect.id}
                            label={effect.name}
                            value={effect.presetId || effect.id}
                            color={isDark ? '#ffffff' : '#111827'}
                          />
                        ))}
                      </Picker>
                    </View>
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
        </ScrollView>
        
        {/* Sticky Footer with Action Buttons */}
        <View style={stickyFooterStyle}>
          <View style={buttonContainerStyle}>
            <TouchableOpacity
              onPress={handleClose}
              style={footerButtonSecondaryStyle}
            >
              <Ionicons name="close-outline" size={20} color={isDark ? '#FFF' : '#6B7280'} />
              <Text style={[footerButtonTextStyle, { color: isDark ? '#FFF' : '#6B7280' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowSaveModal(true)}
              disabled={playlistItems.filter(item => item.presetId !== null).length === 0}
              style={[
                footerButtonPrimaryStyle,
                {
                  backgroundColor: playlistItems.filter(item => item.presetId !== null).length === 0 ? '#9ca3af' : '#3b82f6',
                  opacity: playlistItems.filter(item => item.presetId !== null).length === 0 ? 0.6 : 1
                }
              ]}
            >
              <Ionicons name="save-outline" size={20} color="white" />
              <Text style={footerButtonTextStyle}>Save Playlist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </FloatingModal>

      {/* Save Playlist Modal */}
      <SavePlaylistModal
        visible={showSaveModal}
        isDark={isDark}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSavePlaylist}
        isLoading={isSaving}
      />
    </>
  );
}