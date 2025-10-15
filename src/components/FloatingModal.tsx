import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface FloatingModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  isDark: boolean;
  children: React.ReactNode;
  scrollable?: boolean;
  footer?: React.ReactNode;
}

/**
 * FloatingModal - A bottom sheet modal with pull-to-dismiss gesture
 *
 * Behavior:
 * - Slides up from bottom of screen
 * - Pull down on handle or header to dismiss
 * - Drag down > 150px or velocity > 1000 = dismiss
 * - Otherwise springs back to position
 */
export default function FloatingModal({
  visible,
  onClose,
  title,
  isDark,
  children,
  scrollable = true,
  footer,
}: FloatingModalProps) {
  const translateY = useSharedValue(1000); // Start off-screen
  const backdropOpacity = useSharedValue(0);

  // Theme colors
  const cardBackground = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  // Animate modal in/out when visible changes
  React.useEffect(() => {
    if (visible) {
      // Slide up from bottom
      translateY.value = withSpring(0, { damping: 30, stiffness: 400 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Slide down off-screen
      translateY.value = withTiming(1000, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  // Pan gesture for dragging modal down from header
  const gesture = Gesture.Pan()
    .onChange((event) => {
      // Only allow dragging down (positive translation)
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      // Dismiss if dragged down far enough or fast enough
      if (event.translationY > 150 || event.velocityY > 1000) {
        translateY.value = withTiming(1000, { duration: 200 });
        backdropOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        // Spring back to position
        translateY.value = withSpring(0, { damping: 30, stiffness: 400 });
      }
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Modal Container */}
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.modal, { backgroundColor: cardBackground }, animatedStyle]}>
          {/* Draggable Header */}
          <GestureDetector gesture={gesture}>
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: isDark ? '#4b5563' : '#d1d5db' }]} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: textColor }]}>{title}</Text>
            </View>
          </GestureDetector>

          {/* KeyboardAvoidingView for footer visibility */}
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Content */}
            {scrollable ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.content}>
                {children}
              </View>
            )}

            {/* Footer (if provided) */}
            {footer && (
              <View style={[styles.footer, { borderTopColor: borderColor, backgroundColor: cardBackground }]}>
                {footer}
              </View>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modal: {
    height: '50%',
    marginHorizontal: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  footer: {
    borderTopWidth: 1,
    padding: 12,
  },
});
