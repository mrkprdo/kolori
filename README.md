# Kolori

<div align="center">
  <img src="assets/icon.png" alt="Kolori Logo" width="128" height="128">
  <p><em>A modern React Native app for controlling WLED devices with beautiful presets and playlists</em></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Built with React Native](https://img.shields.io/badge/Built%20with-React%20Native-61DAFB?logo=reactnative)](https://reactnative.dev/)
  [![Powered by Expo](https://img.shields.io/badge/Powered%20by-Expo-000020?logo=expo)](https://expo.dev/)
  [![Styled with NativeWind](https://img.shields.io/badge/Styled%20with-NativeWind-06B6D4?logo=tailwindcss)](https://www.nativewind.dev/)
</div>

## 🎯 Description

Kolori is a modern, intuitive React Native mobile application for controlling WLED (WiFi LED Controller) devices. Built with Expo and NativeWind (Tailwind CSS for React Native), it provides a beautiful cross-platform interface for managing your LED strips with features like preset management, playlist creation, device discovery, and real-time control.

Whether you're setting up ambient lighting for your home, creating dynamic displays, or managing multiple LED installations, Kolori offers the tools you need with a polished, native mobile experience.

**Inspired by the amazing WLED project** - Kolori builds upon the excellent foundation provided by the WLED community to deliver an enhanced mobile control experience.

## ✨ Features

### 🎨 **LED Control & Effects**

- **Preset Management**: Beautiful grid of lighting presets with seasonal themes and custom effects
- **Custom Effects Creation**: Build and save your own lighting effects with full palette support
- **Real-time Control**: Instant effect application with WebSocket connectivity
- **Effect Testing**: Preview effects before saving to ensure perfect results

### 📱 **Device Management**

- **Automatic Device Discovery**: Scan network for WLED devices using mDNS/Zeroconf
- **Manual Device Addition**: Add devices by IP address with validation
- **Multi-Device Support**: Manage multiple WLED controllers from one interface
- **Connection Monitoring**: Real-time device status with automatic reconnection
- **Device Web Access**: Quick links to open WLED web interface for each device

### 🎵 **Playlist & Automation**

- **Playlist Builder**: Create dynamic sequences of effects with custom timing
- **Pull-to-Refresh**: Easy playlist updates with intuitive gestures
- **Playlist Management**: Save, edit, and organize multiple playlists

### 🌓 **Modern UI/UX**

- **Dark & Light Themes**: Beautiful interface that adapts to your preference
- **Native Mobile Design**: Platform-specific UI patterns and animations
- **Responsive Layout**: Optimized for phones and tablets
- **Floating Modals**: Consistent modal design across all features
- **User Onboarding**: Welcome screens and user agreement handling

### 📲 **Mobile-First Experience**

- **iOS & Android Support**: Native mobile app built with Expo
- **Optimized for Mobile**: Touch-first interface designed for mobile devices
- **Offline Capabilities**: Core functionality works without internet connection

## 📸 Screenshots

_Screenshots coming soon - the app features a beautiful dark and light theme design optimized for mobile devices_

## 🛠️ Development

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **Git** for version control
- **Expo CLI** (`npm install -g @expo/cli`)

For device testing:

- **Expo Go App** on your iOS/Android device for development testing
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds, macOS only)

### Installation

_Android Playstore and iOS App Store links soon!_

## 🏗️ Building

### Development Testing

```bash
git clone https://github.com/mrkprdo/kolori.git
cd kolori
```

```bash
npx expo run android
or
npx expo run ios #for mac/ios
```

### Production Builds

For production builds, you'll need to use EAS Build or local builds:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure project for EAS
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS (requires Apple Developer account)
eas build --platform ios
```

## 🔧 Project Structure

```
kolori/
├── src/
│   ├── components/          # React Native components
│   │   ├── KoloriApp.tsx   # Main app component
│   │   ├── PresetGrid.tsx  # Presets display
│   │   ├── DeviceManagementModal.tsx
│   │   ├── PlaylistCreationModal.tsx
│   │   └── ...
│   ├── constants/           # App constants and configuration
│   └── types/              # TypeScript type definitions
├── assets/                 # Images, icons, and static assets
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # NativeWind/Tailwind configuration
└── tsconfig.json          # TypeScript configuration
```

### Key Dependencies

#### Core Framework

- **Expo ~53.0.22** - React Native development platform
- **React Native ^0.79.5** - Cross-platform mobile framework
- **React 19.0.0** - Latest React with modern features

#### UI & Styling

- **NativeWind ^4.1.23** - Tailwind CSS for React Native
- **Expo Linear Gradient** - Beautiful gradient effects
- **@expo/vector-icons** - Comprehensive icon library

#### Navigation & Storage

- **@react-navigation/native ^7.1.17** - Native navigation
- **@react-native-async-storage/async-storage** - Persistent storage
- **React Native Safe Area Context** - Safe area handling

#### Networking & Device Discovery

- **react-native-zeroconf ^0.13.8** - mDNS/Zeroconf for device discovery
- **Built-in WebSocket** support for real-time WLED communication
- **React Native Networking** - HTTP requests and device communication

## 🤝 Contributing

We welcome contributions to Kolori! Please read our contributing guidelines before submitting pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the project structure
4. Test on both iOS and Android if possible
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow React Native and TypeScript best practices
- Use NativeWind/Tailwind for consistent styling
- Write descriptive component and function names
- Add TypeScript types for all components and functions
- Use conventional commit messages

## 📱 Features Roadmap

- [ ] Advanced scheduling system
- [ ] Custom color palette creation
- [ ] Effect synchronization across multiple devices
- [ ] Voice control integration
- [ ] Widget support for quick controls
- [ ] Backup/restore settings

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WLED Project** - For the amazing LED controller firmware that inspired this app
- **Expo Team** - For the excellent React Native development platform
- **React Native Community** - For the robust ecosystem and components
- **NativeWind** - For bringing Tailwind CSS to React Native
- **@mrkprdo** - Primary developer and maintainer

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/mrkprdo/kolori/issues) page
2. Create a new issue with detailed information
3. Include device information (iOS/Android), app version, and steps to reproduce

## 🌟 Show Your Support

If you find Kolori useful, please consider:

- ⭐ Starring the repository
- 🍴 Forking and contributing
- 🐛 Reporting bugs and suggesting features
- 📱 Sharing with the WLED community

---

<div align="center">
  <p>Made with ❤️ for the WLED community</p>
  <p>Kolori + <img src="assets/wled_logo_akemi.png" alt="WLED" height="20"> WLED</p>
</div>
