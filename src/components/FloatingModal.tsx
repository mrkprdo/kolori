import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface FloatingModalProps {
  visible: boolean;
  isDark?: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: number;
}

const FloatingModal: React.FC<FloatingModalProps> = ({
  visible,
  isDark = false,
  onClose,
  title,
  children,
  scrollable = true,
  maxHeight,
}) => {
  const backgroundColor = isDark ? '#111827' : '#f9fafb';
  const modalBackground = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  const containerStyle = {
    flex: 1,
    backgroundColor,
  };

  const modalStyle = {
    backgroundColor: modalBackground,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 50,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    ...(maxHeight ? { maxHeight } : {}),
  };

  const headerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
  };

  const content = scrollable ? (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 0 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: 0 }}>
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={containerStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={modalStyle}>
            {/* Header */}
            <View style={headerStyle}>
              <Text style={[styles.title, { color: textColor }]}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={subtextColor} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {content}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FloatingModal;