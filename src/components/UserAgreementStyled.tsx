// UserAgreement Component for React Native - StyleSheet Version
// Migrated from kolori_old/src/components/UserAgreement.jsx

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface UserAgreementProps {
  isDark: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function UserAgreement({
  isDark,
  onAccept,
  onReject,
}: UserAgreementProps) {
  const containerStyle = [
    styles.container,
    { backgroundColor: isDark ? '#111827' : '#f9fafb' }
  ];

  const contentCardStyle = [
    styles.contentCard,
    { 
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#374151' : '#e5e7eb'
    }
  ];

  const disclaimerStyle = [
    styles.disclaimer,
    { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.1)' : '#fefce8' }
  ];

  const declineButtonStyle = [
    styles.declineButton,
    { 
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: isDark ? '#4b5563' : '#d1d5db'
    }
  ];

  return (
    <SafeAreaView style={containerStyle}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[
            styles.iconContainer,
            { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe' }
          ]}>
            <Ionicons 
              name="document-text" 
              size={32} 
              color={isDark ? '#60a5fa' : '#2563eb'} 
            />
          </View>
          
          <Text style={[
            styles.title,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            Welcome to Kolori
          </Text>
          
          <Text style={[
            styles.subtitle,
            { color: isDark ? '#d1d5db' : '#6b7280' }
          ]}>
            Before you begin, please review and accept our terms and conditions.
          </Text>
        </View>

        {/* Terms Content */}
        <View style={contentCardStyle}>
          <Text style={[
            styles.sectionTitle,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            Terms of Use
          </Text>

          <View style={styles.termsList}>
            <View style={styles.termItem}>
              <Text style={[
                styles.termHeader,
                { color: isDark ? '#e5e7eb' : '#1f2937' }
              ]}>
                🔒 Privacy & Security
              </Text>
              <Text style={[
                styles.termText,
                { color: isDark ? '#d1d5db' : '#6b7280' }
              ]}>
                Kolori stores your device settings locally on your device. No personal data is transmitted to external servers.
              </Text>
            </View>

            <View style={styles.termItem}>
              <Text style={[
                styles.termHeader,
                { color: isDark ? '#e5e7eb' : '#1f2937' }
              ]}>
                🌐 Network Communication
              </Text>
              <Text style={[
                styles.termText,
                { color: isDark ? '#d1d5db' : '#6b7280' }
              ]}>
                The app communicates directly with your WLED devices on your local network. All communication happens locally.
              </Text>
            </View>

            <View style={styles.termItem}>
              <Text style={[
                styles.termHeader,
                { color: isDark ? '#e5e7eb' : '#1f2937' }
              ]}>
                ⚡ Device Control
              </Text>
              <Text style={[
                styles.termText,
                { color: isDark ? '#d1d5db' : '#6b7280' }
              ]}>
                This app allows you to control LED devices. Use responsibly and ensure proper electrical safety.
              </Text>
            </View>

            <View style={styles.termItem}>
              <Text style={[
                styles.termHeader,
                { color: isDark ? '#e5e7eb' : '#1f2937' }
              ]}>
                📱 Open Source
              </Text>
              <Text style={[
                styles.termText,
                { color: isDark ? '#d1d5db' : '#6b7280' }
              ]}>
                Kolori is open source software. You can review the code and contribute to the project.
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={disclaimerStyle}>
          <View style={styles.disclaimerContent}>
            <Ionicons 
              name="warning" 
              size={20} 
              color={isDark ? '#fbbf24' : '#d97706'} 
            />
            <View style={styles.disclaimerText}>
              <Text style={[
                styles.disclaimerTitle,
                { color: isDark ? '#fef3c7' : '#92400e' }
              ]}>
                Important Disclaimer
              </Text>
              <Text style={[
                styles.disclaimerBody,
                { color: isDark ? '#fde68a' : '#a16207' }
              ]}>
                Use this software at your own risk. The developers are not responsible for any damage to your devices or property.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={onAccept}
            style={styles.acceptButton}
          >
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.acceptButtonText}>
              I Accept the Terms
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onReject}
            style={declineButtonStyle}
          >
            <Text style={[
              styles.declineButtonText,
              { color: isDark ? '#d1d5db' : '#374151' }
            ]}>
              I Decline
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[
          styles.footer,
          { color: isDark ? '#6b7280' : '#9ca3af' }
        ]}>
          By continuing, you agree to these terms and conditions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  contentCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  termsList: {
    gap: 16,
  },
  termItem: {
    marginBottom: 16,
  },
  termHeader: {
    fontWeight: '500',
    marginBottom: 8,
    fontSize: 16,
  },
  termText: {
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#eab308',
    marginBottom: 24,
  },
  disclaimerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 12,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  disclaimerBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    paddingTop: 16,
    marginBottom: 16,
  },
  acceptButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  declineButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  declineButtonText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
  },
});