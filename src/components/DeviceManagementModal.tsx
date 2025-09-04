import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface DeviceManagementModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export default function DeviceManagementModal({
  isVisible,
  onClose,
  isDark,
}: DeviceManagementModalProps) {
  const backgroundColor = isDark ? '#111827' : '#F9FAFB';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const cardBackgroundColor = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.title, { color: textColor }]}>
            Device Management
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={[styles.placeholderText, { color: textColor }]}>
            Device management UI will be here.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
  },
});
