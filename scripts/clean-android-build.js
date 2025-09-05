#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning for Android Studio build...');

// First, try to stop any running processes
console.log('🛑 Stopping Android processes...');
try {
  execSync('taskkill /F /IM java.exe /T 2>nul', { stdio: 'ignore' });
  execSync('taskkill /F /IM gradle.exe /T 2>nul', { stdio: 'ignore' });
} catch (e) {
  // Processes might not be running, continue
}

// Remove development cache and data (safe paths first)
const safePaths = [
  '.expo/devices.json',
  '.expo/settings.json', 
  '.expo/packager-info.json',
  '.expo-shared',
  'node_modules/.cache'
];

const androidPaths = [
  'android/build',
  'android/app/build',
  'android/.gradle'
];

// Clean safe paths first
safePaths.forEach(cleanPath => {
  try {
    if (fs.existsSync(cleanPath)) {
      console.log(`Removing ${cleanPath}...`);
      if (fs.lstatSync(cleanPath).isDirectory()) {
        fs.rmSync(cleanPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(cleanPath);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not remove ${cleanPath}: ${error.message}`);
  }
});

// Try to clean Android paths with retry logic
console.log('🧹 Cleaning Android build artifacts...');
androidPaths.forEach(cleanPath => {
  try {
    if (fs.existsSync(cleanPath)) {
      console.log(`Attempting to remove ${cleanPath}...`);
      
      // Try using Windows rd command for locked directories
      try {
        execSync(`rd /s /q "${cleanPath.replace(/\//g, '\\')}"`, { stdio: 'ignore' });
        console.log(`✅ Removed ${cleanPath}`);
      } catch (cmdError) {
        // Fallback to Node.js method
        fs.rmSync(cleanPath, { recursive: true, force: true });
        console.log(`✅ Removed ${cleanPath}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not remove ${cleanPath}: ${error.message}`);
    console.warn(`💡 Try closing Android Studio and run the command again`);
  }
});

console.log('✅ Clean complete! Ready for Android Studio build.');
console.log('💡 Now run: npx expo run:android --variant release');
console.log('💡 If some files couldn\'t be removed, close Android Studio first.');