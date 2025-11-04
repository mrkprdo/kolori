import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PresetOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  presetName: string;
  isBootPreset: boolean;
  showDelete?: boolean;
  onEnableAtBoot: () => void;
  onDelete: () => void;
}

export default function PresetOptionsModal({
  visible,
  onClose,
  isDark,
  presetName,
  isBootPreset,
  showDelete = true,
  onEnableAtBoot,
  onDelete,
}: PresetOptionsModalProps) {
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const backgroundColor = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#4b5563' : '#1e293b';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.dropdownModal, { backgroundColor, borderColor }]}>
            {/* Title */}
            <Text style={[styles.dropdownTitle, { color: textColor }]} numberOfLines={1}>
              {presetName}
            </Text>

            {/* Enable at Boot Option */}
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                onEnableAtBoot();
                onClose();
              }}
            >
              <Ionicons
                name={isBootPreset ? "checkmark-circle" : "power"}
                size={24}
                color={isBootPreset ? "#10b981" : "#3b82f6"}
              />
              <View style={styles.optionInfo}>
                <Text style={[styles.optionTitle, { color: textColor }]}>
                  {isBootPreset ? "Enabled at Boot" : "Enable at Boot"}
                </Text>
                <Text style={[styles.optionDescription, { color: subtextColor }]}>
                  {isBootPreset
                    ? "Loads on device power-on"
                    : "Activate when device powers on"
                  }
                </Text>
              </View>
              {isBootPreset && (
                <Ionicons name="checkmark" size={20} color="#10b981" />
              )}
            </TouchableOpacity>

            {/* Delete Preset Option */}
            {showDelete && (
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionTitle, { color: '#ef4444' }]}>
                    Delete Preset
                  </Text>
                  <Text style={[styles.optionDescription, { color: subtextColor }]}>
                    Remove from WLED device
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    minWidth: 320,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1001,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 64,
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
