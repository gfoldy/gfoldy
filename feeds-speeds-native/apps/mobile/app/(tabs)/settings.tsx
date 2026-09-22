import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { useStore } from '../../src/store/store';
import { T } from '../../src/theme';
import { Card, Section, Muted, Segmented, Button, FieldLabel } from '../../src/components/ui';
import type { UnitSystem, Aggressiveness } from '@feedspeed/core';

export default function SettingsScreen() {
  const { settings, setSettings, tools, jobs, removeTool, removeJob } = useStore();

  function clearAll() {
    tools.forEach((t) => removeTool(t.id));
    jobs.forEach((j) => removeJob(j.id));
  }

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
});
