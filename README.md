# Kolori

<div align="center">
  <img src="assets/icon.png" alt="Kolori Logo" width="128" height="128">
  <p><em>A powerful mobile app for controlling WLED devices</em></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Built with React Native](https://img.shields.io/badge/Built%20with-React%20Native-61DAFB?logo=reactnative)](https://reactnative.dev/)
  [![Powered by Expo](https://img.shields.io/badge/Powered%20by-Expo-000020?logo=expo)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## What is Kolori?

A modern React Native app for controlling [WLED](https://kno.wled.ge/) devices with real-time WebSocket, audio-reactive effects, and beautiful presets. Works on iOS and Android.

**Key Features:**
- ⚡ Real-time WebSocket control
- 🎵 Audio-reactive effects
- 📡 Live LED visualization (1D strips & 2D matrices)
- 🎨 Beautiful preset system
- 🌓 Dark & light themes

---

## Screenshots

_Coming soon - dark and light theme designs_

---

## Quick Start

### Install

```bash
git clone https://github.com/mrkprdo/kolori.git
cd kolori
npm install
```

### Run

```bash
# Android
npx expo run:android

# iOS (macOS only)
npx expo run:ios
```

---

## Main Features

### ⚡ Real-Time Control
WebSocket-based instant device control with auto-reconnect

### 🎵 Audio Reactive
Live audio processing with FFT analysis - sync your LEDs to music

### 📡 Live View
See your LED colors in real-time (supports strips and matrices)

### 🎨 Presets & Playlists
Beautiful preset collections, custom effects, and playlist creation

### 📱 Device Management
Auto-discovery (mDNS) or manual IP entry - manage multiple devices

---

## Tech Stack

- **React Native** - Cross-platform mobile
- **TypeScript** - Type safety
- **WebSocket** - Real-time communication
- **FFT/Audio** - Music reactive effects
- **Expo** - Development & builds

---

## Documentation

- [Quick Reference](./docs/QUICK_REFERENCE.md) - Code examples & common tasks
- [Architecture Guide](./docs/CODEBASE_AUDIT_2025.md) - Detailed documentation
- [Documentation Index](./docs/README.md) - All docs

---

## Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [docs](./docs) for architecture and code standards.

---

## Roadmap

**Completed:**
- ✅ Real-time WebSocket
- ✅ Audio-reactive effects
- ✅ Live LED visualization

**Planned:**
- [ ] Advanced scheduling
- [ ] Custom color palettes
- [ ] Multi-device sync
- [ ] Voice control
- [ ] Home widgets

---

## Performance

- 30-60 packets/second (audio reactive)
- <50ms WebSocket latency
- 60fps native animations
- ~25MB app size

---

## License

MIT License - see [LICENSE](LICENSE) file

---

## Credits

- [WLED Project](https://kno.wled.ge/) - Amazing LED firmware
- [LedFx](https://github.com/LedFx/LedFx) - Audio algorithm inspiration
- [@mrkprdo](https://github.com/mrkprdo) - Developer

---

## Support

- [Issues](https://github.com/mrkprdo/kolori/issues) - Report bugs
- ⭐ Star the repo if you find it useful!

---

<div align="center">
  <p>Made with ❤️ for the WLED community</p>
</div>
