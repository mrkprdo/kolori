import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

// Custom Text component that always uses VT323 font
export default function Text(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <RNText
      {...otherProps}
      style={[styles.defaultFont, style]}
    />
  );
}

const styles = StyleSheet.create({
  defaultFont: {
    fontFamily: 'VT323_400Regular',
  },
});
