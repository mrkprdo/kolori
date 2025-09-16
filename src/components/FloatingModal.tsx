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
  TouchableWithoutFeedback,
  Keyboard,
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
  const styles = React.useMemo(() => {
    const backgroundColor = isDark ? '#111827' : '#f9fafb';
    const modalBackground = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111827';
    const subtextColor = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#374151' : '#e5e7eb';

    return {
      container: {
        flex: 1,
        backgroundColor,
      },
      modal: {
        backgroundColor: modalBackground,
        borderRadius: 16,
        marginHorizontal: 12,
        marginTop: 50,
        marginBottom: 20,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        ...(maxHeight ? { maxHeight } : {}),
      },
      header: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
      },
      titleText: {
        color: textColor,
      },
      closeIcon: {
        color: subtextColor,
      },
    };
  }, [isDark, maxHeight]);

  const content = React.useMemo(() => {
    return scrollable ? (
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
  }, [scrollable, children]);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                      <Text style={[staticStyles.title, styles.titleText]}>
                        {title}
                      </Text>
                      <TouchableOpacity onPress={handleClose}>
                        <Ionicons name="close" size={24} color={styles.closeIcon.color} />
                      </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {content}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const staticStyles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FloatingModal;