import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCloud, type PublicProfile } from '../../src/lib/cloud';
import { T, radii } from '../../src/theme';
import { fmtNum } from '../../src/lib/format';

const METRICS: { key: string; label: string }[] = [
  { key: 'volume', label: 'Volume' },
  { key: 'sets', label: 'Sets' },
  { key: 'sessions', label: 'Sessions' },
];

export default function RanksScreen() {
  const cloud = useCloud();
  const insets = useSafeAreaInsets();
  const [metric, setMetric] = useState('volume');
  const [rows, setRows] = useState<PublicProfile[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    setErr(false); setRows(null);
    try { setRows(await cloud.ranks(metric)); } catch { setErr(true); setRows([]); }
  }, [cloud, metric]);

  useEffect(() => { load(); }, [load]);

  const valueOf = (p: PublicProfile) => {
    const s = p.stats; if (!s) return '—';
    const v = metric === 'sets' ? s.sets : metric === 'sessions' ? s.sessions : s.volume;
    return fmtNum(v || 0);
  };

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.title}>Ranks</Text>
      <View style={styles.chips}>
        {METRICS.map((m) => (
          <Pressable key={m.key} onPress={() => setMetric(m.key)} style={[styles.chip, m.key === metric && styles.chipOn]}>
            <Text style={[styles.chipText, m.key === metric && styles.chipTextOn]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {err && <View style={styles.card}><Text style={styles.muted}>Leaderboards come from the Next.js API. Deploy it and sync your training to compare with other members.</Text></View>}
      {rows?.length === 0 && !err && <Text style={styles.muted}>No ranked members yet.</Text>}
      {rows?.map((p, i) => (
        <View key={p.id} style={[styles.row, p.id === cloud.user?.id && styles.rowMe]}>
          <Text style={[styles.rank, i < 3 && { color: T.gold }]}>{i + 1}</Text>
          <Text style={styles.name}>{p.display_name} <Text style={styles.user}>@{p.username}</Text></Text>
          <Text style={styles.val}>{valueOf(p)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: T.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: T.bgElev2, borderWidth: 1, borderColor: T.border },
  chipOn: { backgroundColor: T.gold, borderColor: 'transparent' },
  chipText: { color: T.textDim, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: T.goldInk },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 16 },
  muted: { color: T.textFaint, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  rowMe: { borderColor: T.goldDim },
  rank: { color: T.textDim, fontSize: 16, fontWeight: '800', width: 24 },
  name: { color: T.text, fontSize: 15, flex: 1 },
  user: { color: T.textFaint, fontSize: 12 },
  val: { color: T.textDim, fontSize: 14, fontWeight: '700' },
});
