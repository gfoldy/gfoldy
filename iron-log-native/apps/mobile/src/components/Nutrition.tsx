// Nutrition card for the Today screen: daily calorie + protein totals against
// goals, a quick-add row, entry list, and a protein-goal streak. Device-local.

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { parseDate, dateToStr, addDays } from '@ironlog/core';
import { useStore } from '../db/store';
import { T, radii } from '../theme';
import { fmtNum } from '../lib/format';

export function Nutrition({ date }: { date: string }) {
  const store = useStore();
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [label, setLabel] = useState('');
  const [editGoals, setEditGoals] = useState(false);
  const [gCal, setGCal] = useState(String(store.goals?.cal || ''));
  const [gProt, setGProt] = useState(String(store.goals?.prot || ''));

  const meals = store.meals.filter((m) => m.date === date).sort((a, b) => a.createdAt - b.createdAt);
  const kcalSum = meals.reduce((a, m) => a + (m.kcal || 0), 0);
  const protSum = meals.reduce((a, m) => a + (m.protein || 0), 0);
  const calGoal = store.goals?.cal || 0;
  const protGoal = store.goals?.prot || 0;
  const goalsSet = calGoal > 0 || protGoal > 0;

  const proteinOn = (ds: string) => store.meals.filter((m) => m.date === ds).reduce((a, m) => a + (m.protein || 0), 0);
  let streak = 0;
  if (protGoal > 0) { let d = parseDate(date); while (proteinOn(dateToStr(d)) >= protGoal && streak <= 400) { streak++; d = addDays(d, -1); } }

  const add = () => {
    const k = parseFloat(kcal) || 0, p = parseFloat(protein) || 0;
    if (!k && !p) return;
    store.addMeal({ date, kcal: k, protein: p, label: label.trim() });
    setKcal(''); setProtein(''); setLabel('');
  };

  const Bar = ({ val, goal, color }: { val: number; goal: number; color: string }) => {
    const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
    const over = goal > 0 && val > goal;
    return <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: over ? T.red : color }]} /></View>;
  };

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Nutrition</Text>
        {streak > 1 && <Text style={styles.streak}>🔥 {streak}-day protein</Text>}
      </View>
      <View style={styles.card}>
        <View style={styles.nrow}>
          <Text style={styles.nlab}>Calories <Text style={styles.b}>{fmtNum(kcalSum)}</Text>{calGoal ? <Text style={styles.faint}> / {fmtNum(calGoal)}</Text> : null}</Text>
          {calGoal > 0 && <Bar val={kcalSum} goal={calGoal} color={T.gold} />}
        </View>
        <View style={styles.nrow}>
          <Text style={styles.nlab}>Protein <Text style={styles.b}>{fmtNum(protSum)}g</Text>{protGoal ? <Text style={styles.faint}> / {fmtNum(protGoal)}g</Text> : null}</Text>
          {protGoal > 0 && <Bar val={protSum} goal={protGoal} color={T.green} />}
        </View>

        <View style={styles.addRow}>
          <TextInput style={styles.inSm} value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="kcal" placeholderTextColor={T.textFaint} />
          <TextInput style={styles.inSm} value={protein} onChangeText={setProtein} keyboardType="number-pad" placeholder="protein" placeholderTextColor={T.textFaint} />
          <TextInput style={[styles.inSm, { flex: 1 }]} value={label} onChangeText={setLabel} placeholder="label" placeholderTextColor={T.textFaint} />
          <Pressable style={styles.addBtn} onPress={add}><Text style={styles.addBtnText}>Add</Text></Pressable>
        </View>

        {meals.map((m) => (
          <View key={m.id} style={styles.mealRow}>
            <Text style={styles.mealLbl}>{m.label || 'Entry'}</Text>
            <Text style={styles.mealMacros}>{m.kcal ? fmtNum(m.kcal) + ' kcal' : ''}{m.kcal && m.protein ? ' · ' : ''}{m.protein ? fmtNum(m.protein) + 'g P' : ''}</Text>
            <Pressable onPress={() => store.deleteMeal(m.id)} hitSlop={8}><Text style={styles.x}>✕</Text></Pressable>
          </View>
        ))}

        <Pressable onPress={() => { setGCal(String(store.goals?.cal || '')); setGProt(String(store.goals?.prot || '')); setEditGoals(true); }}>
          <Text style={styles.link}>{goalsSet ? 'Edit daily goals' : 'Set daily calorie & protein goals'}</Text>
        </Pressable>
      </View>

      <Modal visible={editGoals} transparent animationType="fade" onRequestClose={() => setEditGoals(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Daily goals</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Calories</Text>
                <TextInput style={styles.in} value={gCal} onChangeText={setGCal} keyboardType="number-pad" placeholder="2600" placeholderTextColor={T.textFaint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLbl}>Protein (g)</Text>
                <TextInput style={styles.in} value={gProt} onChangeText={setGProt} keyboardType="number-pad" placeholder="180" placeholderTextColor={T.textFaint} />
              </View>
            </View>
            <Pressable style={styles.saveBtn} onPress={() => { store.saveGoals({ cal: parseFloat(gCal) || 0, prot: parseFloat(gProt) || 0 }); setEditGoals(false); }}>
              <Text style={styles.saveBtnText}>Save goals</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setEditGoals(false)}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  section: { color: T.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  streak: { color: T.gold, fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 14 },
  nrow: { marginBottom: 10 },
  nlab: { color: T.text, fontSize: 14, marginBottom: 6 },
  b: { fontWeight: '800' },
  faint: { color: T.textFaint },
  track: { height: 8, backgroundColor: T.bgElev2, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  inSm: { backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 8, width: 70, fontSize: 14 },
  addBtn: { backgroundColor: T.gold, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 9 },
  addBtnText: { color: T.goldInk, fontWeight: '800', fontSize: 13 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  mealLbl: { color: T.text, fontSize: 13, flex: 1 },
  mealMacros: { color: T.textDim, fontSize: 12 },
  x: { color: T.textFaint, fontSize: 13, paddingHorizontal: 4 },
  link: { color: T.gold, fontSize: 13, fontWeight: '600', marginTop: 8 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 18 },
  modalTitle: { color: T.text, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  fieldLbl: { color: T.textDim, fontSize: 12, marginBottom: 5 },
  in: { backgroundColor: T.bgElev2, color: T.text, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 10, fontSize: 15 },
  saveBtn: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: T.goldInk, fontWeight: '800' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  cancelText: { color: T.textDim, fontWeight: '600' },
});
