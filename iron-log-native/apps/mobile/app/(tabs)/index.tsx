import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  type Day, type LogSet, type SetType,
  todayStr, parseDate, weekdayOf, dateToStr, addDays, WEEKDAYS_LONG, fmtShort,
  mesoStatus, lastSession, suggestNext, setTagShort, isCompleted,
} from '@ironlog/core';
import { useStore } from '../../src/db/store';
import { T, radii, shadow, shadowSm, font } from '../../src/theme';
import { fmtNum } from '../../src/lib/format';
import { Nutrition } from '../../src/components/Nutrition';

// Faint barbell motif drawn behind the hero card (stands in for a photo).
function BarbellGlyph({ size = 190, color = '#ffffff', opacity = 0.12 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <Path d="M6.5 6.5h11M6.5 4v5M17.5 4v5M2.5 6.5h2M19.5 6.5h2M6.5 17.5h11M6.5 15v5M17.5 15v5M2.5 17.5h2M19.5 17.5h2" />
    </Svg>
  );
}

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

  const name = store.profile?.name ?? 'Athlete';
  const isToday = date === todayStr();
  const primaryMuscle = groups[0]?.muscle ?? null;
  let dayDone = 0, dayTarget = 0;
  if (day) day.exercises.forEach((e) => { dayTarget += e.sets; dayDone += Math.min(e.sets, setsFor(e.name).filter(isCompleted).length); });
  const heroLabel = `${isToday ? 'Today' : WEEKDAYS_LONG[weekdayOf(date)]}${primaryMuscle ? ' · ' + primaryMuscle : ''}`;
  const heroTitle = day ? day.name : 'Rest day';
  const metaBits = [day ? `${day.exercises.length} exercises` : 'Nothing scheduled'];
  if (dayTarget > 0) metaBits.push(`${dayDone}/${dayTarget} sets`);
  if (meso && !meso.done && !meso.before) metaBits.push(`Week ${meso.week}/${meso.weeks}`);

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}>
      {/* greeting */}
      <View style={styles.greet}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{WEEKDAYS_LONG[weekdayOf(date)]} · {fmtShort(date)}</Text>
          <Text style={styles.hello}>Hi, {name}</Text>
        </View>
        <View style={styles.navRow}>
          <Pressable onPress={() => shift(-1)} style={styles.navMini} hitSlop={8}><Text style={styles.navMiniText}>‹</Text></Pressable>
          {!isToday && <Pressable onPress={() => setDate(todayStr())} style={styles.todayPill}><Text style={styles.todayPillText}>Today</Text></Pressable>}
          <Pressable onPress={() => shift(1)} style={styles.navMini} hitSlop={8}><Text style={styles.navMiniText}>›</Text></Pressable>
        </View>
      </View>

      {/* hero */}
      <View style={styles.hero}>
        <View style={styles.heroGlyph}><BarbellGlyph /></View>
        <View style={styles.heroBlob} />
        <View style={styles.heroScrim} />
        <View style={styles.heroPill}><Text style={styles.heroPillText}>{heroLabel}</Text></View>
        {meso && !meso.done && !meso.before && (
          <View style={styles.heroDots}>
            {Array.from({ length: meso.weeks }, (_, i) => {
              const n = i + 1, on = n < meso.week, now = n === meso.week;
              return <View key={i} style={[styles.hdot, on && styles.hdotOn, now && styles.hdotNow, n === meso.weeks && styles.hdotDe]} />;
            })}
          </View>
        )}
        <View style={styles.heroCap}>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroMeta}>{metaBits.join(' · ')}</Text>
        </View>
      </View>

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
  greet: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  kicker: { color: T.textFaint, fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  hello: { color: T.text, fontFamily: font.display, fontSize: 26, marginTop: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  navMini: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.bgElev, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  navMiniText: { color: T.text, fontFamily: font.bold, fontSize: 20, marginTop: -2 },
  todayPill: { paddingHorizontal: 12, height: 38, borderRadius: 12, backgroundColor: T.goldSoft, alignItems: 'center', justifyContent: 'center' },
  todayPillText: { color: T.gold, fontFamily: font.bold, fontSize: 12 },
  hero: { height: 188, borderRadius: 24, overflow: 'hidden', backgroundColor: '#232a24', ...shadow },
  heroGlyph: { position: 'absolute', right: -16, top: 14 },
  heroBlob: { position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: 120, backgroundColor: 'rgba(74,129,88,0.28)' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: 'rgba(12,20,14,0.42)' },
  heroPill: { position: 'absolute', top: 15, left: 15, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  heroPillText: { color: '#1a1a1c', fontFamily: font.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  heroDots: { position: 'absolute', top: 18, right: 16, flexDirection: 'row', gap: 5 },
  hdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  hdotOn: { backgroundColor: 'rgba(255,255,255,0.7)' },
  hdotNow: { backgroundColor: '#ffffff' },
  hdotDe: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
  heroCap: { position: 'absolute', left: 18, bottom: 16, right: 18 },
  heroTitle: { color: '#ffffff', fontFamily: font.display, fontSize: 24 },
  heroMeta: { color: 'rgba(255,255,255,0.82)', fontFamily: font.medium, fontSize: 13, marginTop: 5 },
  section: { color: T.textDim, fontFamily: 'Manrope_700Bold', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 22, marginBottom: 8 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 12, ...shadow },
  muted: { color: T.textFaint, fontFamily: 'Manrope_400Regular', fontSize: 14 },
  exercise: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  exHead: { flexDirection: 'row', alignItems: 'center' },
  exName: { color: T.text, fontFamily: 'Manrope_700Bold', fontSize: 16, fontWeight: '700' },
  exTarget: { color: T.textFaint, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: T.bgElev2 },
  badgeDone: { backgroundColor: T.greenSoft },
  badgeText: { color: T.textDim, fontWeight: '700', fontFamily: 'Manrope_700Bold', fontSize: 12 },
  badgeTextDone: { color: T.green },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6, gap: 8 },
  hist: { color: T.textDim, fontFamily: 'Manrope_400Regular', fontSize: 12, flex: 1 },
  nextChip: { borderWidth: 1, borderColor: T.border, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  nextChipUp: { backgroundColor: T.gold, borderColor: 'transparent' },
  nextChipText: { color: T.gold, fontWeight: '700', fontFamily: 'Manrope_700Bold', fontSize: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
  setRowDone: { opacity: 1 },
  snum: { color: T.textFaint, width: 18, textAlign: 'center', fontFamily: 'Manrope_400Regular', fontSize: 13 },
  input: { backgroundColor: T.bgElev2, borderRadius: radii.sm, color: T.text, paddingHorizontal: 8, paddingVertical: 8, width: 58, textAlign: 'center', fontFamily: 'Manrope_400Regular', fontSize: 15 },
  unit: { color: T.textFaint, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  tag: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  tagText: { color: T.textDim, fontFamily: 'Manrope_700Bold', fontSize: 11, fontWeight: '700' },
  check: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  checkOn: { backgroundColor: T.gold, borderColor: 'transparent' },
  checkText: { color: T.textFaint, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 16, fontWeight: '800' },
  addSet: { color: T.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 13, fontWeight: '600', marginTop: 8 },
});
