import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type PublicProfile } from '../../src/lib/api';
import { T, radii } from '../../src/theme';

export default function RanksScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<PublicProfile[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.ranks('volume').then(setRows).catch(() => setErr(true));
  }, []);

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.title}>Ranks</Text>
      {err && (
        <View style={styles.card}>
          <Text style={styles.muted}>Leaderboards come from the Next.js API. Deploy the API and sign in to compare estimated 1RMs, total volume and sessions with the people you follow.</Text>
        </View>
      )}
      {rows?.map((p, i) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.rank}>{i + 1}</Text>
          <Text style={styles.name}>{p.display_name}</Text>
          <Text style={styles.val}>{p.stats?.volume?.toLocaleString('en-US') ?? '—'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: T.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 16 },
  muted: { color: T.textFaint, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 8 },
  rank: { color: T.gold, fontSize: 16, fontWeight: '800', width: 22 },
  name: { color: T.text, fontSize: 15, flex: 1 },
  val: { color: T.textDim, fontSize: 14, fontWeight: '700' },
});
