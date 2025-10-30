import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface UserAgreementProps {
  isDark: boolean;
  onAccept: () => void;
  onReject: () => void;
}

// Agreement version for signature hash
export const AGREEMENT_VERSION = "2025-01-v1.0";

export default function UserAgreement({
  isDark,
  onAccept,
  onReject,
}: UserAgreementProps) {
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isScrolledToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 10;
    if (isScrolledToBottom) {
      setHasScrolled(true);
    }
  };

  const backgroundColor = isDark ? '#111827' : '#f9fafb';
  const cardBackground = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111827';
  const subtextColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.card, { backgroundColor: cardBackground }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerContent}>
            <Ionicons name="shield-checkmark" size={28} color="#3B82F6" />
            <Text style={[styles.title, { color: textColor }]}>
              Terms of Use & Privacy Agreement
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            Please read carefully before using Kolori
          </Text>
        </View>

        {/* Agreement Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.contentSpacing}>
            {/* Liability Disclaimer */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning" size={20} color="#EF4444" />
                <Text style={[styles.sectionTitle, { color: isDark ? '#fca5a5' : '#dc2626' }]}>
                  Liability Disclaimer
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.text, { color: textColor }]}>
                  <Text style={styles.bold}>IMPORTANT:</Text> By using Kolori, you acknowledge and agree that:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>No Warranty:</Text> This application is provided "as is" without any warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>Device Safety:</Text> I am not liable for any damage, malfunction, or failure of your WLED devices, LED strips, or any connected hardware that may result from using this application.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>Property Damage:</Text> I am not responsible for any property damage, electrical issues, fire hazards, or personal injury that may occur from the use of this application with your LED devices.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>Use at Your Own Risk:</Text> You use this application entirely at your own risk and responsibility.
                  </Text>
                </View>
              </View>
            </View>

            {/* WLED & Open Source */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="code-slash" size={20} color="#3B82F6" />
                <Text style={[styles.sectionTitle, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                  WLED Integration & Open Source
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.text, { color: textColor }]}>
                  Kolori is an open-source user interface wrapper for WLED devices and does not modify the core WLED firmware functionality. By proceeding, you agree that:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • You will use WLED devices and firmware "as is"
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • You understand that Kolori communicates with WLED via standard APIs
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • Any issues with WLED functionality should be addressed with the WLED project
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • You are responsible for ensuring your WLED devices are properly configured
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • This application is open-source and available for modification and distribution
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • You may freely use, study, modify, and distribute this software
                  </Text>
                </View>
              </View>
            </View>

            {/* Privacy & Data Collection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={[styles.sectionTitle, { color: isDark ? '#34d399' : '#059669' }]}>
                  Privacy & Data Collection
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.text, { color: textColor }]}>
                  Your privacy is important. Here's what you need to know about data handling:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>No Cloud Storage:</Text> No data is transmitted to or stored on any cloud servers or remote databases.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>Local Storage Only:</Text> Your device configurations, preferences, and settings are stored locally on your device only.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>No Tracking:</Text> We do not use tracking or analytics of any kind.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>No Personal Information:</Text> We do not collect, store, or transmit any personal information.
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • <Text style={styles.bold}>Local Network Only:</Text> Communication occurs directly between your device and your WLED devices on your local network.
                  </Text>
                </View>
              </View>
            </View>

            {/* Terms of Use */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: isDark ? '#a78bfa' : '#7c3aed' }]}>
                  Terms of Use
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.text, { color: textColor }]}>
                  By using this application, you agree to:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • Use the application for legitimate and lawful purposes only
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • Not use the application in ways that could harm your devices or network
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • Take full responsibility for your device configurations and usage
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • Respect the open-source nature of this project and its contributors
                  </Text>
                  <Text style={[styles.bulletItem, { color: textColor }]}>
                    • Understand that this agreement may be updated without prior notice
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer with Action Buttons */}
        <View style={[styles.stickyFooter, { backgroundColor: cardBackground, borderTopColor: borderColor }]}>
          {/* Scroll Indicator */}
          {!hasScrolled && (
            <View style={[styles.scrollIndicator, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(254, 243, 199, 1)' }]}>
              <Text style={[styles.scrollText, { color: isDark ? '#fbbf24' : '#d97706' }]}>
                ↓ Please scroll down to read the complete agreement ↓
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={onAccept}
                disabled={!hasScrolled}
                style={[
                  styles.acceptButton,
                  {
                    backgroundColor: hasScrolled ? '#3b82f6' : '#9ca3af',
                    opacity: hasScrolled ? 1 : 0.6
                  }
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.acceptButtonText}>
                  I Agree & Continue
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={onReject}
                style={[
                  styles.rejectButton,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    borderColor: isDark ? '#4b5563' : '#d1d5db'
                  }
                ]}
              >
                <Text style={[styles.rejectButtonText, { color: isDark ? '#d1d5db' : '#374151' }]}>
                  I Disagree
                </Text>
              </TouchableOpacity>
            </View>
            
            {!hasScrolled && (
              <Text style={[styles.helpText, { color: subtextColor }]}>
                Please read the complete agreement to continue
              </Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flex: 1,
    maxWidth: 768,
    alignSelf: 'center',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  contentSpacing: {
    gap: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionContent: {
    gap: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  bulletList: {
    marginLeft: 16,
    gap: 8,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  scrollIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: 'center',
  },
  scrollText: {
    fontSize: 14,
    textAlign: 'center',
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContainer: {
    padding: 24,
  },
  buttons: {
    gap: 16,
  },
  acceptButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
    marginLeft: 8,
  },
  rejectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontWeight: '500',
    fontSize: 16,
  },
  helpText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});