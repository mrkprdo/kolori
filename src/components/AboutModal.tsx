import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Using Ionicons for icons
import { APP_VERSION } from '../constants/version';

interface AboutModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const AboutModal: React.FC<AboutModalProps> = ({ isVisible, onClose, isDark }) => {
  if (!isVisible) return null;


  const openGitHub = () => {
    Linking.openURL('https://github.com/mrkprdo/kolori');
  };

  const openProfile = () => {
    Linking.openURL('https://github.com/mrkprdo');
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // bg-black bg-opacity-50
    },
    modalContent: {
      width: '90%',
      maxWidth: 500, // max-w-lg
      borderRadius: 12, // rounded-2xl
      overflow: 'hidden',
      backgroundColor: isDark ? '#1F2937' : '#FFF', // bg-gray-900 or bg-white
    },
    header: {
      padding: 24, // p-6
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB', // border-gray-700 or border-gray-200
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12, // gap-3
    },
    logoContainer: {
      width: 40,
      height: 40,
      borderRadius: 8,
      overflow: 'hidden',
    },
    logoImage: {
      width: 40,
      height: 40,
      borderRadius: 8,
    },
    titleContainer: {
      // No specific styles needed here, Text components handle it
    },
    title: {
      fontSize: 20, // text-xl
      fontWeight: 'bold',
      color: isDark ? '#FFF' : '#111827', // text-white or text-gray-900
    },
    version: {
      fontSize: 12, // text-sm
      color: isDark ? '#9CA3AF' : '#6B7280', // text-gray-400 or text-gray-600
    },
    closeButton: {
      padding: 8, // p-2
      borderRadius: 999, // rounded-full
      // text-xl leading-none
      backgroundColor: isDark ? 'transparent' : 'transparent', // hover:bg-gray-800 or hover:bg-gray-100
    },
    closeButtonText: {
      fontSize: 24, // text-xl
      color: isDark ? '#FFF' : '#000', // text-white or text-gray-900
    },
    content: {
      padding: 24, // p-6
      gap: 24, // space-y-6
      color: isDark ? '#FFF' : '#111827', // text-white or text-gray-900
    },
    descriptionSection: {
      textAlign: 'center', // text-center
      gap: 12, // space-y-3
    },
    appNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 12,
    },
    appName: {
      fontSize: 36, // text-4xl
      fontWeight: 'bold',
      // bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent
      // This gradient text is complex in RN, simplifying to a single color
      color: '#3B82F6', // Simplified to blue
    },
    plusText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 6,
    },
    wledContainer: {
      alignItems: 'center',
      gap: 4,
    },
    wledLogo: {
      width: 150,
      height: 112,
      borderRadius: 15,
    },
    wledText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#3B82F6',
    },
    descriptionText: {
      fontSize: 14, // text-sm
      color: isDark ? '#D1D5DB' : '#4B5563', // text-gray-300 or text-gray-600
    },
    developerSection: {
      textAlign: 'center', // text-center
      padding: 16, // p-4
      borderRadius: 8, // rounded-lg
      backgroundColor: isDark ? '#374151' : '#F3F4F6', // bg-gray-800 or bg-gray-50
    },
    developerText: {
      fontSize: 14, // text-sm
      marginBottom: 12, // mb-3
      color: isDark ? '#FFF' : '#111827',
      textAlign: 'center',
    },
    developerLink: {
      fontWeight: 'bold',
      color: isDark ? '#60A5FA' : '#2563EB', // text-blue-400 or text-blue-600
      textAlign: 'center',
    },
    actionsSection: {
      gap: 12, // space-y-3
    },
    githubButton: {
      width: '100%', // w-full
      backgroundColor: '#111827', // bg-gray-900
      paddingVertical: 12, // py-3
      paddingHorizontal: 16, // px-4
      borderRadius: 12, // rounded-xl
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8, // gap-2
    },
    githubButtonText: {
      color: '#FFF', // text-white
      fontWeight: 'bold', // font-medium
    },
    openSourceText: {
      textAlign: 'center', // text-center
      fontSize: 12, // text-xs
      color: isDark ? '#9CA3AF' : '#6B7280', // text-gray-500 or text-gray-400
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>About Kolori</Text>
                <Text style={styles.version}>v{APP_VERSION}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} style={styles.closeButtonText} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Description */}
            <View style={styles.descriptionSection}>
              <View style={styles.appNameContainer}>
                <Text style={styles.appName}>Kolori</Text>
                <Text style={styles.plusText}>+</Text>
                <View style={styles.wledContainer}>
                  <Image 
                    source={require('../../assets/wled_logo_akemi.png')} 
                    style={styles.wledLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
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
            <View style={styles.actionsSection}>
              <TouchableOpacity onPress={openGitHub} style={styles.githubButton}>
                <Ionicons name="logo-github" size={20} color="#FFF" />
                <Text style={styles.githubButtonText}>View on GitHub</Text>
              </TouchableOpacity>

              <View>
                <Text style={styles.openSourceText}>
                  This is an open-source project. Contributions are welcome!
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AboutModal;