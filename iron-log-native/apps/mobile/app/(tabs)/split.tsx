import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Modal, TextInput, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Split, type Day, MOVEMENTS, WEEKDAYS, uid, starterSplit } from '@ironlog/core';
import { useStore } from '../../src/db/store';
import { T, radii } from '../../src/theme';

export default function SplitScreen() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState<{ dayId: string } | null>(null);
  const [query, setQuery] = useState('');

  const update = (fn: (days: Split) => Split) => store.saveSplit(fn(structuredClone(store.split)));

  const addExercise = (dayId: string, name: string, muscle: string) => {
    update((days) => {
      const d = days.find((x) => x.id === dayId);
      if (d) d.exercises.push({ id: uid(), name, muscle, sets: 3, reps: '8-10' });
      return days;
    });
    setPicker(null); setQuery('');
  };
  const removeExercise = (dayId: string, exId: string) =>
    update((days) => { const d = days.find((x) => x.id === dayId); if (d) d.exercises = d.exercises.filter((e) => e.id !== exId); return days; });
  const addDay = () =>
    update((days) => [...days, { id: uid(), name: `Day ${days.length + 1}`, weekday: null, exercises: [] }]);
  const removeDay = (dayId: string) => update((days) => days.filter((d) => d.id !== dayId));

  const filtered = MOVEMENTS.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.title}>Split</Text>

      {store.split.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.muted}>No training days yet.</Text>
          <Pressable style={styles.btnGold} onPress={() => store.saveSplit(starterSplit())}><Text style={styles.btnGoldText}>Load the Iron Log starter split</Text></Pressable>
          <Pressable style={styles.btnGhost} onPress={addDay}><Text style={styles.btnGhostText}>+ Add a day from scratch</Text></Pressable>
        </View>
      )}

      {store.split.map((d: Day) => (
        <View key={d.id} style={styles.dayCard}>
          <View style={styles.dayHead}>
            <Text style={styles.dayName}>{d.name}</Text>
            <Text style={styles.dayMeta}>{d.weekday != null ? WEEKDAYS[d.weekday] + ' · ' : ''}{d.exercises.length} ex</Text>
          </View>
          {d.exercises.map((e) => (
            <View key={e.id} style={styles.exRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{e.name}</Text>
                <Text style={styles.exMeta}>{e.muscle} · {e.sets} × {e.reps}</Text>
              </View>
              <Pressable onPress={() => removeExercise(d.id, e.id)} hitSlop={10}><Text style={styles.remove}>✕</Text></Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Pressable onPress={() => setPicker({ dayId: d.id })}><Text style={styles.addLink}>+ Add exercise</Text></Pressable>
            <Pressable onPress={() => removeDay(d.id)}><Text style={[styles.addLink, { color: T.red }]}>Delete day</Text></Pressable>
          </View>
        </View>
      ))}

      {store.split.length > 0 && (
        <Pressable style={styles.btnGhost} onPress={addDay}><Text style={styles.btnGhostText}>+ Add training day</Text></Pressable>
      )}

      <Modal visible={!!picker} animationType="slide" transparent onRequestClose={() => setPicker(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Add exercise</Text>
              <Pressable onPress={() => { setPicker(null); setQuery(''); }}><Text style={styles.remove}>Close</Text></Pressable>
            </View>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search movements…" placeholderTextColor={T.textFaint} style={styles.search} autoFocus />
            <FlatList
              data={filtered}
              keyExtractor={(m) => m.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={styles.pickRow} onPress={() => picker && addExercise(picker.dayId, item.name, item.muscle)}>
                  <Text style={styles.exName}>{item.name}</Text>
                  <Text style={styles.exMeta}>{item.muscle}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: T.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 16 },
  muted: { color: T.textFaint, fontSize: 14, marginBottom: 8 },
  dayCard: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 12 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayName: { color: T.text, fontSize: 16, fontWeight: '800' },
  dayMeta: { color: T.textFaint, fontSize: 12 },
  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  exName: { color: T.text, fontSize: 15 },
  exMeta: { color: T.textFaint, fontSize: 12, marginTop: 2 },
  remove: { color: T.textDim, fontSize: 14, fontWeight: '700', paddingHorizontal: 6 },
  addLink: { color: T.gold, fontSize: 13, fontWeight: '600' },
  btnGold: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  btnGoldText: { color: T.goldInk, fontWeight: '800' },
  btnGhost: { borderWidth: 1, borderColor: T.border, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 12, backgroundColor: T.bgElev },
  btnGhostText: { color: T.text, fontWeight: '700' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, height: '80%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: T.text, fontSize: 18, fontWeight: '800' },
  search: { backgroundColor: T.bgElev, color: T.text, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  pickRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
});
