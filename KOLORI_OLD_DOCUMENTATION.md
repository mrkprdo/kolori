# Kolori (React Version) - Comprehensive Documentation

> **Version**: 0.1.0  
> **Framework**: React 19 + Vite + Tailwind CSS  
> **Platform**: Web/Mobile (Capacitor)  
> **Purpose**: WLED LED Strip Controller with Advanced Features

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Directory Structure](#directory-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [WLED Communication](#wled-communication)
7. [User Interface & Design System](#user-interface--design-system)
8. [User Workflows](#user-workflows)
9. [Key Features](#key-features)
10. [Configuration Files](#configuration-files)
11. [Development Setup](#development-setup)

## Project Overview

Kolori is a sophisticated React-based web application designed to control WLED (WiFi LED) devices with an intuitive, modern interface. The app provides comprehensive LED strip management including preset creation, playlist functionality, scheduling, and real-time LED visualization.

### Key Characteristics
- **Single-page application** with modular component design
- **Mobile-first responsive** interface with Capacitor for native app packaging
- **Real-time WebSocket** communication with WLED devices
- **Advanced state management** with localStorage persistence
- **Modern UI/UX** with Tailwind CSS and Lucide React icons

## Architecture & Technology Stack

### Core Technologies
- **React 19.1.1** - Latest React with concurrent features
- **Vite 7.1.0** - Fast build tool and dev server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Capacitor 7.4.2** - Cross-platform native runtime
- **Lucide React 0.541.0** - Modern icon library

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS preprocessing
- **Autoprefixer** - CSS vendor prefixes
- **Terser** - JavaScript minification

## Directory Structure

```
kolori_old/
├── src/
│   ├── components/           # React components
│   │   ├── KoloriApp.jsx    # Main application component
│   │   ├── Header.jsx       # Top navigation/status bar
│   │   ├── PresetGrid.jsx   # Main content area with presets
│   │   ├── WelcomePage.jsx  # First-run welcome screen
│   │   ├── SettingsModal.jsx # Device & app configuration
│   │   ├── PlaylistModal.jsx # Playlist creation/management
│   │   └── [13 other modals & UI components]
│   ├── config/
│   │   └── wledApi.js       # WLED HTTP API integration
│   ├── constants/
│   │   ├── presets.js       # Seasonal preset definitions
│   │   └── palettes.js      # WLED color palette data
│   ├── utils/
│   │   ├── wledWebSocket.js # WLED WebSocket communication
│   │   ├── logger.js        # Logging utility
│   │   └── [3 other utilities]
│   ├── App.jsx             # App entry component
│   ├── main.jsx           # React root mounting
│   └── index.css          # Global styles
├── public/                # Static assets
├── [Configuration files]  # Vite, Tailwind, Capacitor, etc.
```

## Component Architecture

### 1. KoloriApp.jsx (Main Application)
**Location**: `src/components/KoloriApp.jsx` (1,642 lines)

**Responsibilities**:
- Central state management and coordination
- Device connection management and heartbeat monitoring
- WebSocket communication setup and handling
- User agreement and security protection flows
- Schedule-based automation logic

**Key State Variables**:
```javascript
// Device Management
const [devices, setDevices] = useState(() => loadFromStorage(DEVICES_STORAGE_KEY, []))
const [activeDeviceId, setActiveDeviceId] = useState(() => loadFromStorage(ACTIVE_DEVICE_STORAGE_KEY, null))

// UI State
const [showSettings, setShowSettings] = useState(false)
const [showPlaylist, setShowPlaylist] = useState(false)
const [theme, setTheme] = useState("system")

// Content State
const [customEffects, setCustomEffects] = useState(() => loadCustomEffectsFromStorage())
const [savedPlaylists, setSavedPlaylists] = useState(() => loadFromStorage(PLAYLISTS_STORAGE_KEY, []))
const [currentPlaylist, setCurrentPlaylist] = useState([])

// Live Features
const [liveLedData, setLiveLedData] = useState([])
const [liveViewEnabled, setLiveViewEnabled] = useState(true)
```

### 2. PresetGrid.jsx (Main Interface)
**Location**: `src/components/PresetGrid.jsx` (1,213 lines)

**Key Features**:
- **Seasonal Presets**: Holiday/themed preset collection
- **Custom Effects**: User-created effect combinations
- **Playlists**: Sequential effect playback
- **Live View**: Real-time LED visualization
- **Effect Creation**: Interactive WLED effect builder

**Sub-Components**:
- `PresetCard` - Individual preset display
- `CustomEffectCard` - Custom effect with edit/delete options  
- `PlaylistCard` - Playlist display with gradient preview

### 3. Header.jsx (Navigation)
**Location**: `src/components/Header.jsx` (111 lines)

**Features**:
- App branding and title
- Device connection status indicators
- Device switching dropdown (multi-device support)
- Schedule mode indicators
- Settings access button

### 4. WelcomePage.jsx (Onboarding)
**Location**: `src/components/WelcomePage.jsx` (96 lines)

**Purpose**: First-run user experience with device discovery and setup guidance

### 5. Modal Components
- **SettingsModal**: Device management, app configuration, scheduling
- **PlaylistModal**: Playlist creation and editing interface
- **DeviceDiscoveryModal**: Network device scanning
- **UserAgreement**: Legal terms and conditions
- **MixedContentProtection**: HTTPS/HTTP security warnings

## State Management

### Persistence Strategy
The application uses `localStorage` for state persistence across sessions:

```javascript
// Storage Keys
const DEVICES_STORAGE_KEY = "kolori_devices"
const ACTIVE_DEVICE_STORAGE_KEY = "kolori_active_device" 
const USER_AGREEMENT_STORAGE_KEY = "kolori_user_agreement"
const SCHEDULE_MODE_STORAGE_KEY = "kolori_schedule_mode"
const PLAYLISTS_STORAGE_KEY = "kolori_playlists"
const CUSTOM_EFFECTS_STORAGE_KEY = "kolori_custom_effects"

// Helper Functions
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently handle localStorage errors
  }
}
```

### Device State Management
Each device object contains:
```javascript
{
  id: 1234567890,           // Timestamp-based unique ID
  name: "Living Room LEDs", // User-defined name
  ip: "192.168.1.100",     // IPv4 address
  mdns: "wled-abc123",     // mDNS hostname (optional)
  protocol: "http",        // "http" or "https"
  bestAddress: "192.168.1.100", // Auto-detected best connection
  isConnected: true,       // Real-time connection status
  activePreset: "preset_5", // Currently active preset ID
  isPlaying: false,        // Playlist playback status
  wledInfo: {...},         // WLED device information
  lastHeartbeat: "2023-...", // Last successful ping
}
```

### Heartbeat Monitoring System
**Frequency**: Every 10 seconds  
**Purpose**: Real-time device availability tracking  
**Implementation**: `src/components/KoloriApp.jsx:217-259`

```javascript
const checkAllDevicesHeartbeat = async () => {
  for (const device of currentDevices) {
    const heartbeatResult = await checkWledHeartbeat(device.ip, device.protocol || "http")
    const isConnected = heartbeatResult.online
    
    updatedDevices.push({
      ...device,
      isConnected,
      lastHeartbeat: new Date().toISOString(),
    })
  }
  setDevices(updatedDevices)
}
```

## WLED Communication

### HTTP API Integration
**File**: `src/config/wledApi.js` (838 lines)

**Key Functions**:
```javascript
// Device Discovery & Validation
export const findBestDeviceAddress = async (ip, mdns, protocol) => {
  // Tests both IP and mDNS addresses in parallel
  // Returns fastest responding address
}

// Preset Management
export const activateWledPreset = async (deviceAddress, presetName, protocol)
export const activateWledPresetById = async (deviceAddress, presetId, protocol)
export const createWledPreset = async (deviceAddress, effectId, paletteId, presetName, presetId, protocol)
export const deleteWledPreset = async (deviceAddress, presetId, protocol)

// Device Control
export const turnWledOn = async (deviceAddress, protocol)
export const turnWledOff = async (deviceAddress, protocol)
export const checkWledHeartbeat = async (deviceAddress, protocol)

// Data Retrieval
export const getWledPresets = async (deviceAddress, protocol)
export const getWledEffects = async (deviceAddress, protocol)
export const getWledPalettes = async (deviceAddress, protocol)
```

### WebSocket Integration
**File**: `src/utils/wledWebSocket.js` (352 lines)

**Features**:
- **Real-time state synchronization** with WLED devices
- **Binary data handling** for live LED visualization
- **Automatic reconnection** with exponential backoff
- **Command queuing** and error handling

**Key Functions**:
```javascript
// Connection Management
export const connectWebSocket = (ip, protocol = 'ws') => { ... }
export const disconnectWebSocket = () => { ... }
export const sendWebSocketCommand = (command) => { ... }

// Preset Operations via WebSocket (Faster than HTTP)
export const savePresetViaWebSocket = (presetId, presetName, options = {}) => { ... }
export const loadPresetViaWebSocket = (presetId) => { ... }
export const deletePresetViaWebSocket = (presetId) => { ... }

// Playlist Operations
export const savePlaylistViaWebSocket = (presetId, playlistName, playlistItems, options = {}) => { ... }
export const playPlaylistViaWebSocket = (presetId) => { ... }
export const deletePlaylistViaWebSocket = (presetId) => { ... }
```

**Message Handling**:
```javascript
wledSocket.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    // Binary LED data for live visualization
    const byteArray = new Uint8Array(event.data);
    const colors = [];
    for (let i = 0; i < byteArray.length; i += 3) {
      colors.push({
        r: byteArray[i + 2],
        g: byteArray[i],    
        b: byteArray[i + 1],
      });
    }
    setLiveLedData(colors);
  } else {
    // JSON state updates
    const jsonData = JSON.parse(event.data);
    // Update device state...
  }
}
```

### Mixed Content Handling
The app handles HTTPS/HTTP mixed content issues common in IoT device communication:

```javascript
// Detect mixed content environment
if (window.self !== window.top && location.protocol === "https:") {
  logger.log("🔒 Running in iframe with HTTPS - mixed content protection active");
}

// Global error handler for mixed content issues
window.addEventListener("error", (event) => {
  if (event.message && event.message.includes("mixed content")) {
    logger.error("Mixed content error detected:", event.message);
    // Notify parent frame if in iframe
    if (window.parent !== window.self) {
      window.parent.postMessage({
        type: "MIXED_CONTENT_ERROR",
        url: event.filename || "unknown",
        message: event.message,
      }, "*");
    }
  }
});
```

## User Interface & Design System

### Tailwind CSS Configuration
**File**: `tailwind.config.js`

**Mobile-First Design** with safe area support:
```javascript
theme: {
  extend: {
    spacing: {
      'safe-top': 'env(safe-area-inset-top)',
      'safe-bottom': 'env(safe-area-inset-bottom)',
      'safe-left': 'env(safe-area-inset-left)',
      'safe-right': 'env(safe-area-inset-right)',
    },
  },
}
```

### Global Styles
**File**: `src/index.css`

- **Tailwind CSS imports** for utility classes
- **System font stack** for cross-platform consistency
- **Mobile safe area** CSS variables
- **Full-height app container** setup

### Visual Design Patterns

**Color Gradients** for presets and effects:
```javascript
// Seasonal presets use predefined gradients
{
  id: 1,
  name: "Autumn", 
  gradient: "linear-gradient(135deg, #ff6600, #ff9933)"
}

// Custom effects generate gradients from WLED palettes
const generateGradient = (paletteName) => {
  const paletteData = WLED_PALETTES_DATA[paletteName];
  const colorStops = paletteData
    .map(color => `rgb(${color[1]}, ${color[2]}, ${color[3]})`)
    .join(", ");
  return `linear-gradient(135deg, ${colorStops})`;
}
```

**Dark/Light Theme Support**:
```javascript
const isDark = theme === "dark" || 
  (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

// Conditional classes throughout components
className={`p-4 rounded-lg ${
  isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
}`}
```

**Status Indicators** with color coding:
- 🟢 **Green**: Connected, active, online
- 🔴 **Red**: Disconnected, offline, error
- 🟡 **Yellow**: Warning, pending, day mode
- 🟣 **Purple**: Night mode, special state
- 🔵 **Blue**: All-day mode, information

## User Workflows

### 1. First-Time User Experience
1. **User Agreement** acceptance (`UserAgreement.jsx`)
2. **Mixed Content Protection** information (`MixedContentProtection.jsx`)
3. **Welcome Page** with device discovery (`WelcomePage.jsx`)
4. **Device Addition** via manual IP or mDNS scan
5. **Settings Configuration** and theme selection

### 2. Device Management Workflow
1. **Device Discovery**:
   - Manual IP address entry
   - mDNS hostname discovery
   - Network scanning for WLED devices
   - Connectivity validation and speed testing

2. **Device Connection**:
   - HTTP/HTTPS protocol selection
   - WebSocket connection establishment
   - Heartbeat monitoring activation
   - Real-time state synchronization

### 3. Preset Creation Workflow
1. **Effect Selection** from WLED device's available effects
2. **Palette Selection** from WLED device's color palettes
3. **Live Testing** of effect combinations
4. **Preset Saving** to both app and WLED device
5. **Custom Naming** and gradient generation

### 4. Playlist Creation Workflow
1. **Custom Effect Prerequisite** (requires existing custom effects)
2. **Playlist Builder Interface** with drag-and-drop reordering
3. **Duration Settings** for each effect (in seconds)
4. **Playlist Preview** with combined gradient visualization
5. **WLED Device Integration** via WebSocket API

### 5. Scheduling Workflow
1. **Schedule Mode Selection**:
   - **All-Day**: Always on (default)
   - **Day Mode**: 7am-7pm automatic activation
   - **Night Mode**: 7pm-7am automatic activation
2. **Automatic Enforcement** every 60 seconds
3. **Manual Override** capabilities
4. **Schedule Status Indication** in header

## Key Features

### Live LED Visualization
**Location**: `PresetGrid.jsx:805-847`

Real-time LED strip visualization showing individual LED colors:
```javascript
{liveLedData.map((color, index) => (
  <div
    key={index}
    style={{
      width: "6px",
      height: "11px", 
      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
      borderRadius: "2px",
      boxShadow: `0 0 4px rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`,
    }}
    title={`LED ${index + 1}: RGB(${color.r}, ${color.g}, ${color.b})`}
  />
))}
```

### Advanced Scheduling System
**Location**: `KoloriApp.jsx:380-464`

Time-based automated LED control:
```javascript
const shouldLightsBeOn = () => {
  const now = new Date();
  const currentHour = now.getHours();
  
  if (scheduleMode === "day") {
    return currentHour >= 7 && currentHour < 19; // 7am-7pm
  } else if (scheduleMode === "night") {
    return currentHour >= 19 || currentHour < 7; // 7pm-7am
  }
  
  return true; // all-day mode
}
```

### Dual Communication Protocols
- **HTTP API**: Device control, preset management, configuration
- **WebSocket**: Real-time updates, live data, fast operations

### Mobile-Native Integration
**Capacitor Configuration**: `capacitor.config.json`

- **Native status bar** theming
- **Safe area handling** for notched devices  
- **Cross-platform deployment** (iOS/Android)

## Configuration Files

### Package.json
- **Development Scripts**: `dev`, `build`, `lint`, `preview`
- **Mobile Scripts**: `mobile:android`, `mobile:ios` with Capacitor
- **Dependencies**: React 19, Capacitor 7, Tailwind CSS 3

### Vite Configuration
- **React plugin** for JSX/TSX support
- **Development server** with HMR
- **Production build** optimization

### ESLint Configuration  
- **React hooks** rules enforcement
- **React refresh** plugin for HMR
- **Code quality** standards

## Development Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- For mobile development: Android Studio/Xcode

### Installation & Running
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Mobile development
npm run mobile:android  # Opens Android Studio
npm run mobile:ios      # Opens Xcode
```

### Key Development Commands
```bash
npm run lint           # Code quality check
npm run preview        # Preview production build
npm run mobile:sync    # Sync web build to native projects
```

---

## Summary

Kolori (React version) is a comprehensive, production-ready WLED controller application featuring:

- **Modern React architecture** with hooks and concurrent features
- **Real-time WebSocket communication** for live device interaction
- **Advanced state management** with localStorage persistence
- **Mobile-first responsive design** with native app capabilities
- **Sophisticated scheduling system** for automated control
- **Live LED visualization** for immediate feedback
- **Comprehensive device management** with multi-device support
- **Security-conscious design** handling mixed content scenarios

The codebase demonstrates professional-level React development patterns, extensive error handling, and thoughtful user experience design optimized for both web and mobile platforms.

**Total Lines of Code**: ~3,500+ lines across 36 files  
**Main Components**: 20+ React components  
**API Integration**: 25+ WLED API functions  
**Storage Management**: 6 localStorage keys with persistence helpers