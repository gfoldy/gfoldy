import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useStore } from '../db/store';
import { T, radii } from '../theme';

export function Onboarding() {
  const { createProfile } = useStore();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async (seed: boolean) => {
    if (busy) return;
    setBusy(true);
    await createProfile(name, seed);
    setBusy(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>LF<Text style={{ color: T.gold }}>T</Text></Text>
      <Text style={styles.tagline}>Train. Track. Progress.</Text>
      <Text style={styles.h}>Who's training?</Text>
      <Text style={styles.sub}>Your data stays on this device, tagged to your name.</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={T.textFaint}
        style={styles.input}
        autoFocus
      />
      <Pressable style={[styles.btn, styles.gold]} onPress={() => go(true)} disabled={busy}>
        <Text style={styles.goldText}>Use the LFT starter split</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.ghost]} onPress={() => go(false)} disabled={busy}>
        <Text style={styles.ghostText}>Start from scratch</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, padding: 24, justifyContent: 'center' },
  brand: { color: T.text, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 48, fontWeight: '800', textAlign: 'center', letterSpacing: 2 },
  tagline: { color: T.textDim, fontFamily: 'Manrope_700Bold', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginTop: 6, marginBottom: 40 },
  h: { color: T.text, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  sub: { color: T.textDim, fontFamily: 'Manrope_400Regular', fontSize: 14, marginBottom: 20 },
  input: {
    backgroundColor: T.bgElev, color: T.text, borderRadius: radii.md, borderWidth: 1,
    borderColor: T.border, paddingHorizontal: 14, paddingVertical: 14, fontFamily: 'Manrope_400Regular', fontSize: 16, marginBottom: 18,
  },
  btn: { borderRadius: radii.md, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  gold: { backgroundColor: T.gold },
  goldText: { color: T.goldInk, fontWeight: '800', fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 15 },
  ghost: { borderWidth: 1, borderColor: T.border, backgroundColor: T.bgElev },
  ghostText: { color: T.text, fontWeight: '700', fontFamily: 'Manrope_700Bold', fontSize: 15 },
});
