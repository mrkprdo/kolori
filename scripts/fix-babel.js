#!/usr/bin/env node

// Fix for NativeWind's react-native-css-interop babel configuration
// This script patches the old reanimated plugin reference to use the new worklets plugin

const fs = require('fs');
const path = require('path');

const babelFilePath = path.join(__dirname, '..', 'node_modules', 'react-native-css-interop', 'babel.js');

if (fs.existsSync(babelFilePath)) {
  let content = fs.readFileSync(babelFilePath, 'utf8');
  
  // Replace old plugin with new one
  const updated = content.replace(
    '"react-native-reanimated/plugin"',
    '"react-native-worklets/plugin"'
  );
  
  if (content !== updated) {
    fs.writeFileSync(babelFilePath, updated, 'utf8');
    console.log('✅ Fixed babel plugin reference in react-native-css-interop');
  } else {
    console.log('ℹ️  Babel plugin reference already fixed or not found');
  }
} else {
  console.log('⚠️  react-native-css-interop babel.js not found');
}