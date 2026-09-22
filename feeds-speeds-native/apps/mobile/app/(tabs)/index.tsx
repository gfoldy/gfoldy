import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  computeFeedsSpeeds, MACHINES, MATERIALS, TOOL_MATERIALS, TOOL_TYPES, OPERATIONS, COATINGS, OUTCOME_META,
  scallopFromStepover, stepoverFromScallop, finishGrade,
  type CalcInput, type UnitSystem, type Aggressiveness, type Operation, type CutOutcome,
} from '@feedspeed/core';
import { useStore, type SavedTool } from '../../src/store/store';
import { T, radii } from '../../src/theme';
import {
  Card, Title, Muted, Section, Select, Segmented, NumberField, Notice, Stat, Button,
  type SelectOption,
} from '../../src/components/ui';
import { pick, lenUnit, feedUnit, speedUnit, fmtMinutes } from '../../src/lib/format';

// Options from core data.
const machineOpts: SelectOption[] = Object.entries(MACHINES).map(([key, m]) => ({ key, label: m.label }));
const toolTypeOpts: SelectOption[] = Object.entries(TOOL_TYPES).map(([key, t]) => ({ key, label: t.label }));
const toolMatOpts: SelectOption[] = Object.entries(TOOL_MATERIALS).map(([key, t]) => ({ key, label: t.label }));
const materialOpts: SelectOption[] = Object.entries(MATERIALS).map(([key, m]) => ({ key, label: m.label, group: m.group }));
const operationOpts: SelectOption[] = Object.entries(OPERATIONS).map(([key, o]) => ({ key, label: o.label }));
const coatingOpts: SelectOption[] = Object.entries(COATINGS).map(([key, c]) => ({ key, label: c.label }));
const OUTCOME_KEYS = Object.keys(OUTCOME_META) as CutOutcome[];

function convertStr(v: string, from: UnitSystem, to: UnitSystem): string {
  if (from === to) return v;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  const out = to === 'mm' ? n * 25.4 : n / 25.4;
  return String(Math.round(out * (to === 'mm' ? 100 : 10000)) / (to === 'mm' ? 100 : 10000));
}

export default function Calculator() {
  const insets = useSafeAreaInsets();
  const { settings, setSettings, tools, addTool, addJob, getCalibration, logOutcome } = useStore();
  const unit = settings.unit;

  const [machineKey, setMachineKey] = useState('router_hobby');
  const [toolTypeKey, setToolTypeKey] = useState('endmill');
  const [toolMaterialKey, setToolMaterialKey] = useState('carbide');
  const [coatingKey, setCoatingKey] = useState('none');
  const [materialKey, setMaterialKey] = useState('alu_6061');
  const [operation, setOperation] = useState<Operation>('roughing');
  const [diameter, setDiameter] = useState('0.25');
  const [flutes, setFlutes] = useState('2');
  const [stickout, setStickout] = useState('');
  const [toolPrice, setToolPrice] = useState('');
  const [shopRate, setShopRate] = useState(settings.machineRate != null ? String(settings.machineRate) : '');
  const [volume, setVolume] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [finishMode, setFinishMode] = useState<'scallop' | 'stepover'>('scallop');
  const [finishValue, setFinishValue] = useState('0.5');

  const isDrill = TOOL_TYPES[toolTypeKey]?.model === 'drilling';
  const isBall = toolTypeKey === 'ballnose';
  const num = (s: string) => (s.trim() === '' ? undefined : parseFloat(s));
  const roundTo = (x: number, dp: number) => { const f = Math.pow(10, dp); return Math.round(x * f) / f; };
  const cal = getCalibration(materialKey);

  // Ball-nose surface finish (pure geometry from tool diameter + stepover).
  const ballFinish = useMemo(() => {
    if (!isBall) return null;
    const dIn = unit === 'mm' ? parseFloat(diameter) / 25.4 : parseFloat(diameter);
    const v = parseFloat(finishValue);
    if (!(dIn > 0) || Number.isNaN(v)) return null;
    let scallopIn: number, stepoverIn: number;
    if (finishMode === 'scallop') {
      scallopIn = unit === 'mm' ? v / 25.4 : v / 1000; // metric: mm, imperial: thou
      stepoverIn = stepoverFromScallop(dIn, scallopIn);
    } else {
      stepoverIn = unit === 'mm' ? v / 25.4 : v;
      scallopIn = scallopFromStepover(dIn, stepoverIn);
    }
    return { scallopIn, stepoverIn, grade: finishGrade(scallopIn), pct: Math.round((stepoverIn / dIn) * 100) };
  }, [isBall, unit, diameter, finishValue, finishMode]);

  const input: CalcInput = useMemo(() => ({
    machineKey, materialKey, toolMaterialKey, toolTypeKey,
    diameter: parseFloat(diameter),
    unit,
    flutes: parseInt(flutes, 10) || TOOL_TYPES[toolTypeKey]?.defaultFlutes || 2,
    stickout: num(stickout),
    operation: isDrill ? 'roughing' : operation,
    aggressiveness: settings.aggressiveness,
    chipThinning: settings.chipThinning,
    coatingKey,
    lifeCalibration: cal.factor,
    toolPrice: num(toolPrice),
    machineRate: num(shopRate),
    removeVolume: num(volume),
  }), [machineKey, materialKey, toolMaterialKey, toolTypeKey, coatingKey, cal.factor, diameter, unit, flutes, stickout, operation, isDrill, settings, toolPrice, shopRate, volume]);

  const r = useMemo(() => computeFeedsSpeeds(input), [input]);

  function toggleUnit(next: UnitSystem) {
    if (next === unit) return;
    setDiameter((d) => convertStr(d, unit, next));
    setStickout((s) => convertStr(s, unit, next));
    // Scallop values are held in thou (imperial) vs mm (metric); stepover in in vs mm.
    setFinishValue((v) => {
      const n = parseFloat(v);
      if (Number.isNaN(n)) return v;
      if (finishMode === 'scallop') {
        const out = next === 'mm' ? n * 0.0254 : n / 0.0254; // thou <-> mm
        return String(Math.round(out * (next === 'mm' ? 1000 : 100)) / (next === 'mm' ? 1000 : 100));
      }
      return convertStr(v, unit, next); // in <-> mm
    });
    setSettings({ unit: next });
  }

  function saveShopRate(v: string) {
    setShopRate(v);
    setSettings({ machineRate: v.trim() === '' ? undefined : parseFloat(v) });
  }

  function loadTool(t: SavedTool) {
    setToolTypeKey(t.toolTypeKey);
    setToolMaterialKey(t.toolMaterialKey);
    setCoatingKey(t.coatingKey ?? 'none');
    setDiameter(String(t.unit === unit ? t.diameter : parseFloat(convertStr(String(t.diameter), t.unit, unit))));
    setFlutes(String(t.flutes));
    setStickout(t.stickout == null ? '' : String(t.stickout));
    setToolPrice(t.price == null ? '' : String(t.price));
    flash(`Loaded ${t.name}`);
  }

  function onLogOutcome(outcome: CutOutcome) {
    const next = logOutcome(materialKey, outcome);
    setShowLog(false);
    flash(`Logged — ${MATERIALS[materialKey]?.label} life ×${next.factor}`);
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
      name, toolTypeKey, toolMaterialKey, coatingKey, diameter: dia, unit,
      flutes: parseInt(flutes, 10) || 2,
      stickout: num(stickout),
      price: num(toolPrice),
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
        <View style={{ height: 12 }} />
        <Select label="Coating" value={coatingKey} options={coatingOpts} onChange={setCoatingKey} />
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

      {/* Ball-nose finish (surfacing) */}
      {isBall ? (
        <>
          <Section>Ball-nose finish</Section>
          <Card>
            <Segmented<'scallop' | 'stepover'>
              options={[{ key: 'scallop', label: 'Set scallop' }, { key: 'stepover', label: 'Set stepover' }]}
              value={finishMode}
              onChange={setFinishMode}
            />
            <View style={{ height: 12 }} />
            <NumberField
              label={finishMode === 'scallop' ? 'Target scallop (surface finish)' : 'Stepover between passes'}
              value={finishValue}
              onChange={setFinishValue}
              suffix={finishMode === 'scallop' ? (unit === 'mm' ? 'mm' : 'thou') : lenUnit(unit)}
            />
            {ballFinish ? (
              <>
                <View style={{ height: 12 }} />
                <View style={styles.stats}>
                  {finishMode === 'scallop' ? (
                    <Stat label="Stepover" tone="accent"
                      value={unit === 'mm' ? String(roundTo(ballFinish.stepoverIn * 25.4, 2)) : String(roundTo(ballFinish.stepoverIn, 4))}
                      unit={lenUnit(unit)} sub={`${ballFinish.pct}% of Ø`} />
                  ) : (
                    <Stat label="Scallop height" tone="accent"
                      value={unit === 'mm' ? String(roundTo(ballFinish.scallopIn * 25.4, 3)) : String(roundTo(ballFinish.scallopIn * 1000, 2))}
                      unit={unit === 'mm' ? 'mm' : 'thou'} sub={`${ballFinish.pct}% stepover`} />
                  )}
                </View>
                <Notice tone="info">
                  {ballFinish.grade.label}
                  {finishMode === 'stepover'
                    ? ` · scallop ${unit === 'mm' ? roundTo(ballFinish.scallopIn * 25.4, 3) + ' mm' : roundTo(ballFinish.scallopIn * 1000, 2) + ' thou'}`
                    : ''}
                </Notice>
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Tooling & cost (optional) */}
      <Section>Tooling &amp; cost <Text style={styles.optional}>· optional</Text></Section>
      <Card>
        <View style={styles.row}>
          <NumberField label="Tool price" value={toolPrice} onChange={setToolPrice} suffix="$" placeholder="40" />
          <NumberField label="Shop rate" value={shopRate} onChange={saveShopRate} suffix="$/hr" placeholder="75" />
        </View>
        <View style={{ height: 12 }} />
        <NumberField label={`Volume to remove (${unit === 'mm' ? 'cm³' : 'in³'}) — for a per-job estimate`} value={volume} onChange={setVolume} suffix={unit === 'mm' ? 'cm³' : 'in³'} placeholder="e.g. 2" />
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

          {/* Tool life & economics */}
          {(r.toolLifeMin != null || r.costPerCuin != null || r.jobTimeMin != null) ? (
            <>
              <Section>Tool life &amp; cost</Section>
              <View style={styles.stats}>
                {r.toolLifeMin != null ? <Stat label="Tool life" value={fmtMinutes(r.toolLifeMin)}
                  tone={r.toolLifeMin < 5 ? 'warn' : 'default'}
                  sub={cal.samples > 1 ? `tuned ×${r.lifeCalibration} · ${cal.samples - 1} log${cal.samples - 1 === 1 ? '' : 's'}`
                    : r.coatingLifeMult != null && r.coatingLifeMult !== 1 ? `coating ×${r.coatingLifeMult}`
                    : 'cutting, at this speed'} /> : null}
                {r.costPerCuin != null ? <Stat label="Cost / volume"
                  value={`$${unit === 'mm' ? r.costPerCc : r.costPerCuin}`} sub={`per ${unit === 'mm' ? 'cm³' : 'in³'} removed`} /> : null}
                {r.jobTimeMin != null ? <Stat label="Job time" value={fmtMinutes(r.jobTimeMin)} sub="cutting time" /> : null}
                {r.jobCost != null ? <Stat label="Job cost" value={`$${r.jobCost}`} tone="accent" sub="machine + tooling" /> : null}
                {r.toolWearPct != null ? <Stat label="Tool wear" value={`${r.toolWearPct}%`}
                  tone={r.toolWearPct > 100 ? 'warn' : 'default'}
                  sub={r.toolsPerJob != null && r.toolsPerJob >= 1 ? `≈ ${Math.ceil(r.toolsPerJob)} tools` : 'of one tool'} /> : null}
              </View>
            </>
          ) : null}

          {r.notes.map((n, i) => <Notice key={`n${i}`} tone="info">{n}</Notice>)}
          {r.thinningApplied ? <Notice tone="info">Chip-thinning applied: feed raised ×{r.thinningFactor} for the light stepover.</Notice> : null}
          {r.warnings.map((w, i) => <Notice key={`w${i}`} tone="warn">{w}</Notice>)}

          <View style={{ height: 14 }} />
          <View style={styles.row}>
            <Button title="Save tool" tone="ghost" onPress={onSaveTool} style={{ flex: 1 }} />
            <Button title="Save job" tone="accent" onPress={onSaveJob} style={{ flex: 1 }} />
          </View>
          {r.toolLifeMin != null ? (
            <>
              <View style={{ height: 10 }} />
              <Button title="Log how this cut went →" tone="ghost" onPress={() => setShowLog(true)} />
            </>
          ) : null}
        </>
      )}

      <Muted style={{ marginTop: 22, fontSize: 12 }}>
        Starting points only — real feeds &amp; speeds depend on coating, stick-out, work holding and coolant.
        Start safe, trust your ears and chips, and defer to the tool maker's data.
      </Muted>

      <Modal visible={showLog} transparent animationType="slide" onRequestClose={() => setShowLog(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowLog(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>How did the {MATERIALS[materialKey]?.label} cut go?</Text>
          <Muted style={{ marginBottom: 12 }}>
            This tunes the tool-life estimate for {MATERIALS[materialKey]?.label} toward what you actually see
            {cal.samples > 1 ? ` (currently ×${cal.factor} from ${cal.samples - 1} log${cal.samples - 1 === 1 ? '' : 's'})` : ''}.
          </Muted>
          {OUTCOME_KEYS.map((k) => (
            <Pressable key={k} style={styles.outcome} onPress={() => onLogOutcome(k)}>
              <Text style={styles.outcomeLabel}>{OUTCOME_META[k].label}</Text>
              <Text style={styles.outcomeHint}>{OUTCOME_META[k].hint}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
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
  optional: { color: T.textFaint, fontFamily: 'Manrope_500Medium', fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.bgElev,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, paddingBottom: 34, paddingTop: 10,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: T.borderStrong, marginBottom: 12 },
  sheetTitle: { color: T.text, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 17, marginBottom: 6 },
  outcome: {
    backgroundColor: T.bgElev2, borderRadius: radii.md, borderWidth: 1, borderColor: T.border,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8,
  },
  outcomeLabel: { color: T.text, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 15 },
  outcomeHint: { color: T.textDim, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
});
