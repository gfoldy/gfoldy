import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  computeFeedsSpeeds, MACHINES, MATERIALS, TOOL_MATERIALS, TOOL_TYPES, OPERATIONS,
  type CalcInput, type UnitSystem, type Aggressiveness, type Operation,
} from '@feedspeed/core';
import { useStore, type SavedTool } from '../../src/store/store';
import { T } from '../../src/theme';
import {
  Card, Title, Muted, Section, Select, Segmented, NumberField, Notice, Stat, Button,
  type SelectOption,
} from '../../src/components/ui';
import { pick, lenUnit, feedUnit, speedUnit } from '../../src/lib/format';

// Options from core data.
const machineOpts: SelectOption[] = Object.entries(MACHINES).map(([key, m]) => ({ key, label: m.label }));
const toolTypeOpts: SelectOption[] = Object.entries(TOOL_TYPES).map(([key, t]) => ({ key, label: t.label }));
const toolMatOpts: SelectOption[] = Object.entries(TOOL_MATERIALS).map(([key, t]) => ({ key, label: t.label }));
const materialOpts: SelectOption[] = Object.entries(MATERIALS).map(([key, m]) => ({ key, label: m.label, group: m.group }));
const operationOpts: SelectOption[] = Object.entries(OPERATIONS).map(([key, o]) => ({ key, label: o.label }));

function convertStr(v: string, from: UnitSystem, to: UnitSystem): string {
  if (from === to) return v;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  const out = to === 'mm' ? n * 25.4 : n / 25.4;
  return String(Math.round(out * (to === 'mm' ? 100 : 10000)) / (to === 'mm' ? 100 : 10000));
}

export default function Calculator() {
  const insets = useSafeAreaInsets();
  const { settings, setSettings, tools, addTool, addJob } = useStore();
  const unit = settings.unit;

  const [machineKey, setMachineKey] = useState('router_hobby');
  const [toolTypeKey, setToolTypeKey] = useState('endmill');
  const [toolMaterialKey, setToolMaterialKey] = useState('carbide');
  const [materialKey, setMaterialKey] = useState('alu_6061');
  const [operation, setOperation] = useState<Operation>('roughing');
  const [diameter, setDiameter] = useState('0.25');
  const [flutes, setFlutes] = useState('2');
  const [stickout, setStickout] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const isDrill = TOOL_TYPES[toolTypeKey]?.model === 'drilling';

  const input: CalcInput = useMemo(() => ({
    machineKey, materialKey, toolMaterialKey, toolTypeKey,
    diameter: parseFloat(diameter),
    unit,
    flutes: parseInt(flutes, 10) || TOOL_TYPES[toolTypeKey]?.defaultFlutes || 2,
    stickout: stickout.trim() === '' ? undefined : parseFloat(stickout),
    operation: isDrill ? 'roughing' : operation,
    aggressiveness: settings.aggressiveness,
    chipThinning: settings.chipThinning,
  }), [machineKey, materialKey, toolMaterialKey, toolTypeKey, diameter, unit, flutes, stickout, operation, isDrill, settings]);

  const r = useMemo(() => computeFeedsSpeeds(input), [input]);

  function toggleUnit(next: UnitSystem) {
    if (next === unit) return;
    setDiameter((d) => convertStr(d, unit, next));
    setStickout((s) => convertStr(s, unit, next));
    setSettings({ unit: next });
  }

  function loadTool(t: SavedTool) {
    setToolTypeKey(t.toolTypeKey);
    setToolMaterialKey(t.toolMaterialKey);
    setDiameter(String(t.unit === unit ? t.diameter : parseFloat(convertStr(String(t.diameter), t.unit, unit))));
    setFlutes(String(t.flutes));
    setStickout(t.stickout == null ? '' : String(t.stickout));
    flash(`Loaded ${t.name}`);
  }

  function flash(msg: string) {
    setSavedMsg(msg);
    Haptics.selectionAsync().catch(() => {});
    setTimeout(() => setSavedMsg((m) => (m === msg ? null : m)), 2200);
  }

  function onSaveTool() {
    const dia = parseFloat(diameter);
    if (Number.isNaN(dia)) return;
    const firstWord = (s: string | undefined) => (s ?? '').split(' ')[0] ?? '';
    const name = `${diameter}${lenUnit(unit)} ${firstWord(TOOL_MATERIALS[toolMaterialKey]?.label)} ${firstWord(TOOL_TYPES[toolTypeKey]?.label).toLowerCase()}`;
    addTool({
      name, toolTypeKey, toolMaterialKey, diameter: dia, unit,
      flutes: parseInt(flutes, 10) || 2,
      stickout: stickout.trim() === '' ? undefined : parseFloat(stickout),
    });
    flash('Saved to My Tools');
  }

  function onSaveJob() {
    if (r.error) return;
    const name = `${r.materialLabel} · ${r.operationLabel || 'drill'} · ${diameter}${lenUnit(unit)}`;
    addJob(name, input);
    flash('Saved job');
  }

  const toolLoadOpts: SelectOption[] = tools.map((t) => ({ key: t.id, label: t.name }));

  return (
    <ScrollView
      style={{ backgroundColor: T.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Muted style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: T.accent }}>
        Feeds &amp; Speeds
      </Muted>
      <Title>Calculator</Title>

      {/* Units + aggressiveness */}
      <Section>Setup</Section>
      <Card>
        <Segmented<UnitSystem>
          options={[{ key: 'in', label: 'inch' }, { key: 'mm', label: 'mm' }]}
          value={unit}
          onChange={toggleUnit}
        />
        <View style={{ height: 12 }} />
        <Segmented<string>
          options={[{ key: '0', label: 'Conservative' }, { key: '1', label: 'Nominal' }, { key: '2', label: 'Aggressive' }]}
          value={String(settings.aggressiveness)}
          onChange={(k) => setSettings({ aggressiveness: Number(k) as Aggressiveness })}
        />
        {tools.length > 0 ? (
          <>
            <View style={{ height: 12 }} />
            <Select label="Load from My Tools" value="" options={[{ key: '', label: 'Choose a saved tool…' }, ...toolLoadOpts]}
              onChange={(id) => { const t = tools.find((x) => x.id === id); if (t) loadTool(t); }} />
          </>
        ) : null}
      </Card>

      {/* Machine */}
      <Section>Machine</Section>
      <Card>
        <Select value={machineKey} options={machineOpts} onChange={setMachineKey} />
      </Card>

      {/* Tool */}
      <Section>Tool</Section>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><Select label="Type" value={toolTypeKey} options={toolTypeOpts} onChange={setToolTypeKey} /></View>
          <View style={{ flex: 1 }}><Select label="Cutter" value={toolMaterialKey} options={toolMatOpts} onChange={setToolMaterialKey} /></View>
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <NumberField label="Diameter" value={diameter} onChange={setDiameter} suffix={lenUnit(unit)} />
          <NumberField label={isDrill ? 'Lips' : 'Flutes'} value={flutes} onChange={setFlutes} />
        </View>
        {!isDrill ? (
          <>
            <View style={{ height: 12 }} />
            <NumberField label="Stick-out (optional — enables deflection check)" value={stickout} onChange={setStickout} suffix={lenUnit(unit)} placeholder="e.g. 1.0" />
          </>
        ) : null}
      </Card>

      {/* Material + operation */}
      <Section>Material &amp; cut</Section>
      <Card>
        <Select label="Material" value={materialKey} options={materialOpts} onChange={setMaterialKey} />
        {!isDrill ? (
          <>
            <View style={{ height: 12 }} />
            <Select label="Operation" value={operation} options={operationOpts} onChange={(k) => setOperation(k as Operation)} />
          </>
        ) : null}
        <View style={{ height: 12 }} />
        <Pressable style={styles.checkRow} onPress={() => setSettings({ chipThinning: !settings.chipThinning })}>
          <View style={[styles.checkbox, settings.chipThinning && styles.checkboxOn]}>
            {settings.chipThinning ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>Apply radial chip-thinning (raise feed for light stepovers)</Text>
        </Pressable>
      </Card>

      {/* Results */}
      <Section right={savedMsg ? <Text style={styles.savedMsg}>{savedMsg}</Text> : undefined}>Results</Section>
      {r.error ? (
        <Notice tone="error">{r.error}</Notice>
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="Spindle speed" value={r.rpm.toLocaleString()} unit="RPM" tone="accent"
              sub={r.rpmClamped ? '⚠ capped at max' : r.rpmFloored ? '⚠ raised to min' : `${unit === 'mm' ? r.vcMpm : r.sfm} ${speedUnit(unit)}`} />
            <Stat label="Feed rate" value={String(unit === 'mm' ? r.feedMmpm : r.feedIpm)} unit={feedUnit(unit)}
              sub={isDrill ? `${pick(r.feedPerRev, unit)} ${lenUnit(unit)}/rev` : `${pick(r.feedPerTooth, unit)} ${lenUnit(unit)}/tooth × ${r.flutes}`} />
            {r.ap ? <Stat label="Depth of cut" value={String(pick(r.ap, unit))} unit={lenUnit(unit)} sub="axial · Ap" /> : null}
            {r.ae ? <Stat label="Width of cut" value={String(pick(r.ae, unit))} unit={lenUnit(unit)} sub={`stepover · ${r.aePercent}% of Ø`} /> : null}
            {r.mrrCuin != null ? <Stat label="Removal rate" value={String(unit === 'mm' ? r.mrrCc : r.mrrCuin)} unit={unit === 'mm' ? 'cm³/min' : 'in³/min'} sub="MRR" /> : null}
            {r.powerHp != null ? <Stat label="Spindle power" value={String(r.powerHp)} unit="hp"
              tone={r.powerPct != null && r.powerPct > 100 ? 'warn' : 'default'}
              sub={r.powerPct != null ? `${r.powerPct}% of machine` : undefined} /> : null}
            {r.deflectionIn != null ? <Stat label="Tool deflection" value={String((r.deflectionIn * 1000).toFixed(1))} unit="thou"
              tone={r.deflectionIn > 0.002 ? 'warn' : 'default'} sub="estimate at stick-out" /> : null}
          </View>

          {r.notes.map((n, i) => <Notice key={`n${i}`} tone="info">{n}</Notice>)}
          {r.thinningApplied ? <Notice tone="info">Chip-thinning applied: feed raised ×{r.thinningFactor} for the light stepover.</Notice> : null}
          {r.warnings.map((w, i) => <Notice key={`w${i}`} tone="warn">{w}</Notice>)}

          <View style={{ height: 14 }} />
          <View style={styles.row}>
            <Button title="Save tool" tone="ghost" onPress={onSaveTool} style={{ flex: 1 }} />
            <Button title="Save job" tone="accent" onPress={onSaveJob} style={{ flex: 1 }} />
          </View>
        </>
      )}

      <Muted style={{ marginTop: 22, fontSize: 12 }}>
        Starting points only — real feeds &amp; speeds depend on coating, stick-out, work holding and coolant.
        Start safe, trust your ears and chips, and defer to the tool maker's data.
      </Muted>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: T.borderStrong,
    backgroundColor: T.bgElev2, alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: T.accent, borderColor: T.accent },
  checkMark: { color: T.accentInk, fontSize: 14, fontWeight: '800' },
  checkLabel: { flex: 1, color: T.text, fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 18 },
  savedMsg: { color: T.green, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
});
