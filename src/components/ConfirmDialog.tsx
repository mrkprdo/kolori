import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  isDark: boolean;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/**
 * ConfirmDialog - A centered dialog modal with proper keyboard handling
 */
export default function ConfirmDialog({
  visible,
  onClose,
  title,
  isDark,
  children,
  footer,
}: ConfirmDialogProps) {
  const cardBackground = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.dialog, { backgroundColor: cardBackground, borderColor }]}>
          {/* Title */}
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {footer}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  content: {
    marginBottom: 24,
  },
  footer: {
    // Footer content styled by parent
  },
});
