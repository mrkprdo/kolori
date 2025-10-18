import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_VERSION } from '../constants/version';

// Color palette for animated letters
const COLOR_PALETTE = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

// Helper function to get a random color different from the current one
const getRandomColor = (currentColor: string) => {
  const availableColors = COLOR_PALETTE.filter(c => c !== currentColor);
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

interface AboutModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const AboutModal: React.FC<AboutModalProps> = ({ isVisible, onClose, isDark }) => {
  // State for each letter's color
  const [letterColors, setLetterColors] = useState(() => ({
    K: COLOR_PALETTE[0],
    o1: COLOR_PALETTE[1],
    l: COLOR_PALETTE[2],
    o2: COLOR_PALETTE[3],
    r: COLOR_PALETTE[4],
    i: COLOR_PALETTE[5],
  }));

  // Color changing animation for each letter
  useEffect(() => {
    if (!isVisible) return; // Only animate when modal is visible

    const letters = ['K', 'o1', 'l', 'o2', 'r', 'i'] as const;

    // Change a random letter's color every 800ms
    const colorInterval = setInterval(() => {
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      setLetterColors(prev => ({
        ...prev,
        [randomLetter]: getRandomColor(prev[randomLetter]),
      }));
    }, 800);

    return () => clearInterval(colorInterval);
  }, [isVisible]);

  const openGitHub = () => {
    Linking.openURL('https://github.com/mrkprdo/kolori');
  };

  const openProfile = () => {
    Linking.openURL('https://github.com/mrkprdo');
  };

  const styles = useMemo(() => StyleSheet.create({
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
      maxWidth: 500,
      maxHeight: '80%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      overflow: 'hidden',
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#111827',
      flex: 1,
    },
    closeButton: {
      padding: 4,
      marginLeft: 8,
    },
    scrollView: {
      maxHeight: '100%',
    },
    content: {
      padding: 20,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    appIcon: {
      width: 64,
      height: 64,
      borderRadius: 14,
      marginRight: 12,
    },
    textStack: {
      flexDirection: 'column',
      justifyContent: 'center',
    },
    version: {
      fontSize: 13,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 4,
      fontWeight: '500',
    },
    descriptionSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    appNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    wledSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    appNameLetter: {
      fontSize: 42,
      fontWeight: 'bold',
    },
    plusText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      marginVertical: 8,
    },
    wledLogo: {
      width: 140,
      height: 105,
      borderRadius: 12,
    },
    descriptionText: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#4B5563',
      textAlign: 'center',
      lineHeight: 20,
    },
    developerSection: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      marginBottom: 20,
      alignItems: 'center',
    },
    developerText: {
      fontSize: 14,
      marginBottom: 8,
      color: isDark ? '#FFF' : '#111827',
      textAlign: 'center',
    },
    developerLink: {
      fontWeight: 'bold',
      color: isDark ? '#60A5FA' : '#2563EB',
      textAlign: 'center',
    },
    githubButton: {
      width: '100%',
      backgroundColor: '#111827',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    githubButtonText: {
      color: '#FFF',
      fontWeight: 'bold',
    },
    openSourceText: {
      textAlign: 'center',
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
  }), [isDark]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>About Kolori</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={isDark ? '#ffffff' : '#111827'} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
              {/* Logo and branding */}
              <View style={styles.logoSection}>
                {/* Icon + (Kolori + Version stacked) */}
                <View style={styles.appNameContainer}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.appIcon}
                    resizeMode="cover"
                  />
                  <View style={styles.textStack}>
                    <Text>
                      <Text style={[styles.appNameLetter, { color: letterColors.K }]}>K</Text>
                      <Text style={[styles.appNameLetter, { color: letterColors.o1 }]}>o</Text>
                      <Text style={[styles.appNameLetter, { color: letterColors.l }]}>l</Text>
                      <Text style={[styles.appNameLetter, { color: letterColors.o2 }]}>o</Text>
                      <Text style={[styles.appNameLetter, { color: letterColors.r }]}>r</Text>
                      <Text style={[styles.appNameLetter, { color: letterColors.i }]}>i</Text>
                    </Text>
                    <Text style={styles.version}>v{APP_VERSION}</Text>
                  </View>
                </View>

                {/* Plus */}
                <Text style={styles.plusText}>+</Text>

                {/* WLED */}
                <View style={styles.wledSection}>
                  <Image
                    source={require('../../assets/wled_logo_akemi.png')}
                    style={styles.wledLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionText}>
                  A modern, intuitive interface for controlling WLED devices with style and ease.
                </Text>
              </View>

              {/* Developer */}
              <View style={styles.developerSection}>
                <Text style={styles.developerText}>Developed with ❤️ by</Text>
                <TouchableOpacity onPress={openProfile}>
                  <Text style={styles.developerLink}>@mrkprdo</Text>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View>
                <TouchableOpacity onPress={openGitHub} style={styles.githubButton}>
                  <Ionicons name="logo-github" size={20} color="#FFF" />
                  <Text style={styles.githubButtonText}>View on GitHub</Text>
                </TouchableOpacity>

                <Text style={styles.openSourceText}>
                  This is an open-source project. Contributions are welcome!
                </Text>
              </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AboutModal;