import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { T, radii } from '../theme';
import { Surface } from './depth';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Surface style={[styles.card, style]}>{children}</Surface>;
}

export function Section({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  section: {
    color: T.textDim,
    fontSize: 12,
    fontFamily: 'Manrope_700Bold', fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: T.text, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 26, fontWeight: '800', marginTop: 4 },
  muted: { color: T.textFaint, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20 },
});
