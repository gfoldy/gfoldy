import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  isWorking, buildWeeks, bucketsPresent, computeSummary,
  mesoStatus, progressionPlan, laggingMuscles, targetFor, volumeZone,
  fmtShort, dateToStr,
} from '@ironlog/core';
import { useStore } from '../../src/db/store';
import { T, radii, PLAN_COLORS } from '../../src/theme';
import { fmtNum } from '../../src/lib/format';
import { LineChart } from '../../src/components/LineChart';
import { BodySheet } from '../../src/components/BodySheet';

const RANGES: (number | 'all')[] = [4, 8, 12, 'all'];

export default function ProgressScreen() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<number | 'all'>(8);
  const unit = store.profile?.unit ?? 'lb';

  const working = useMemo(() => store.logs.filter(isWorking), [store.logs]);
  const weeks = useMemo(() => buildWeeks(working, range), [working, range]);
  const buckets = useMemo(() => bucketsPresent(weeks), [weeks]);
  const summary = useMemo(() => computeSummary(store.logs), [store.logs]);
  const meso = mesoStatus(store.meso);
  const plan = useMemo(() => progressionPlan(weeks, buckets, { deload: !!meso?.deloadDue }), [weeks, buckets, meso]);
  const lag = useMemo(() => laggingMuscles(weeks, buckets), [weeks, buckets]);

  if (working.length === 0) {
    return (
      <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Progress</Text>
        <View style={styles.card}><Text style={styles.muted}>Complete a few sets on the Today tab and your stats, charts and progression plan appear here.</Text></View>
      </ScrollView>
    );
  }

  const lastWeek = weeks[weeks.length - 1]!;
  const rangeStart = dateToStr(weeks[0]!.start);
  const rangeLogs = working.filter((l) => l.date >= rangeStart);
  const nWeeks = weeks.length;

  // body chart
  const [metric, setMetric] = useState('weight');
  const [bodyOpen, setBodyOpen] = useState(false);
  const bodyPts = store.body.filter((b) => b.metric === metric && b.value != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-16)
    .map((b) => ({ label: fmtShort(b.date), y: b.value }));

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.title}>Progress</Text>

      <View style={styles.chips}>
        {RANGES.map((r) => (
          <Pressable key={String(r)} onPress={() => setRange(r)} style={[styles.chip, r === range && styles.chipOn]}>
            <Text style={[styles.chipText, r === range && styles.chipTextOn]}>{r === 'all' ? 'All' : r + 'w'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.stats}>
        <Stat v={new Set(rangeLogs.map((l) => l.date)).size} l="Sessions" />
        <Stat v={rangeLogs.length} l="Sets" />
        <Stat v={Math.round(rangeLogs.length / nWeeks)} l="Sets / wk" />
        <Stat v={fmtNum(Math.round(rangeLogs.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0)))} l={`Vol ${unit}`} />
      </View>

      {/* Mesocycle */}
      <Text style={styles.section}>Mesocycle</Text>
      <View style={styles.card}>
        {meso ? (
          <>
            <Text style={styles.mesoHead}>{meso.done || meso.before ? meso.phase : `Week ${meso.week} of ${meso.weeks} · ${meso.phase}`}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 10 }}>
              {Array.from({ length: meso.weeks }, (_, i) => {
                const n = i + 1, on = meso.done || n < meso.week, now = n === meso.week && !meso.done;
                return <View key={i} style={[styles.dotBig, on && { backgroundColor: T.goldDim }, now && { backgroundColor: T.gold }, n === meso.weeks && styles.dotDe]} />;
              })}
            </View>
            <Text style={styles.muted}>
              {meso.deloadDue ? 'Deload week — cut working sets ~40–50% and leave 3–4 reps in reserve.'
                : meso.done ? 'Block complete. Start a fresh mesocycle to keep progressing.'
                : 'Push volume and intensity — the last week is your deload.'}
            </Text>
            <Pressable style={styles.btnGhost} onPress={() => store.saveMeso(meso.done ? { start: dateToStr(new Date()), weeks: meso.weeks } : null)}>
              <Text style={styles.btnGhostText}>{meso.done ? 'Start new block' : 'Stop tracking'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.muted}>Train in blocks and get a deload nudge on the final week.</Text>
            <Pressable style={styles.btnGold} onPress={() => store.saveMeso({ start: dateToStr(new Date()), weeks: 5 })}>
              <Text style={styles.btnGoldText}>Start a 5-week block</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Weekly volume vs target */}
      <Text style={styles.section}>Weekly volume vs target</Text>
      <View style={styles.card}>
        {buckets.map((m) => {
          const sets = lastWeek.byMuscle[m] ?? 0;
          const [lo, hi] = targetFor(m);
          const zone = volumeZone(sets, m);
          const color = zone === 'optimal' ? T.green : zone === 'high' ? T.gold : '#cf9433';
          return (
            <View key={m} style={styles.barRow}>
              <Text style={styles.barLabel}>{m}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (sets / hi) * 100)}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.barVal}>{sets}<Text style={styles.barPct}> /{lo}–{hi}</Text></Text>
            </View>
          );
        })}
      </View>

      {/* Progression plan */}
      <Text style={styles.section}>Progression plan</Text>
      <View style={styles.card}>
        <View style={[styles.lagFlag, lag.length === 0 && styles.lagOk]}>
          <Text style={styles.lagText}>
            {lag.length ? `⚠️ Lagging: ${lag.map((x) => x.m).join(', ')} — under the weekly minimum lately.`
              : '✓ No lagging muscles — every trained group is at or above its weekly minimum.'}
          </Text>
        </View>
        {plan.map((p) => {
          const c = PLAN_COLORS[p.cls]!;
          return (
            <View key={p.m} style={styles.planRow}>
              <Text style={styles.planM}>{p.m}</Text>
              <View style={[styles.planRec, { backgroundColor: c.bg, borderColor: c.border }]}>
                <Text style={[styles.planRecText, { color: c.fg }]}>{p.rec}</Text>
              </View>
              <Text style={styles.planNext}>{p.nextTxt}</Text>
            </View>
          );
        })}
      </View>

      {/* Body */}
      <Text style={styles.section}>Body</Text>
      <View style={styles.card}>
        <View style={styles.chips}>
          {['weight', 'bodyfat', 'arm', 'waist'].map((k) => (
            <Pressable key={k} onPress={() => setMetric(k)} style={[styles.chip, k === metric && styles.chipOn]}>
              <Text style={[styles.chipText, k === metric && styles.chipTextOn]}>{k}</Text>
            </Pressable>
          ))}
        </View>
        {bodyPts.length >= 2
          ? <LineChart points={bodyPts} />
          : <Text style={styles.muted}>{store.body.length ? 'Log this metric on two dates to see a trend.' : 'Track bodyweight, body fat and measurements over time.'}</Text>}
        <Pressable style={styles.btnGhost} onPress={() => setBodyOpen(true)}><Text style={styles.btnGhostText}>+ Log measurements</Text></Pressable>
      </View>
      <BodySheet visible={bodyOpen} onClose={() => setBodyOpen(false)} />

      {/* PB list */}
      <Text style={styles.section}>Top lifts (est. 1RM)</Text>
      <View style={styles.card}>
        {summary.top_lifts.map((l) => (
          <View key={l.exercise} style={styles.pbRow}>
            <Text style={styles.pbEx}>{l.exercise}</Text>
            <Text style={styles.pbVal}>{fmtNum(l.weight)} {unit} × {l.reps}  ·  ~{l.e1rm}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Stat({ v, l }: { v: React.ReactNode; l: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: T.text, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  section: { color: T.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1, borderColor: T.border, padding: 14 },
  muted: { color: T.textFaint, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: T.bgElev2, borderWidth: 1, borderColor: T.border },
  chipOn: { backgroundColor: T.gold, borderColor: 'transparent' },
  chipText: { color: T.textDim, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: T.goldInk },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: T.bgElev, borderRadius: radii.md, borderWidth: 1, borderColor: T.border, paddingVertical: 12, alignItems: 'center' },
  statV: { color: T.text, fontSize: 18, fontWeight: '800' },
  statL: { color: T.textFaint, fontSize: 10, marginTop: 2 },
  mesoHead: { color: T.gold, fontSize: 16, fontWeight: '800' },
  dotBig: { width: 13, height: 13, borderRadius: 7, backgroundColor: T.bgElev2, borderWidth: 1, borderColor: T.borderStrong },
  dotDe: { borderStyle: 'dashed', borderColor: T.gold },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  barLabel: { color: T.text, fontSize: 13, width: 78 },
  barTrack: { flex: 1, height: 16, backgroundColor: T.bgElev2, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barVal: { color: T.text, fontSize: 13, fontWeight: '700', minWidth: 54, textAlign: 'right' },
  barPct: { color: T.textFaint, fontSize: 11, fontWeight: '600' },
  lagFlag: { backgroundColor: T.goldSoft, borderWidth: 1, borderColor: 'rgba(203,171,83,0.28)', borderRadius: 9, padding: 10, marginBottom: 12 },
  lagOk: { backgroundColor: T.greenSoft, borderColor: T.greenDim },
  lagText: { color: T.text, fontSize: 13, lineHeight: 18 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 5 },
  planM: { color: T.text, fontSize: 13, fontWeight: '600', width: 74 },
  planRec: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, borderWidth: 1, flexShrink: 1 },
  planRecText: { fontSize: 11, fontWeight: '700' },
  planNext: { color: T.textDim, fontSize: 12, fontWeight: '700', marginLeft: 'auto' },
  pbRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  pbEx: { color: T.text, fontSize: 14, flexShrink: 1 },
  pbVal: { color: T.textDim, fontSize: 13, fontWeight: '600' },
  btnGold: { backgroundColor: T.gold, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnGoldText: { color: T.goldInk, fontWeight: '800' },
  btnGhost: { borderWidth: 1, borderColor: T.border, borderRadius: radii.md, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnGhostText: { color: T.text, fontWeight: '700' },
});
