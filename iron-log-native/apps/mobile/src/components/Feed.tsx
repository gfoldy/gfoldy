import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useCloud, type FeedItem, type Comment } from '../lib/cloud';
import { T, radii } from '../theme';
import { fmtNum, relTime } from '../lib/format';

function feedText(it: FeedItem): string {
  const d = it.data || {};
  if (it.type === 'session') {
    const parts = [`${d.sets ?? 0} sets`];
    if (d.volume) parts.push(`${fmtNum(Number(d.volume))} ${d.unit ?? 'lb'}`);
    return `trained ${d.dayName ? String(d.dayName) + ' · ' : ''}${parts.join(' · ')}`;
  }
  if (it.type === 'pr') return `hit a PR${d.exercise ? ' on ' + String(d.exercise) : ''}`;
  if (it.type === 'join') return 'joined Iron Log';
  return it.type;
}

export function Feed() {
  const cloud = useCloud();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [err, setErr] = useState(false);
  const [thread, setThread] = useState<FeedItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr(false);
    try { setItems(await cloud.feed()); } catch { setErr(true); setItems([]); }
  }, [cloud]);

  useEffect(() => { load(); }, [load]);

  if (items === null) return <ActivityIndicator color={T.gold} style={{ marginTop: 30 }} />;

  return (
    <>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={T.gold} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {err && <Text style={styles.muted}>Couldn't load the feed. Pull to retry once the API is live.</Text>}
        {items.length === 0 && !err && <Text style={styles.muted}>No activity yet. Follow people, or sync your training from the account menu.</Text>}
        {items.map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={styles.itemHead}>
              <Text style={styles.name}>{it.display_name} <Text style={styles.user}>@{it.username}</Text></Text>
              <Text style={styles.time}>{relTime(it.created_at)}</Text>
            </View>
            <Text style={styles.body}>{feedText(it)}</Text>
            {Array.isArray(it.data?.muscles) && (it.data.muscles as string[]).length > 0 && (
              <Text style={styles.muscles}>{(it.data.muscles as string[]).join(' · ')}</Text>
            )}
            <Pressable onPress={() => setThread(it)}>
              <Text style={styles.comments}>💬 {Number(it.comment_count) || 0} {Number(it.comment_count) === 1 ? 'comment' : 'comments'}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <ThreadModal item={thread} onClose={() => setThread(null)} onCount={(id, n) => setItems((xs) => (xs ?? []).map((x) => x.id === id ? { ...x, comment_count: n } : x))} />
    </>
  );
}

function ThreadModal({ item, onClose, onCount }: { item: FeedItem | null; onClose: () => void; onCount: (id: string, n: number) => void }) {
  const cloud = useCloud();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!item) { setComments(null); return; }
    cloud.comments(item.id).then(setComments).catch(() => setComments([]));
  }, [item, cloud]);

  const send = async () => {
    if (!item || !text.trim()) return;
    const body = text.trim(); setText('');
    try {
      const saved = await cloud.addComment(item.id, body);
      setComments((c) => { const next = [...(c ?? []), saved]; onCount(item.id, next.length); return next; });
    } catch { /* ignore */ }
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.sheet}>
          <View style={styles.itemHead}>
            <Text style={styles.title}>Comments</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>Close</Text></Pressable>
          </View>
          <ScrollView style={{ maxHeight: 360 }}>
            {comments === null && <ActivityIndicator color={T.gold} />}
            {comments?.length === 0 && <Text style={styles.muted}>No comments yet. Be the first.</Text>}
            {comments?.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Text style={styles.cName}>{c.display_name} <Text style={styles.time}>{relTime(c.created_at)}</Text></Text>
                <Text style={styles.cBody}>{c.body}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.addRow}>
            <TextInput style={styles.in} value={text} onChangeText={setText} placeholder="Add a comment…" placeholderTextColor={T.textFaint} />
            <Pressable style={styles.send} onPress={send}><Text style={styles.sendText}>Post</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  muted: { color: T.textFaint, fontSize: 14, lineHeight: 20, padding: 8 },
  item: { backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: T.text, fontSize: 15, fontWeight: '700' },
  user: { color: T.textFaint, fontWeight: '400' },
  time: { color: T.textFaint, fontSize: 12 },
  body: { color: T.textDim, fontSize: 14, marginTop: 4 },
  muscles: { color: T.gold, fontSize: 12, marginTop: 4 },
  comments: { color: T.textDim, fontSize: 13, marginTop: 10 },
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  close: { color: T.textDim, fontWeight: '600' },
  comment: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  cName: { color: T.text, fontSize: 13, fontWeight: '700' },
  cBody: { color: T.textDim, fontSize: 14, marginTop: 2 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  in: { flex: 1, backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10 },
  send: { backgroundColor: T.gold, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 10 },
  sendText: { color: T.goldInk, fontWeight: '800' },
});
