// PlaylistModal Component for React Native
// Migrated from kolori_old/src/components/PlaylistModal.jsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomEffect, PlaylistItem, SavedPlaylist } from '../types';
import { logger } from '../utils/logger';

interface PlaylistModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
  customEffects: CustomEffect[];
  savedPlaylists: SavedPlaylist[];
  onSavePlaylist: (playlist: SavedPlaylist) => void;
  onEditPlaylist: (playlist: SavedPlaylist) => void;
  onDeletePlaylist: (playlistId: number) => void;
  onPlayPlaylist: (playlistId: number) => void;
  editingPlaylist?: SavedPlaylist | null;
}

interface PlaylistItemWithDuration extends PlaylistItem {
  tempId: string;
}

export default function PlaylistModal({
  isVisible,
  onClose,
  isDark,
  customEffects,
  savedPlaylists,
  onSavePlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
  editingPlaylist,
}: PlaylistModalProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [playlistName, setPlaylistName] = useState('');
  const [playlistItems, setPlaylistItems] = useState<PlaylistItemWithDuration[]>([]);
  const [currentEditingId, setCurrentEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (editingPlaylist && mode === 'edit') {
      setPlaylistName(editingPlaylist.name);
      setPlaylistItems(
        editingPlaylist.items.map((item, index) => ({
          ...item,
          tempId: `${item.presetId}_${index}`,
        }))
      );
      setCurrentEditingId(editingPlaylist.id);
    } else if (mode === 'create') {
      setPlaylistName('');
      setPlaylistItems([]);
      setCurrentEditingId(null);
    }
  }, [editingPlaylist, mode]);

  const handleAddEffect = (effect: CustomEffect) => {
    const newItem: PlaylistItemWithDuration = {
      name: effect.name,
      presetId: effect.id,
      duration: 30, // Default 30 seconds
      gradient: effect.gradient || '#6366f1',
      tempId: `${effect.id}_${Date.now()}`,
    };
    setPlaylistItems([...playlistItems, newItem]);
  };

  const handleRemoveItem = (tempId: string) => {
    setPlaylistItems(playlistItems.filter(item => item.tempId !== tempId));
  };

  const handleUpdateDuration = (tempId: string, duration: number) => {
    setPlaylistItems(playlistItems.map(item => 
      item.tempId === tempId ? { ...item, duration } : item
    ));
  };

  const handleSavePlaylist = () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    if (playlistItems.length === 0) {
      Alert.alert('Error', 'Please add at least one effect to the playlist');
      return;
    }

    const playlistData: SavedPlaylist = {
      id: currentEditingId || Date.now(),
      name: playlistName.trim(),
      items: playlistItems.map(({ tempId, ...item }) => item),
      isActive: false,
    };

    if (currentEditingId) {
      onEditPlaylist(playlistData);
    } else {
      onSavePlaylist(playlistData);
    }

    setMode('list');
    logger.log(`${currentEditingId ? 'Updated' : 'Created'} playlist: ${playlistData.name}`);
  };

  const handleDeletePlaylist = (playlistId: number) => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDeletePlaylist(playlistId);
            logger.log(`Deleted playlist: ${playlistId}`);
          }
        },
      ]
    );
  };

  const renderPlaylistList = () => (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4">
        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Playlists
        </Text>
        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={() => setMode('create')}
            className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center space-x-2"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white font-medium">New</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Playlists */}
      <ScrollView className="flex-1 px-4 pb-4">
        {savedPlaylists.length > 0 ? (
          <View className="space-y-3">
            {savedPlaylists.map((playlist) => (
              <View
                key={playlist.id}
                className={`p-4 rounded-xl border ${
                  isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {playlist.name}
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {playlist.items.length} effect{playlist.items.length !== 1 ? 's' : ''} • {
                        playlist.items.reduce((total, item) => total + item.duration, 0)
                      }s total
                    </Text>
                  </View>
                  
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => onPlayPlaylist(playlist.id)}
                      className="bg-green-500 p-2 rounded-lg"
                    >
                      <Ionicons name="play" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setMode('edit');
                        setCurrentEditingId(playlist.id);
                        setPlaylistName(playlist.name);
                        setPlaylistItems(
                          playlist.items.map((item, index) => ({
                            ...item,
                            tempId: `${item.presetId}_${index}`,
                          }))
                        );
                      }}
                      className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      <Ionicons name="pencil" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeletePlaylist(playlist.id)}
                      className="bg-red-500 p-2 rounded-lg"
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preview items */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row space-x-2">
                    {playlist.items.slice(0, 5).map((item, index) => (
                      <View
                        key={index}
                        className="px-3 py-1 rounded-full border"
                        style={{ 
                          backgroundColor: item.gradient || '#6366f1',
                          borderColor: 'rgba(255,255,255,0.2)'
                        }}
                      >
                        <Text className="text-white text-xs font-medium">
                          {item.name}
                        </Text>
                      </View>
                    ))}
                    {playlist.items.length > 5 && (
                      <View className={`px-3 py-1 rounded-full border ${
                        isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'
                      }`}>
                        <Text className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          +{playlist.items.length - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons 
              name="play-circle-outline" 
              size={64} 
              color={isDark ? '#4B5563' : '#9CA3AF'} 
              style={{ opacity: 0.5 }}
            />
            <Text className={`text-lg font-medium mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No playlists yet
            </Text>
            <Text className={`text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Create your first playlist to sequence multiple effects
            </Text>
            <TouchableOpacity
              onPress={() => setMode('create')}
              className="bg-blue-500 px-6 py-3 rounded-lg mt-6"
            >
              <Text className="text-white font-semibold">Create Playlist</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderPlaylistEditor = () => (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4">
        <TouchableOpacity onPress={() => setMode('list')} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {mode === 'edit' ? 'Edit Playlist' : 'New Playlist'}
        </Text>
        <TouchableOpacity onPress={handleSavePlaylist} className="bg-blue-500 px-4 py-2 rounded-lg">
          <Text className="text-white font-medium">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Playlist Name */}
        <View className="mb-6">
          <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Playlist Name
          </Text>
          <TextInput
            value={playlistName}
            onChangeText={setPlaylistName}
            placeholder="Enter playlist name..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            className={`p-4 rounded-xl border ${
              isDark 
                ? 'border-gray-600 bg-gray-800 text-white' 
                : 'border-gray-200 bg-white text-gray-900'
            }`}
          />
        </View>

        {/* Current Items */}
        {playlistItems.length > 0 && (
          <View className="mb-6">
            <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Playlist Items ({playlistItems.length})
            </Text>
            <View className="space-y-3">
              {playlistItems.map((item, index) => (
                <View
                  key={item.tempId}
                  className={`p-4 rounded-xl border flex-row items-center ${
                    isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Order indicator */}
                  <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <Text className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {index + 1}
                    </Text>
                  </View>

                  {/* Effect info */}
                  <View className="flex-1">
                    <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.name}
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Duration: {item.duration}s
                    </Text>
                  </View>

                  {/* Duration controls */}
                  <View className="flex-row items-center space-x-2 mr-3">
                    <TouchableOpacity
                      onPress={() => handleUpdateDuration(item.tempId, Math.max(5, item.duration - 5))}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <Ionicons name="remove" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleUpdateDuration(item.tempId, item.duration + 5)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <Ionicons name="add" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                  </View>

                  {/* Remove button */}
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.tempId)}
                    className="w-8 h-8 rounded-full items-center justify-center bg-red-500"
                  >
                    <Ionicons name="trash" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            {/* Total duration */}
            <Text className={`text-sm mt-3 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Total Duration: {playlistItems.reduce((total, item) => total + item.duration, 0)}s
            </Text>
          </View>
        )}

        {/* Available Effects */}
        <View className="mb-6">
          <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Available Effects
          </Text>
          
          {customEffects.length > 0 ? (
            <View className="space-y-2">
              {customEffects.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  onPress={() => handleAddEffect(effect)}
                  disabled={playlistItems.some(item => item.presetId === effect.id)}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    playlistItems.some(item => item.presetId === effect.id)
                      ? isDark 
                        ? 'border-gray-700 bg-gray-800/50 opacity-50' 
                        : 'border-gray-300 bg-gray-100/50 opacity-50'
                      : isDark 
                        ? 'border-gray-600 bg-gray-800' 
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center space-x-3">
                    <View
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: effect.gradient || '#6366f1' }}
                    />
                    <View>
                      <Text className={`font-medium ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {effect.name}
                      </Text>
                      <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {effect.effectName}
                      </Text>
                    </View>
                  </View>
                  
                  {!playlistItems.some(item => item.presetId === effect.id) && (
                    <Ionicons name="add-circle" size={24} color="#3B82F6" />
                  )}
                  
                  {playlistItems.some(item => item.presetId === effect.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className={`p-6 rounded-xl border-2 border-dashed ${
              isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
            }`}>
              <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No custom effects available
              </Text>
              <Text className={`text-sm text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Create some custom effects first to build playlists
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {mode === 'list' ? renderPlaylistList() : renderPlaylistEditor()}
      </SafeAreaView>
    </Modal>
  );
}