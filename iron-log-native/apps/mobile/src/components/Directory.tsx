import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useCloud, type PublicProfile } from '../lib/cloud';
import { T, radii } from '../theme';
import { fmtNum } from '../lib/format';

export function Directory() {
  const cloud = useCloud();
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [err, setErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr(false);
    try {
      const [p, f] = await Promise.all([cloud.people(), cloud.follows().catch(() => [])]);
      setPeople(p);
      setFollowing(new Set(f));
    } catch { setErr(true); setPeople([]); }
  }, [cloud]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    const has = following.has(id);
    setFollowing((s) => { const n = new Set(s); has ? n.delete(id) : n.add(id); return n; });
    try { has ? await cloud.unfollow(id) : await cloud.follow(id); } catch { load(); }
  };

  if (people === null) return <ActivityIndicator color={T.gold} style={{ marginTop: 30 }} />;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} tintColor={T.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      {err && <Text style={styles.muted}>Couldn't load members. Pull to retry once the API is live.</Text>}
      {people.length === 0 && !err && <Text style={styles.muted}>No members yet.</Text>}
      {people.filter((p) => p.id !== cloud.user?.id).map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{p.display_name} <Text style={styles.user}>@{p.username}</Text></Text>
            {p.stats && <Text style={styles.meta}>{p.stats.sessions} sessions · {p.stats.sets} sets · {fmtNum(p.stats.volume)} vol</Text>}
          </View>
          <Pressable style={[styles.btn, following.has(p.id) && styles.btnOn]} onPress={() => toggle(p.id)}>
            <Text style={[styles.btnText, following.has(p.id) && styles.btnTextOn]}>{following.has(p.id) ? 'Following' : 'Follow'}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  muted: { color: T.textFaint, fontSize: 14, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  name: { color: T.text, fontSize: 15, fontWeight: '700' },
  user: { color: T.textFaint, fontWeight: '400' },
  meta: { color: T.textDim, fontSize: 12, marginTop: 4 },
  btn: { borderWidth: 1, borderColor: T.gold, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7 },
  btnOn: { backgroundColor: T.gold, borderColor: 'transparent' },
  btnText: { color: T.gold, fontWeight: '700', fontSize: 13 },
  btnTextOn: { color: T.goldInk },
});
