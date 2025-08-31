import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface DeviceSelectionScreenProps {
  isDark?: boolean;
  onAddDevice: () => void;
  onScanNetwork: () => void;
}

export default function DeviceSelectionScreen({
  isDark = false,
  onAddDevice,
  onScanNetwork,
}: DeviceSelectionScreenProps) {
  const containerStyle = [
    styles.container,
    { backgroundColor: isDark ? '#111827' : '#f9fafb' }
  ];

  const cardStyle = [
    styles.card,
    { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
  ];

  return (
    <SafeAreaView style={containerStyle}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[
            styles.title,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            <Text style={styles.titleBlue}>Ko</Text>
            <Text style={styles.titlePurple}>lori</Text>
          </Text>
          <Text style={[
            styles.subtitle,
            { color: isDark ? '#9ca3af' : '#6b7280' }
          ]}>
            WLED Controller
          </Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={[
            styles.welcomeTitle,
            { color: isDark ? '#ffffff' : '#111827' }
          ]}>
            Welcome to Kolori!
          </Text>
          <Text style={[
            styles.welcomeText,
            { color: isDark ? '#9ca3af' : '#6b7280' }
          ]}>
            Let's get started by adding your first WLED device. You can either add a device manually or scan your network to discover devices automatically.
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          {/* Scan Network Card */}
          <TouchableOpacity
            style={[cardStyle, styles.actionCard]}
            onPress={onScanNetwork}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, styles.scanIconContainer]}>
              <Ionicons name="wifi-outline" size={32} color="#ffffff" />
            </View>
            <Text style={[
              styles.actionTitle,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Scan Network
            </Text>
            <Text style={[
              styles.actionDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Automatically discover WLED devices on your network using mDNS
            </Text>
            <View style={styles.actionFooter}>
              <Text style={styles.recommendedBadge}>Recommended</Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isDark ? '#9ca3af' : '#6b7280'} 
              />
            </View>
          </TouchableOpacity>

          {/* Add Device Card */}
          <TouchableOpacity
            style={[cardStyle, styles.actionCard]}
            onPress={onAddDevice}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, styles.addIconContainer]}>
              <Ionicons name="add-circle-outline" size={32} color="#ffffff" />
            </View>
            <Text style={[
              styles.actionTitle,
              { color: isDark ? '#ffffff' : '#111827' }
            ]}>
              Add Device Manually
            </Text>
            <Text style={[
              styles.actionDescription,
              { color: isDark ? '#9ca3af' : '#6b7280' }
            ]}>
              Enter your WLED device details manually if you know the IP address
            </Text>
            <View style={styles.actionFooter}>
              <View style={styles.placeholder} />
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isDark ? '#9ca3af' : '#6b7280'} 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={[
            styles.helpText,
            { color: isDark ? '#9ca3af' : '#6b7280' }
          ]}>
            💡 Not sure which option to choose? Try "Scan Network" first - it's the easiest way to find your WLED devices automatically.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  titleBlue: {
    color: '#2563eb',
  },
  titlePurple: {
    color: '#7c3aed',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  welcomeSection: {
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  actionCard: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanIconContainer: {
    backgroundColor: '#059669',
  },
  addIconContainer: {
    backgroundColor: '#3b82f6',
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendedBadge: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  placeholder: {
    flex: 1,
  },
  helpSection: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
});