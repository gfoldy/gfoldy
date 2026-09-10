import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCloud } from '../../src/lib/cloud';
import { AccountSheet } from '../../src/components/AccountSheet';
import { Feed } from '../../src/components/Feed';
import { Directory } from '../../src/components/Directory';
import { Groups } from '../../src/components/Groups';
import { T, radii } from '../../src/theme';

type Mode = 'feed' | 'people' | 'groups';

export default function PeopleScreen() {
  const cloud = useCloud();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('feed');
  const [account, setAccount] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: 8 }}>
      <View style={styles.header}>
        <Text style={styles.title}>People</Text>
        <Pressable style={styles.acct} onPress={() => setAccount(true)}>
          <Ionicons name="person-circle-outline" size={20} color={cloud.user ? T.gold : T.textDim} />
          <Text style={[styles.acctText, cloud.user && { color: T.gold }]}>{cloud.user ? '@' + cloud.user.username : 'Sign in'}</Text>
        </Pressable>
      </View>

      {!cloud.user ? (
        <View style={styles.signedOut}>
          <Ionicons name="people-outline" size={44} color={T.textFaint} />
          <Text style={styles.soTitle}>Train with your crew</Text>
          <Text style={styles.soBody}>Create an account to follow friends, share your split and lifts, climb the leaderboards, and join groups with their own chat. Your training keeps working offline either way.</Text>
          <Pressable style={styles.gold_btn} onPress={() => setAccount(true)}><Text style={styles.goldText}>Sign in or create an account</Text></Pressable>
        </View>
      ) : (
        <>
          <View style={styles.seg}>
            {(['feed', 'people', 'groups'] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, mode === m && styles.segOn]}>
                <Text style={[styles.segText, mode === m && styles.segTextOn]}>{m === 'feed' ? 'Feed' : m === 'people' ? 'People' : 'Groups'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: insets.bottom }}>
            {mode === 'feed' && <Feed />}
            {mode === 'people' && <Directory />}
            {mode === 'groups' && <Groups />}
          </View>
        </>
      )}

      <AccountSheet visible={account} onClose={() => setAccount(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { color: T.text, fontSize: 26, fontWeight: '800' },
  acct: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: T.border, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  acctText: { color: T.textDim, fontWeight: '700', fontSize: 13 },
  signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  soTitle: { color: T.text, fontSize: 20, fontWeight: '800' },
  soBody: { color: T.textDim, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  gold_btn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', marginTop: 8 },
  goldText: { color: T.goldInk, fontWeight: '800' },
  seg: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: T.bgElev2, alignItems: 'center' },
  segOn: { backgroundColor: T.gold },
  segText: { color: T.textDim, fontWeight: '700', fontSize: 14 },
  segTextOn: { color: T.goldInk },
});
