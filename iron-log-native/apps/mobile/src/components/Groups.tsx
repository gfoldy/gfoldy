import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { useCloud, type Group } from '../lib/cloud';
import { GroupDetail } from './GroupDetail';
import { T, radii } from '../theme';

export function Groups() {
  const cloud = useCloud();
  const [mine, setMine] = useState<Group[] | null>(null);
  const [pub, setPub] = useState<Group[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([cloud.groups('mine'), cloud.groups('public').catch(() => [])]);
      setMine(m); setPub(p);
    } catch { setMine([]); }
  }, [cloud]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    const g = await cloud.createGroup(name.trim(), desc.trim(), isPublic);
    setCreating(false); setName(''); setDesc('');
    await load();
    setOpenId(g.id);
  };

  if (mine === null) return <ActivityIndicator color={T.gold} style={{ marginTop: 30 }} />;

  const mineIds = new Set(mine.map((g) => g.id));
  const discover = pub.filter((g) => !mineIds.has(g.id));

  return (
    <>
      <ScrollView>
        <Pressable style={styles.create} onPress={() => setCreating(true)}><Text style={styles.createText}>+ Create a group</Text></Pressable>

        <Text style={styles.h}>Your groups</Text>
        {mine.length === 0 && <Text style={styles.muted}>You're not in any groups yet.</Text>}
        {mine.map((g) => <GroupRow key={g.id} g={g} onPress={() => setOpenId(g.id)} />)}

        <Text style={styles.h}>Discover</Text>
        {discover.length === 0 && <Text style={styles.muted}>No public groups to join right now.</Text>}
        {discover.map((g) => <GroupRow key={g.id} g={g} onPress={() => setOpenId(g.id)} />)}
      </ScrollView>

      <GroupDetail groupId={openId} onClose={() => setOpenId(null)} onChanged={load} />

      <Modal visible={creating} transparent animationType="slide" onRequestClose={() => setCreating(false)}>
        <View style={styles.wrap}>
          <View style={styles.sheet}>
            <Text style={styles.title}>New group</Text>
            <TextInput style={styles.in} value={name} onChangeText={setName} placeholder="Group name" placeholderTextColor={T.textFaint} />
            <TextInput style={styles.in} value={desc} onChangeText={setDesc} placeholder="Description (optional)" placeholderTextColor={T.textFaint} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.swLabel}>Public</Text>
                <Text style={styles.swSub}>{isPublic ? 'Anyone can find and join' : 'Invite-only (share the code)'}</Text>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: T.goldDim, false: T.bgElev2 }} thumbColor={isPublic ? T.gold : T.textFaint} />
            </View>
            <Pressable style={styles.gold_btn} onPress={create}><Text style={styles.goldText}>Create</Text></Pressable>
            <Pressable style={styles.cancel} onPress={() => setCreating(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function GroupRow({ g, onPress }: { g: Group; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{g.name} {!g.is_public && <Text style={styles.lock}>🔒</Text>}</Text>
        {g.description ? <Text style={styles.rowDesc} numberOfLines={1}>{g.description}</Text> : null}
      </View>
      <Text style={styles.count}>{g.member_count ?? 0} 👥</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  create: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginBottom: 6 },
  createText: { color: T.goldInk, fontWeight: '800' },
  h: { color: T.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  muted: { color: T.textFaint, fontSize: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  name: { color: T.text, fontSize: 15, fontWeight: '700' },
  lock: { fontSize: 12 },
  rowDesc: { color: T.textDim, fontSize: 12, marginTop: 3 },
  count: { color: T.textDim, fontSize: 13 },
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  title: { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  in: { backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  swLabel: { color: T.text, fontSize: 15, fontWeight: '600' },
  swSub: { color: T.textFaint, fontSize: 12, marginTop: 2 },
  gold_btn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  goldText: { color: T.goldInk, fontWeight: '800' },
  cancel: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  cancelText: { color: T.textDim, fontWeight: '600' },
});
