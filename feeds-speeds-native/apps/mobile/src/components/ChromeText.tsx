import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import RawMaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

// masked-view ships class-component types that React 19's JSX typing rejects;
// re-type it as a simple functional component at the boundary (runtime is fine).
const MaskedView = RawMaskedView as unknown as React.ComponentType<{
  maskElement: React.ReactElement;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}>;

// Brushed-chrome text — a vertical silver gradient (bright highlight, mid,
// dark band, hot band, grey) masked to the glyphs, matching the logo wordmark.
const CHROME = ['#ffffff', '#cdd2d8', '#878d95', '#f2f4f6', '#9aa0a8'] as const;

export function ChromeText({
  children, style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const mask = <Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>;
  return (
    <MaskedView maskElement={mask}>
      <LinearGradient
        colors={CHROME}
        locations={[0, 0.34, 0.5, 0.66, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* invisible copy sets the gradient's bounds to the text size */}
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
