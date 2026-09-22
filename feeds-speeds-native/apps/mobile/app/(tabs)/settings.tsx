import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useStore } from '../../src/store/store';
import { T } from '../../src/theme';
import { Card, Section, Muted, Segmented, Button, FieldLabel } from '../../src/components/ui';
import { MATERIALS, type UnitSystem, type Aggressiveness } from '@feedspeed/core';

export default function SettingsScreen() {
  const { settings, setSettings, tools, jobs, removeTool, removeJob, calibrations, resetCalibrations } = useStore();

  function clearAll() {
    tools.forEach((t) => removeTool(t.id));
    jobs.forEach((j) => removeJob(j.id));
  }

  const tuned = Object.entries(calibrations).filter(([, c]) => c.samples > 1);

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Section>Defaults</Section>
      <Card>
        <FieldLabel>Units</FieldLabel>
        <Segmented<UnitSystem>
          options={[{ key: 'in', label: 'Imperial (inch)' }, { key: 'mm', label: 'Metric (mm)' }]}
          value={settings.unit}
          onChange={(k) => setSettings({ unit: k })}
        />
        <View style={{ height: 14 }} />
        <FieldLabel>Default aggressiveness</FieldLabel>
        <Segmented<string>
          options={[{ key: '0', label: 'Conservative' }, { key: '1', label: 'Nominal' }, { key: '2', label: 'Aggressive' }]}
          value={String(settings.aggressiveness)}
          onChange={(k) => setSettings({ aggressiveness: Number(k) as Aggressiveness })}
        />
        <View style={{ height: 14 }} />
        <FieldLabel>Chip thinning</FieldLabel>
        <Segmented<string>
          options={[{ key: 'on', label: 'On' }, { key: 'off', label: 'Off' }]}
          value={settings.chipThinning ? 'on' : 'off'}
          onChange={(k) => setSettings({ chipThinning: k === 'on' })}
        />
      </Card>

      <Section>Learned tool life</Section>
      <Card>
        {tuned.length === 0 ? (
          <Muted>
            No calibrations yet. After a cut, tap “Log how this cut went” on the Calculator — the tool-life
            estimate for that material learns from what you actually see.
          </Muted>
        ) : (
          <>
            {tuned.map(([key, c]) => (
              <View key={key} style={styles.calRow}>
                <Text style={styles.calMat}>{MATERIALS[key]?.label ?? key}</Text>
                <Text style={styles.calFactor}>×{c.factor} · {c.samples - 1} log{c.samples - 1 === 1 ? '' : 's'}</Text>
              </View>
            ))}
            <View style={{ height: 12 }} />
            <Button title="Reset learned calibrations" tone="danger" onPress={resetCalibrations} />
          </>
        )}
      </Card>

      <Section>Data</Section>
      <Card>
        <Muted>{tools.length} saved tool{tools.length === 1 ? '' : 's'} · {jobs.length} saved job{jobs.length === 1 ? '' : 's'}, all stored on this device.</Muted>
        <View style={{ height: 12 }} />
        <Button title="Clear saved tools & jobs" tone="danger" onPress={clearAll} />
      </Card>

      <Section>About</Section>
      <Card>
        <Text style={styles.about}>Feeds &amp; Speeds</Text>
        <Muted style={{ marginTop: 4 }}>
          Version {Constants.expoConfig?.version ?? '1.0.0'}. Machine-aware feeds &amp; speeds for milling, routing and
          drilling — with spindle-power and tool-deflection checks most calculators skip.
        </Muted>
        <Muted style={{ marginTop: 10, fontSize: 12 }}>
          All numbers are conservative starting points. Coating, work holding, coolant and machine condition all
          shift real-world results. Start safe and dial in.
        </Muted>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  about: { color: T.text, fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 20 },
  calRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hairline,
  },
  calMat: { color: T.text, fontFamily: 'Manrope_500Medium', fontSize: 14, flex: 1 },
  calFactor: { color: T.accent, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
});
