import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useCloud } from '../lib/cloud';
import { useStore } from '../db/store';
import { runSync } from '../lib/sync';
import { T, radii } from '../theme';

export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const cloud = useCloud();
  const store = useStore();
  const [create, setCreate] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [synced, setSynced] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (create) await cloud.signup(username.trim(), password, displayName.trim() || username.trim());
      else await cloud.login(username.trim(), password);
      setPassword('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); }
    setBusy(false);
  };

  const sync = async () => {
    if (!cloud.user) return;
    setBusy(true); setErr(null); setSynced(null);
    try {
      await runSync(cloud, { split: store.split, logs: store.logs, unit: store.profile?.unit ?? 'lb', user: cloud.user });
      setSynced('Synced ' + new Date().toLocaleTimeString());
    } catch (e) { setErr(e instanceof Error ? e.message : 'Sync failed'); }
    setBusy(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>{cloud.user ? 'Account' : create ? 'Create account' : 'Sign in'}</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>Close</Text></Pressable>
          </View>

          {!cloud.configured && (
            <Text style={styles.note}>No API is configured yet (set expo.extra.apiBaseUrl). Accounts, People, Ranks and Groups turn on once the Next.js API is deployed.</Text>
          )}

          {cloud.user ? (
            <>
              <Text style={styles.hello}>Signed in as <Text style={styles.gold}>@{cloud.user.username}</Text></Text>
              <Text style={styles.note}>Push your split, logs and stats to the cloud so friends can see your progress and leaderboards.</Text>
              <Pressable style={styles.gold_btn} onPress={sync} disabled={busy}>
                {busy ? <ActivityIndicator color={T.goldInk} /> : <Text style={styles.goldText}>Sync my training</Text>}
              </Pressable>
              {synced && <Text style={styles.ok}>{synced}</Text>}
              <Pressable style={styles.ghost} onPress={() => { cloud.logout(); onClose(); }}><Text style={styles.ghostText}>Log out</Text></Pressable>
            </>
          ) : (
            <>
              <TextInput style={styles.in} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" placeholderTextColor={T.textFaint} />
              {create && <TextInput style={styles.in} value={displayName} onChangeText={setDisplayName} placeholder="display name" placeholderTextColor={T.textFaint} />}
              <TextInput style={styles.in} value={password} onChangeText={setPassword} secureTextEntry placeholder="password" placeholderTextColor={T.textFaint} />
              <Pressable style={styles.gold_btn} onPress={submit} disabled={busy}>
                {busy ? <ActivityIndicator color={T.goldInk} /> : <Text style={styles.goldText}>{create ? 'Create account' : 'Sign in'}</Text>}
              </Pressable>
              <Pressable onPress={() => { setCreate(!create); setErr(null); }}>
                <Text style={styles.link}>{create ? 'Have an account? Sign in' : 'New here? Create an account'}</Text>
              </Pressable>
            </>
          )}
          {err && <Text style={styles.err}>{err}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  card: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  close: { color: T.textDim, fontWeight: '600' },
  note: { color: T.textFaint, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  hello: { color: T.text, fontSize: 15, marginBottom: 8 },
  gold: { color: T.gold, fontWeight: '800' },
  in: { backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  gold_btn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  goldText: { color: T.goldInk, fontWeight: '800' },
  ghost: { borderWidth: 1, borderColor: T.border, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  ghostText: { color: T.text, fontWeight: '700' },
  link: { color: T.gold, textAlign: 'center', marginTop: 14, fontWeight: '600' },
  err: { color: T.red, marginTop: 12, fontSize: 13 },
  ok: { color: T.green, marginTop: 10, fontSize: 13, textAlign: 'center' },
});
