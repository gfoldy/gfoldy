import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  type Day, type LogSet, type SetType,
  todayStr, parseDate, weekdayOf, dateToStr, addDays, WEEKDAYS_LONG,
  mesoStatus, lastSession, suggestNext, setTagShort, isCompleted,
} from '@ironlog/core';
import { useStore } from '../../src/db/store';
import { T, radii } from '../../src/theme';
import { fmtNum } from '../../src/lib/format';
import { Nutrition } from '../../src/components/Nutrition';

const SET_TYPE_CYCLE: SetType[] = ['work', 'warmup', 'drop', 'failure', 'restpause', 'myo'];

export default function TodayScreen() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(todayStr());

  const unit = store.profile?.unit ?? 'lb';
  const meso = mesoStatus(store.meso, date);

  const day: Day | null = useMemo(() => {
    const wd = weekdayOf(date);
    return store.split.find((d) => d.weekday === wd) ?? store.split[0] ?? null;
  }, [store.split, date]);

  const groups = useMemo(() => {
    if (!day) return [];
    const idx: Record<string, number> = {};
    const gs: { muscle: string; items: Day['exercises'] }[] = [];
    day.exercises.forEach((e) => {
      if (!(e.muscle in idx)) { idx[e.muscle] = gs.length; gs.push({ muscle: e.muscle, items: [] }); }
      gs[idx[e.muscle]!]!.items.push(e);
    });
    return gs;
  }, [day]);

  const setsFor = (exName: string): LogSet[] =>
    store.logs.filter((l) => l.date === date && l.exercise === exName).sort((a, b) => a.setIndex - b.setIndex);

  const shift = (n: number) => setDate(dateToStr(addDays(parseDate(date), n)));

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
      {meso && (
        <View style={[styles.meso, meso.deloadDue && styles.mesoDeload]}>
          <Text style={styles.mesoText}>
            {meso.deloadDue ? '🌀 ' : meso.done ? '✅ ' : '🗓️ '}
            {meso.done ? 'Block complete' : meso.before ? 'Block starts soon' : `Week ${meso.week} of ${meso.weeks} · ${meso.phase}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {Array.from({ length: meso.weeks }, (_, i) => {
              const n = i + 1;
              const on = meso.done || n < meso.week;
              const now = n === meso.week && !meso.done;
              return <View key={i} style={[styles.dot, on && styles.dotOn, now && styles.dotNow, n === meso.weeks && styles.dotDe]} />;
            })}
          </View>
        </View>
      )}

      {/* date nav */}
      <View style={styles.dateRow}>
        <Pressable onPress={() => shift(-1)} style={styles.navBtn}><Text style={styles.navBtnText}>‹</Text></Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.weekday}>{WEEKDAYS_LONG[weekdayOf(date)]}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Pressable onPress={() => shift(1)} style={styles.navBtn}><Text style={styles.navBtnText}>›</Text></Pressable>
      </View>
      {day && <Text style={styles.dayName}>{day.name}</Text>}

      {groups.map((g) => (
        <View key={g.muscle}>
          <Text style={styles.section}>{g.muscle}</Text>
          <View style={styles.card}>
            {g.items.map((e) => (
              <ExerciseBlock
                key={e.id}
                name={e.name}
                muscle={e.muscle}
                targetSets={e.sets}
                reps={e.reps}
                unit={unit}
                logs={setsFor(e.name)}
                allLogs={store.logs}
                date={date}
                onSet={store.upsertSet}
              />
            ))}
          </View>
        </View>
      ))}

      {!day && (
        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.muted}>No training day matches this date. Build your split in the Split tab.</Text>
        </View>
      )}

      <Nutrition date={date} />
    </ScrollView>
  );
}

function ExerciseBlock(props: {
  name: string; muscle: string; targetSets: number; reps: string; unit: string;
  logs: LogSet[]; allLogs: LogSet[]; date: string;
  onSet: ReturnType<typeof useStore>['upsertSet'];
}) {
  const { name, muscle, targetSets, reps, unit, logs, allLogs, date, onSet } = props;
  const maxIdx = logs.reduce((m, l) => Math.max(m, l.setIndex), -1);
  const rows = Math.max(targetSets, maxIdx + 1);
  const doneCount = logs.filter(isCompleted).length;
  const ls = lastSession(allLogs, name, date);
  const sug = suggestNext(allLogs, name, reps, date, unit as 'lb' | 'kg');

  return (
    <View style={styles.exercise}>
      <View style={styles.exHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{name}</Text>
          <Text style={styles.exTarget}>{targetSets} × {reps || '—'}</Text>
        </View>
        <View style={[styles.badge, doneCount >= targetSets && targetSets > 0 && styles.badgeDone]}>
          <Text style={[styles.badgeText, doneCount >= targetSets && targetSets > 0 && styles.badgeTextDone]}>{doneCount}/{targetSets}</Text>
        </View>
      </View>

      {(ls || sug) && (
        <View style={styles.metaRow}>
          <Text style={styles.hist} numberOfLines={1}>
            {ls ? `Last · ${ls.sets.map((s) => `${fmtNum(s.weight)}×${s.reps}`).join(', ')}` : 'First time — log your working weight'}
          </Text>
          {sug && (
            <Pressable
              style={[styles.nextChip, sug.up && styles.nextChipUp]}
              onPress={() => onSet(date, name, muscle, 0, { weight: sug.weight })}
            >
              <Text style={[styles.nextChipText, sug.up && { color: T.goldInk }]}>{sug.up ? '▲ ' : ''}{fmtNum(sug.weight)} {unit}</Text>
            </Pressable>
          )}
        </View>
      )}

      {Array.from({ length: rows }, (_, i) => {
        const l = logs.find((x) => x.setIndex === i);
        return (
          <SetRow key={i} idx={i} rec={l} unit={unit}
            onWeight={(v) => onSet(date, name, muscle, i, { weight: v })}
            onReps={(v) => onSet(date, name, muscle, i, { reps: v })}
            onToggle={() => { Haptics.selectionAsync(); onSet(date, name, muscle, i, { done: !(l?.done) }); }}
            onTag={() => {
              const cur = l?.type ?? 'work';
              const next = SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(cur) + 1) % SET_TYPE_CYCLE.length]!;
              onSet(date, name, muscle, i, { type: next });
            }}
          />
        );
      })}

      <Pressable onPress={() => onSet(date, name, muscle, rows, {})}><Text style={styles.addSet}>+ Add set</Text></Pressable>
    </View>
  );
}

function SetRow(props: {
  idx: number; rec: LogSet | undefined; unit: string;
  onWeight: (v: number | null) => void; onReps: (v: number | null) => void;
  onToggle: () => void; onTag: () => void;
}) {
  const { idx, rec, unit, onWeight, onReps, onToggle, onTag } = props;
  const done = !!rec?.done;
  const parse = (s: string) => { const n = parseFloat(s); return Number.isNaN(n) ? null : n; };
  return (
    <View style={[styles.setRow, done && styles.setRowDone]}>
      <Text style={styles.snum}>{idx + 1}</Text>
      <TextInput
        style={styles.input} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={T.textFaint}
        defaultValue={rec?.weight != null ? String(rec.weight) : ''} onEndEditing={(e) => onWeight(parse(e.nativeEvent.text))}
      />
      <Text style={styles.unit}>{unit}</Text>
      <TextInput
        style={styles.input} keyboardType="number-pad" placeholder="0" placeholderTextColor={T.textFaint}
        defaultValue={rec?.reps != null ? String(rec.reps) : ''} onEndEditing={(e) => onReps(parse(e.nativeEvent.text))}
      />
      <Text style={styles.unit}>reps</Text>
      <Pressable style={styles.tag} onPress={onTag}><Text style={styles.tagText}>{setTagShort(rec ?? { type: 'work', rir: null } as LogSet)}</Text></Pressable>
      <Pressable style={[styles.check, done && styles.checkOn]} onPress={onToggle}>
        <Text style={[styles.checkText, done && { color: T.goldInk }]}>✓</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  meso: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: 12, borderRadius: radii.md, backgroundColor: T.bgElev, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  mesoDeload: { borderColor: 'rgba(203,171,83,0.4)', backgroundColor: T.goldSoft },
  mesoText: { color: T.text, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: T.bgElev2, borderWidth: 1, borderColor: T.borderStrong },
  dotOn: { backgroundColor: T.goldDim, borderColor: 'transparent' },
  dotNow: { backgroundColor: T.gold, borderColor: 'transparent' },
  dotDe: { borderStyle: 'dashed', borderColor: T.goldDim },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  navBtn: { paddingHorizontal: 18, paddingVertical: 6 },
  navBtnText: { color: T.gold, fontSize: 28, fontWeight: '700' },
  weekday: { color: T.textDim, fontSize: 13 },
  date: { color: T.text, fontSize: 18, fontWeight: '700' },
  dayName: { color: T.gold, fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  section: { color: T.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 22, marginBottom: 8 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 12 },
  muted: { color: T.textFaint, fontSize: 14 },
  exercise: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  exHead: { flexDirection: 'row', alignItems: 'center' },
  exName: { color: T.text, fontSize: 16, fontWeight: '700' },
  exTarget: { color: T.textFaint, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: T.bgElev2 },
  badgeDone: { backgroundColor: T.greenSoft },
  badgeText: { color: T.textDim, fontWeight: '700', fontSize: 12 },
  badgeTextDone: { color: T.green },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6, gap: 8 },
  hist: { color: T.textDim, fontSize: 12, flex: 1 },
  nextChip: { borderWidth: 1, borderColor: T.border, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  nextChipUp: { backgroundColor: T.gold, borderColor: 'transparent' },
  nextChipText: { color: T.gold, fontWeight: '700', fontSize: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  setRowDone: { opacity: 1 },
  snum: { color: T.textFaint, width: 18, textAlign: 'center', fontSize: 13 },
  input: { backgroundColor: T.bgElev2, borderRadius: radii.sm, color: T.text, paddingHorizontal: 8, paddingVertical: 8, width: 58, textAlign: 'center', fontSize: 15 },
  unit: { color: T.textFaint, fontSize: 11 },
  tag: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  tagText: { color: T.textDim, fontSize: 11, fontWeight: '700' },
  check: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  checkOn: { backgroundColor: T.gold, borderColor: 'transparent' },
  checkText: { color: T.textFaint, fontSize: 16, fontWeight: '800' },
  addSet: { color: T.gold, fontSize: 13, fontWeight: '600', marginTop: 8 },
});
