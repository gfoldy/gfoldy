// Modal for logging bodyweight + measurements. Only filled fields are saved;
// placeholders show the last entry per metric.

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { BODY_METRICS, todayStr } from '@ironlog/core';
import { useStore } from '../db/store';
import { T, radii } from '../theme';

export function BodySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore();
  const [date, setDate] = useState(todayStr());
  const [vals, setVals] = useState<Record<string, string>>({});

  const latest = (key: string) => {
    const e = store.body.filter((b) => b.metric === (key as never) && b.value != null).sort((a, b) => (a.date < b.date ? -1 : 1));
    return e.length ? e[e.length - 1]!.value : null;
  };

  const save = () => {
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(vals)) {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) parsed[k] = n;
    }
    store.saveBody(date, parsed);
    setVals({});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Log measurements</Text>
            <Pressable onPress={onClose}><Text style={styles.close}>Close</Text></Pressable>
          </View>
          <Text style={styles.fieldLbl}>Date</Text>
          <TextInput style={styles.in} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={T.textFaint} />
          <ScrollView style={{ maxHeight: 320, marginTop: 12 }}>
            <View style={styles.grid}>
              {BODY_METRICS.map((m) => (
                <View key={m.key} style={styles.field}>
                  <Text style={styles.fieldLbl}>{m.label} ({m.unit})</Text>
                  <TextInput
                    style={styles.in}
                    keyboardType="decimal-pad"
                    value={vals[m.key] ?? ''}
                    onChangeText={(t) => setVals((s) => ({ ...s, [m.key]: t }))}
                    placeholder={latest(m.key) != null ? String(latest(m.key)) : ''}
                    placeholderTextColor={T.textFaint}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
          <Pressable style={styles.saveBtn} onPress={save}><Text style={styles.saveBtnText}>Save</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  card: { backgroundColor: T.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  close: { color: T.textDim, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { width: '47%' },
  fieldLbl: { color: T.textDim, fontSize: 12, marginBottom: 5 },
  in: { backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 10, fontSize: 15 },
  saveBtn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: T.goldInk, fontWeight: '800' },
});
