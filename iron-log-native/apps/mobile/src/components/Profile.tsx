// Your profile — a full-screen sheet everyone has, signed in or not. Shows
// identity (avatar + name + @username), lifetime stats, top lifts and split,
// lets you edit your local name + units, and bridges to the account sheet for
// cloud sign-in / sync so you can share and follow friends.

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { computeSummary } from '@ironlog/core';
import { useStore } from '../db/store';
import { useCloud } from '../lib/cloud';
import { AccountSheet } from './AccountSheet';
import { T, radii, font, shadow, shadowSm } from '../theme';
import { fmtNum } from '../lib/format';

const initials = (s: string) =>
  s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'A';

export function Profile({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore();
  const cloud = useCloud();
  const insets = useSafeAreaInsets();
  const [acct, setAcct] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [following, setFollowing] = useState<number | null>(null);

  const localName = store.profile?.name ?? 'Athlete';
  const unit = store.profile?.unit ?? 'lb';
  const displayName = cloud.user?.display_name || localName;
  const summary = useMemo(() => computeSummary(store.logs), [store.logs]);

  useEffect(() => {
    if (visible) { setName(localName); setEditing(false); }
  }, [visible, localName]);

  useEffect(() => {
    if (visible && cloud.user) cloud.follows().then((f) => setFollowing(f.length)).catch(() => setFollowing(null));
    else setFollowing(null);
  }, [visible, cloud]);

  const saveName = async () => { await store.updateProfile({ name }); setEditing(false); };
  const setUnit = (u: 'lb' | 'kg') => { if (u !== unit) store.updateProfile({ unit: u }); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: T.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* header */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={styles.avatarWrap}>
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id="av" cx="0.3" cy="0.2" r="0.9">
                    <Stop offset="0" stopColor="#5bdc8e" />
                    <Stop offset="1" stopColor="#2f7a4c" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" rx={26} fill="url(#av)" />
              </Svg>
              <Text style={styles.avatarText}>{initials(displayName)}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}><Text style={styles.closeText}>Done</Text></Pressable>
          </View>

          <View style={styles.idBlock}>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput value={name} onChangeText={setName} style={styles.nameInput} autoFocus placeholder="Your name" placeholderTextColor={T.textFaint} />
                <Pressable style={styles.saveBtn} onPress={saveName}><Text style={styles.saveBtnText}>Save</Text></Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setEditing(true)} style={styles.nameRow} hitSlop={6}>
                <Text style={styles.name}>{displayName}</Text>
                <Ionicons name="pencil" size={15} color={T.textFaint} />
              </Pressable>
            )}
            <Text style={styles.handle}>
              {cloud.user ? `@${cloud.user.username}` : 'Local profile · not shared yet'}
              {following != null ? `  ·  Following ${following}` : ''}
            </Text>
          </View>

          {/* stat grid */}
          <View style={styles.stats}>
            <Stat v={String(summary.stats.sessions)} l="Sessions" />
            <Stat v={fmtNum(summary.stats.sets)} l="Sets" />
            <Stat v={fmtNum(summary.stats.volume)} l={`Volume ${unit}`} accent />
          </View>

          {/* units */}
          <View style={styles.pad}>
            <View style={styles.rowCard}>
              <Text style={styles.rowLabel}>Units</Text>
              <View style={styles.unitToggle}>
                {(['lb', 'kg'] as const).map((u) => (
                  <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitBtn, unit === u && styles.unitBtnOn]}>
                    <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextOn]}>{u}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* top lifts */}
          {summary.top_lifts.length > 0 && (
            <>
              <Text style={styles.section}>Top lifts · est. 1RM</Text>
              <View style={styles.pad}>
                <View style={styles.card}>
                  {summary.top_lifts.map((l) => (
                    <View key={l.exercise} style={styles.pbRow}>
                      <Text style={styles.pbEx} numberOfLines={1}>{l.exercise}</Text>
                      <Text style={styles.pbVal}>{fmtNum(l.weight)} {unit} × {l.reps}  ·  <Text style={styles.pbE1}>~{l.e1rm}</Text></Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* split */}
          <Text style={styles.section}>Your split</Text>
          <View style={styles.pad}>
            <View style={styles.card}>
              {store.split.length === 0 ? (
                <Text style={styles.muted}>No training days yet — build your split in the Split tab.</Text>
              ) : store.split.map((d) => (
                <View key={d.id} style={styles.splitRow}>
                  <Text style={styles.splitDay} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.splitMeta}>{d.exercises.length} exercise{d.exercises.length === 1 ? '' : 's'}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* share & compete */}
          <Text style={styles.section}>Share & compete</Text>
          <View style={styles.pad}>
            <View style={styles.card}>
              {cloud.user ? (
                <>
                  <Text style={styles.muted}>Signed in as <Text style={styles.accent}>@{cloud.user.username}</Text>. Push your training so friends see your progress and the leaderboards stay current.</Text>
                  <Pressable style={styles.primaryBtn} onPress={() => setAcct(true)}><Text style={styles.primaryBtnText}>Sync & account</Text></Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.muted}>Create a free account to follow friends, share your split and lifts, climb the leaderboards, and join groups with chat. Your training keeps working offline either way.</Text>
                  <Pressable style={styles.primaryBtn} onPress={() => setAcct(true)}><Text style={styles.primaryBtnText}>Sign in or create account</Text></Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>

        <AccountSheet visible={acct} onClose={() => setAcct(false)} />
      </View>
    </Modal>
  );
}

function Stat({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statV, accent && { color: T.gold }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
  avatarWrap: { width: 76, height: 76, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...shadow },
  avatarText: { color: '#04140b', fontFamily: font.display, fontSize: 30 },
  close: { paddingVertical: 8, paddingHorizontal: 4 },
  closeText: { color: T.textDim, fontFamily: font.semibold, fontSize: 15 },
  idBlock: { paddingHorizontal: 16, marginTop: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: T.text, fontFamily: font.display, fontSize: 26 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, backgroundColor: T.bgElev2, borderRadius: radii.sm, color: T.text, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.bold, fontSize: 18 },
  saveBtn: { backgroundColor: T.gold, borderRadius: radii.sm, paddingHorizontal: 16, paddingVertical: 11 },
  saveBtnText: { color: T.goldInk, fontFamily: font.bold, fontSize: 14 },
  handle: { color: T.textDim, fontFamily: font.medium, fontSize: 13, marginTop: 6 },

  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 18 },
  stat: { flex: 1, backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, paddingVertical: 14, alignItems: 'center', ...shadowSm },
  statV: { color: T.text, fontFamily: font.display, fontSize: 19 },
  statL: { color: T.textFaint, fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },

  section: { color: T.textDim, fontFamily: font.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 10, paddingHorizontal: 16 },
  pad: { paddingHorizontal: 16 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 14, ...shadow },
  rowCard: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadowSm },
  rowLabel: { color: T.text, fontFamily: font.semibold, fontSize: 15 },
  unitToggle: { flexDirection: 'row', backgroundColor: T.bgElev2, borderRadius: radii.pill, padding: 3 },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radii.pill },
  unitBtnOn: { backgroundColor: T.gold },
  unitBtnText: { color: T.textDim, fontFamily: font.bold, fontSize: 13 },
  unitBtnTextOn: { color: T.goldInk },

  muted: { color: T.textDim, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  accent: { color: T.gold, fontFamily: font.bold },
  pbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, gap: 10 },
  pbEx: { color: T.text, fontFamily: font.medium, fontSize: 14, flexShrink: 1 },
  pbVal: { color: T.textDim, fontFamily: font.semibold, fontSize: 13 },
  pbE1: { color: T.goldLt, fontFamily: font.bold },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  splitDay: { color: T.text, fontFamily: font.semibold, fontSize: 15, flexShrink: 1 },
  splitMeta: { color: T.textFaint, fontFamily: font.medium, fontSize: 12 },
  primaryBtn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  primaryBtnText: { color: T.goldInk, fontFamily: font.bold, fontSize: 15 },
});
