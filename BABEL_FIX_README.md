# Babel Configuration Fix

## Issue
The `react-native-css-interop` package (dependency of NativeWind) uses an outdated babel plugin reference:
- **Problem**: `"react-native-reanimated/plugin"` 
- **Solution**: `"react-native-worklets/plugin"`

## Automatic Fix
This project includes a postinstall script that automatically patches the babel configuration:

```bash
npm install  # Automatically runs the fix
```

## Manual Fix
If needed, you can run the fix manually:

```bash
node scripts/fix-babel.js
```

## Root Cause
- NativeWind 4.1.23 depends on `react-native-css-interop@0.1.22`
- This version still references the old reanimated plugin
- React Native Reanimated moved its babel plugin to the `react-native-worklets` package

## Future Resolution
This fix will no longer be needed when:
- NativeWind updates to use a newer version of `react-native-css-interop`
- `react-native-css-interop` updates its babel configuration to use the new plugin

## Alternative Solutions
If you encounter issues with this fix:
1. Remove the `react-native-worklets/plugin` from your babel.config.js
2. Use an older version of React Native Reanimated that still supports the old plugin location
3. Wait for upstream packages to be updated