#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning development data for production build...');

// Remove development cache directories
const cleanPaths = [
  '.expo',
  '.expo-shared',
  'node_modules/.cache',
  'android/build',
  'ios/build'
];

cleanPaths.forEach(cleanPath => {
  if (fs.existsSync(cleanPath)) {
    console.log(`Removing ${cleanPath}...`);
    fs.rmSync(cleanPath, { recursive: true, force: true });
  }
});

console.log('✅ Clean complete! Ready for production build.');