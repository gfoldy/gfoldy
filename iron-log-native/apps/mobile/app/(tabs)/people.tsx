import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, type PublicProfile } from '../../src/lib/api';
import { T, radii } from '../../src/theme';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.people().then(setPeople).catch(() => setErr('offline'));
  }, []);

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.title}>People</Text>
      {err && (
        <View style={styles.card}>
          <Text style={styles.muted}>The social layer runs on the Next.js API. It's live once the API is deployed to Vercel and you're signed in — until then, Iron Log works fully offline.</Text>
        </View>
      )}
      {people?.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.name}>{p.display_name} <Text style={styles.user}>@{p.username}</Text></Text>
          {p.stats && <Text style={styles.meta}>{p.stats.sessions} sessions · {p.stats.sets} sets</Text>}
        </View>
      ))}
      {people && people.length === 0 && <Text style={styles.muted}>No members yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: T.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 16 },
  muted: { color: T.textFaint, fontSize: 14, lineHeight: 20 },
  row: { backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  name: { color: T.text, fontSize: 15, fontWeight: '700' },
  user: { color: T.textFaint, fontWeight: '400' },
  meta: { color: T.textDim, fontSize: 12, marginTop: 4 },
});
