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
    borderWidth: 1,
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
    borderWidth: 1,
    borderRadius: 28,
    paddingLeft: 7,
    paddingRight: 10,
    zIndex: 999,
    elevation: 8,
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
  },

  dropdownContent: FLEX_ROW_CENTER,

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
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownModal: {
    borderRadius: 12,
    padding: 16,
    minWidth: 320,
    maxWidth: 400,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
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
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },

  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  innerCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },

  cardContent: {
    ...FLEX_CENTER,
    minHeight: 100,
  },

  activePresetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
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

  statusText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },

  ledInfoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },

  ledInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  ledInfoText: {
    fontSize: 13,
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
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.2)',
  },

  brightnessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  brightnessLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  brightnessValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },

  sliderContainer: {
    ...FLEX_ROW_CENTER,
    marginTop: 12,
    paddingHorizontal: 8,
  },

  slider: {
    flex: 1,
    height: 40,
    marginLeft: 12,
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
