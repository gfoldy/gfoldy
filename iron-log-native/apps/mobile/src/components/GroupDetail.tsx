import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useCloud, type Group, type GroupMember, type GroupMessage } from '../lib/cloud';
import { T, radii } from '../theme';
import { relTime } from '../lib/format';

export function GroupDetail({ groupId, onClose, onChanged }: { groupId: string | null; onClose: () => void; onChanged: () => void }) {
  const cloud = useCloud();
  const [detail, setDetail] = useState<{ group: Group; members: GroupMember[]; isMember: boolean } | null>(null);
  const [messages, setMessages] = useState<GroupMessage[] | null>(null);
  const [tab, setTab] = useState<'chat' | 'members'>('chat');
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    const d = await cloud.group(groupId);
    setDetail(d);
    if (d.isMember) { try { setMessages(await cloud.groupMessages(groupId)); } catch { setMessages([]); } }
  }, [groupId, cloud]);

  useEffect(() => { if (groupId) { setDetail(null); setMessages(null); setTab('chat'); load(); } }, [groupId, load]);

  const send = async () => {
    if (!groupId || !text.trim()) return;
    const body = text.trim(); setText('');
    try {
      const saved = await cloud.sendMessage(groupId, body);
      setMessages((m) => [...(m ?? []), saved]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch { /* ignore */ }
  };

  const join = async () => { if (!groupId || !detail) return; await cloud.joinGroup(groupId, detail.group.invite_code); await load(); onChanged(); };
  const leave = async () => { if (!groupId) return; await cloud.leaveGroup(groupId); onChanged(); onClose(); };

  const g = detail?.group;

  return (
    <Modal visible={!!groupId} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Pressable onPress={onClose}><Text style={styles.back}>‹ Back</Text></Pressable>
          <Text style={styles.title} numberOfLines={1}>{g?.name ?? 'Group'}</Text>
          <View style={{ width: 48 }} />
        </View>

        {!detail ? <ActivityIndicator color={T.gold} style={{ marginTop: 40 }} /> : (
          <>
            {g?.description ? <Text style={styles.desc}>{g.description}</Text> : null}
            {!detail.isMember ? (
              <View style={{ padding: 16 }}>
                <Text style={styles.muted}>{detail.members.length} member{detail.members.length === 1 ? '' : 's'}</Text>
                <Pressable style={styles.gold_btn} onPress={join}><Text style={styles.goldText}>Join group</Text></Pressable>
              </View>
            ) : (
              <>
                <View style={styles.tabs}>
                  {(['chat', 'members'] as const).map((t) => (
                    <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
                      <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'chat' ? 'Chat' : `Members (${detail.members.length})`}</Text>
                    </Pressable>
                  ))}
                </View>

                {tab === 'chat' ? (
                  <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
                    <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
                      {messages === null && <ActivityIndicator color={T.gold} />}
                      {messages?.length === 0 && <Text style={styles.muted}>No messages yet — say hey 👋</Text>}
                      {messages?.map((m) => {
                        const mine = m.user_id === cloud.user?.id;
                        return (
                          <View key={m.id} style={[styles.bubbleRow, mine && { alignItems: 'flex-end' }]}>
                            {!mine && <Text style={styles.msgName}>{m.display_name}</Text>}
                            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                              <Text style={[styles.msgText, mine && { color: T.goldInk }]}>{m.body}</Text>
                            </View>
                            <Text style={styles.msgTime}>{relTime(m.created_at)}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.chatBar}>
                      <TextInput style={styles.chatIn} value={text} onChangeText={setText} placeholder="Message…" placeholderTextColor={T.textFaint} onSubmitEditing={send} />
                      <Pressable style={styles.send} onPress={send}><Text style={styles.sendText}>Send</Text></Pressable>
                    </View>
                  </KeyboardAvoidingView>
                ) : (
                  <ScrollView contentContainerStyle={{ padding: 14 }}>
                    {g?.invite_code ? (
                      <View style={styles.invite}>
                        <Text style={styles.inviteLabel}>Invite code</Text>
                        <Text style={styles.inviteCode}>{g.invite_code}</Text>
                      </View>
                    ) : null}
                    {detail.members.map((m) => (
                      <View key={m.user_id} style={styles.memberRow}>
                        <Text style={styles.name}>{m.display_name} <Text style={styles.user}>@{m.username}</Text></Text>
                        {m.user_id === g?.owner_id && <Text style={styles.owner}>owner</Text>}
                      </View>
                    ))}
                    <Pressable style={styles.leave} onPress={leave}><Text style={styles.leaveText}>Leave group</Text></Pressable>
                  </ScrollView>
                )}
              </>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  back: { color: T.gold, fontSize: 16, fontWeight: '600', width: 60 },
  title: { color: T.text, fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  desc: { color: T.textDim, fontSize: 13, padding: 14 },
  muted: { color: T.textFaint, fontSize: 14, padding: 8 },
  gold_btn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  goldText: { color: T.goldInk, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: T.bgElev2 },
  tabOn: { backgroundColor: T.gold },
  tabText: { color: T.textDim, fontWeight: '600', fontSize: 13 },
  tabTextOn: { color: T.goldInk },
  bubbleRow: { marginBottom: 10 },
  msgName: { color: T.textFaint, fontSize: 11, marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOther: { backgroundColor: T.bgElev, borderWidth: 1, borderColor: T.border },
  bubbleMine: { backgroundColor: T.gold },
  msgText: { color: T.text, fontSize: 14 },
  msgTime: { color: T.textFaint, fontSize: 10, marginTop: 2, marginHorizontal: 4 },
  chatBar: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  chatIn: { flex: 1, backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10 },
  send: { backgroundColor: T.gold, borderRadius: radii.pill, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: T.goldInk, fontWeight: '800' },
  invite: { backgroundColor: T.goldSoft, borderRadius: radii.md, padding: 12, marginBottom: 14 },
  inviteLabel: { color: T.textDim, fontSize: 12 },
  inviteCode: { color: T.goldLt, fontSize: 18, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  name: { color: T.text, fontSize: 15, fontWeight: '600' },
  user: { color: T.textFaint, fontWeight: '400' },
  owner: { color: T.gold, fontSize: 11, fontWeight: '700' },
  leave: { borderWidth: 1, borderColor: T.red, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 20 },
  leaveText: { color: T.red, fontWeight: '700' },
});
