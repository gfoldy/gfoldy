import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { TOOL_TYPES, TOOL_MATERIALS, MATERIALS, OPERATIONS } from '@feedspeed/core';
import { useStore } from '../../src/store/store';
import { T } from '../../src/theme';
import { Card, Section, Muted } from '../../src/components/ui';
import { relTime, lenUnit } from '../../src/lib/format';

export default function ToolsScreen() {
  const { tools, removeTool, jobs, removeJob } = useStore();

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Section>My tool crib</Section>
      {tools.length === 0 ? (
        <Card><Muted>No saved tools yet. On the Calculator, set a tool up and tap “Save tool” — it'll appear here and in the quick-load list.</Muted></Card>
      ) : (
        tools.map((t) => (
          <Card key={t.id} style={{ marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                <Muted style={{ marginTop: 3 }}>
                  {TOOL_MATERIALS[t.toolMaterialKey]?.label} · {TOOL_TYPES[t.toolTypeKey]?.label} · {t.flutes} flute
                  {t.stickout != null ? ` · ${t.stickout}${lenUnit(t.unit)} stick-out` : ''}
                </Muted>
              </View>
              <Pressable onPress={() => removeTool(t.id)} hitSlop={10}><Text style={styles.remove}>Remove</Text></Pressable>
            </View>
          </Card>
        ))
      )}

      <Section>Saved jobs</Section>
      {jobs.length === 0 ? (
        <Card><Muted>Save a calculation as a job to keep your dialed-in settings for a material + operation.</Muted></Card>
      ) : (
        jobs.map((j) => (
          <Card key={j.id} style={{ marginBottom: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{j.name}</Text>
                <Muted style={{ marginTop: 3 }}>
                  {MATERIALS[j.input.materialKey]?.label} · {OPERATIONS[j.input.operation]?.label ?? 'drill'} · saved {relTime(j.createdAt)}
                </Muted>
              </View>
              <Pressable onPress={() => removeJob(j.id)} hitSlop={10}><Text style={styles.remove}>Remove</Text></Pressable>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { color: T.text, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 15 },
  remove: { color: T.red, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
});
