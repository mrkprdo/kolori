import { StyleSheet } from 'react-native';

/**
 * Shared styles for PresetGrid components
 * Following DRY principles with common patterns extracted
 */

// Common shadow configuration
const SHADOW_LIGHT = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
};

const SHADOW_MEDIUM = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
};

const SHADOW_HEAVY = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 4.65,
  elevation: 8,
};

// Common positioning
const ABSOLUTE_FILL = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const FLEX_ROW_CENTER = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
};

const FLEX_CENTER = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

// Shared styles
export const sharedStyles = StyleSheet.create({
  // Section Card - Used by all section components
  sectionCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    ...SHADOW_LIGHT,
  },

  // Section Header - Used for collapsible sections
  sectionHeader: {
    ...FLEX_ROW_CENTER,
    justifyContent: 'space-between',
  },

  // Header Left - Icon + Title wrapper
  headerLeft: {
    ...FLEX_ROW_CENTER,
  },

  // Section Title - Common title style
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Section Content - Content wrapper with padding
  sectionContent: {
    paddingTop: 12,
  },

  // Overlay - Full screen overlay
  overlay: {
    ...ABSOLUTE_FILL,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    ...FLEX_CENTER,
  },

  // Modal Container
  modal: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    ...SHADOW_HEAVY,
  },

  // Grid layout for presets/playlists
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
});

// DeviceSelection specific styles
export const deviceSelectionStyles = StyleSheet.create({
  floatingDropdown: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 100,
    height: 56,
    ...FLEX_ROW_CENTER,
    borderWidth: 2,
    borderRadius: 28,
    paddingLeft: 7,
    paddingRight: 10,
    zIndex: 999,
    elevation: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  powerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    ...FLEX_CENTER,
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  dropdownButton: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  dropdownContent: {
    ...FLEX_ROW_CENTER,
    minHeight: 44, // Better touch target
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },

  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownModal: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    minWidth: 320,
    maxWidth: 400,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1001,
  },

  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  deviceScrollContainer: {
    maxHeight: 300,
  },

  deviceOption: {
    ...FLEX_ROW_CENTER,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    minHeight: 64, // Better touch target
  },

  deviceInfo: {
    flex: 1,
    marginLeft: 8,
  },

  deviceOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },

  deviceOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },

  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
});

// LiveViewSection specific styles
export const liveViewStyles = StyleSheet.create({
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
    minWidth: 90,
  },

  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  innerCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
  },

  innerCardCompact: {
    padding: 8, // Reduce padding when offline/compact
  },

  cardContent: {
    ...FLEX_CENTER,
    minHeight: 100,
  },

  cardContentCompact: {
    minHeight: 30, // Much more compact for offline state
    paddingVertical: 4,
  },

  activePresetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },

  activePresetText: {
    fontSize: 13,
    fontWeight: '600',
  },

  statusContainer: {
    ...FLEX_CENTER,
    paddingVertical: 24,
    gap: 4,
  },

  statusContainerCompact: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  compactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  compactStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  compactStatusInfo: {
    fontSize: 11,
  },

  compactDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#9ca3af',
    opacity: 0.3,
    marginHorizontal: 6,
  },

  statusText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  statusTextCompact: {
    fontSize: 13,
  },

  ledInfoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },

  ledInfoContainerCompact: {
    marginTop: 6,
  },

  ledInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  ledInfoText: {
    fontSize: 13,
  },

  ledInfoTextCompact: {
    fontSize: 11,
  },

  disabledContainer: {
    ...FLEX_CENTER,
    paddingVertical: 20,
  },

  disabledText: {
    fontSize: 14,
    textAlign: 'center',
  },

  ledCount: {
    fontSize: 12,
    textAlign: 'center',
  },

  brightnessContainer: {
    marginBottom: 2,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.2)',
  },

  brightnessInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },

  brightnessValue: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },

  slider: {
    flex: 1,
    height: 40,
  },

  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  warningContainerCompact: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },

  warningText: {
    fontSize: 12,
    flex: 1,
  },

  warningTextCompact: {
    fontSize: 11,
  },
});

// Export common patterns for reuse
export const commonPatterns = {
  SHADOW_LIGHT,
  SHADOW_MEDIUM,
  SHADOW_HEAVY,
  ABSOLUTE_FILL,
  FLEX_ROW_CENTER,
  FLEX_CENTER,
};
