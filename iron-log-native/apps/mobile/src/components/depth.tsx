// Depth primitives — the things that make surfaces read as physical instead of
// flat: a card that catches light on its top edge over a subtle top-lit
// gradient, and brushed-metal text that echoes the LFT logo lettering. Both are
// drawn with react-native-svg (already in Expo Go) so there's no new dependency.

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import { T, radii, shadow, font } from '../theme';

let gid = 0;
const nextId = () => `g${++gid}`;

/**
 * A raised surface. Layers, back to front:
 *  - a soft drop shadow (grounding)
 *  - a top-lit vertical gradient fill (lighter at the top, like ambient light)
 *  - a 1px specular highlight along the very top edge
 *  - a hairline border
 * Pass `tint` to warm the top of the gradient (e.g. a faint green for accent
 * cards). `padded` adds the default 14px inset; override with `style`.
 */
export function Surface({
  children, style, radius = radii.lg, tint, glow = false,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  tint?: string;
  glow?: boolean;
}) {
  const id = React.useRef(nextId()).current;
  return (
    <View
      style={[
        { borderRadius: radius, borderWidth: 1, borderColor: T.border, backgroundColor: T.bgElev, overflow: 'hidden' },
        shadow,
        glow && styles.glow,
        style,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <SvgLinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint ?? '#202024'} />
            <Stop offset="0.5" stopColor="#171719" />
            <Stop offset="1" stopColor="#101012" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {/* specular top edge */}
      <View pointerEvents="none" style={[styles.topEdge, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      {children}
    </View>
  );
}

const SILVER = [
  { o: '0', c: '#fdfdfe' },
  { o: '0.42', c: '#c3c8cf' },
  { o: '0.52', c: '#eef0f3' },  // specular band
  { o: '0.75', c: '#aab0b8' },
  { o: '1', c: '#d2d6dc' },
] as const;

/**
 * Brushed-metal text (a vertical silver gradient with a specular band), echoing
 * the logo's lettering. Fills the parent's width; set `align` to place it.
 */
export function MetalText({
  value, size, family = font.display, align = 'left', style, height,
}: {
  value: string;
  size: number;
  family?: string;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const id = React.useRef(nextId()).current;
  const h = height ?? Math.round(size * 1.3);
  const y = Math.round(size * 0.98);
  const x = align === 'center' ? '50%' : align === 'right' ? '100%' : 0;
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  return (
    <Svg width="100%" height={h} style={style as object} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {SILVER.map((s) => <Stop key={s.o} offset={s.o} stopColor={s.c} />)}
        </SvgLinearGradient>
      </Defs>
      <SvgText x={x} y={y} fontSize={size} fontFamily={family} fontWeight="800" fill={`url(#${id})`} textAnchor={anchor as 'start' | 'middle' | 'end'}>
        {value}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  topEdge: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glow: {
    shadowColor: T.gold,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
