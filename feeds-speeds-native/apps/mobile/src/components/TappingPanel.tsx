import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { computeTapping, THREADS, type UnitSystem } from '@feedspeed/core';
import { T } from '../theme';
import { Card, Section, Muted, Select, NumberField, Notice, Stat, type SelectOption } from './ui';
import { lenUnit, feedUnit } from '../lib/format';

const threadOpts: SelectOption[] = [
  ...THREADS.map((t) => ({ key: t.key, label: t.label, group: t.group })),
  { key: 'custom', label: 'Custom size…', group: 'Custom' },
];

export function TappingPanel({
  unit, materialKey, machineKey,
}: {
  unit: UnitSystem; materialKey: string; machineKey: string;
}) {
  const [threadKey, setThreadKey] = useState('1/4-20');
  const [pctThread, setPctThread] = useState('75');
  const [customMajor, setCustomMajor] = useState('');
  const [customPitch, setCustomPitch] = useState('');

  const isCustom = threadKey === 'custom';

  const res = useMemo(() => {
    let majorIn: number, pitchIn: number;
    if (isCustom) {
      const maj = parseFloat(customMajor);
      const p = parseFloat(customPitch);
      majorIn = unit === 'mm' ? maj / 25.4 : maj;
      // imperial custom pitch is entered as TPI; metric as mm.
      pitchIn = unit === 'mm' ? p / 25.4 : p > 0 ? 1 / p : NaN;
    } else {
      const th = THREADS.find((t) => t.key === threadKey);
      majorIn = th ? th.majorIn : NaN;
      pitchIn = th ? th.pitchIn : NaN;
    }
    if (!(majorIn > 0) || !(pitchIn > 0)) return null;
    return computeTapping({ majorIn, pitchIn, pctThread: parseFloat(pctThread) || 75, materialKey, machineKey });
  }, [isCustom, customMajor, customPitch, threadKey, pctThread, materialKey, machineKey, unit]);

  const other = (v: { in: number; mm: number }) => (unit === 'mm' ? `${v.in}"` : `${v.mm} mm`);

  return (
    <>
      <Section>Tapping</Section>
      <Card>
        <Select label="Thread" value={threadKey} options={threadOpts} onChange={setThreadKey} />
        {isCustom ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.row}>
              <NumberField label="Major Ø" value={customMajor} onChange={setCustomMajor} suffix={lenUnit(unit)} placeholder={unit === 'mm' ? '6' : '0.25'} />
              <NumberField label={unit === 'mm' ? 'Pitch' : 'Threads / inch'} value={customPitch} onChange={setCustomPitch} suffix={unit === 'mm' ? 'mm' : 'TPI'} placeholder={unit === 'mm' ? '1.0' : '20'} />
            </View>
          </>
        ) : null}
        <View style={{ height: 12 }} />
        <NumberField label="Thread engagement" value={pctThread} onChange={setPctThread} suffix="%" placeholder="75" />
      </Card>

      <Section>Tapping results</Section>
      {!res ? (
        <Notice tone="error">Enter a thread size (major diameter and pitch).</Notice>
      ) : res.error ? (
        <Notice tone="error">{res.error}</Notice>
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="Tap drill" tone="accent"
              value={String(unit === 'mm' ? res.tapDrill.mm : res.tapDrill.in)} unit={lenUnit(unit)}
              sub={other(res.tapDrill)} />
            <Stat label="Spindle speed" value={res.rpm.toLocaleString()} unit="RPM"
              tone={res.rpmClamped || res.rpmFloored ? 'warn' : 'default'} sub={`${res.sfm} SFM tapping`} />
            <Stat label="Feed rate" value={String(unit === 'mm' ? res.feedMmpm : res.feedIpm)} unit={feedUnit(unit)}
              sub={`${unit === 'mm' ? res.feedPerRev.mm : res.feedPerRev.in} ${lenUnit(unit)}/rev = pitch`} />
          </View>
          <Muted style={{ marginTop: 12 }}>
            {res.pctThread}% thread{res.tpi ? ` · ${res.tpi} TPI` : ''} · feed is locked to the pitch.
          </Muted>
          {res.notes.map((n, i) => <Notice key={`n${i}`} tone="info">{n}</Notice>)}
          {res.warnings.map((w, i) => <Notice key={`w${i}`} tone="warn">{w}</Notice>)}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
