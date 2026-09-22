import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MATERIALS, type Material } from '@feedspeed/core';
import { useStore } from '../../src/store/store';
import { T } from '../../src/theme';
import { Card, Section, Muted } from '../../src/components/ui';

const SFM_PER_MPM = 1 / 0.3048;
const toMpm = (sfm: number) => Math.round(sfm / SFM_PER_MPM);

export default function ReferenceScreen() {
  const { settings } = useStore();
  const metric = settings.unit === 'mm';

  // group materials
  const groups: { group: string; items: [string, Material][] }[] = [];
  for (const [key, m] of Object.entries(MATERIALS)) {
    let g = groups.find((x) => x.group === m.group);
    if (!g) { g = { group: m.group, items: [] }; groups.push(g); }
    g.items.push([key, m]);
  }

  const fmtRange = (r: [number, number]) => metric ? `${toMpm(r[0])}–${toMpm(r[1])}` : `${r[0]}–${r[1]}`;

  return (
    <ScrollView style={{ backgroundColor: T.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Section>Cutting speeds — {metric ? 'Vc (m/min)' : 'SFM'}</Section>
      <Muted style={{ marginBottom: 8 }}>Reference surface speeds by material. HSS vs. carbide, conservative→aggressive.</Muted>

      {groups.map((g) => (
        <View key={g.group} style={{ marginBottom: 14 }}>
          <Text style={styles.group}>{g.group}</Text>
          <Card style={{ padding: 0 }}>
            <View style={[styles.tr, styles.thead]}>
              <Text style={[styles.th, { flex: 2 }]}>Material</Text>
              <Text style={[styles.th, styles.num]}>HSS</Text>
              <Text style={[styles.th, styles.num]}>Carbide</Text>
            </View>
            {g.items.map(([key, m], i) => (
              <View key={key} style={[styles.tr, i < g.items.length - 1 && styles.trBorder]}>
                <Text style={[styles.td, { flex: 2 }]}>{m.label}</Text>
                <Text style={[styles.td, styles.num, styles.dim]}>{fmtRange(m.sfm.hss)}</Text>
                <Text style={[styles.td, styles.num]}>{fmtRange(m.sfm.carbide)}</Text>
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Section>Formulas</Section>
      <Card>
        <Formula label="Spindle speed" body={metric ? 'RPM = (Vc × 1000) ÷ (π × D)' : 'RPM = (SFM × 12) ÷ (π × D)'} />
        <Formula label="Feed (milling)" body="Feed = RPM × chip load × flutes" />
        <Formula label="Feed (drilling)" body="Feed = RPM × feed per rev" />
        <Formula label="Material removal" body="MRR = Ap × Ae × feed" />
        <Formula label="Spindle power" body="hp ≈ MRR × unit-power ÷ efficiency" />
        <Formula label="Chip thinning" body="Fz ×= 1 ÷ (2√(r − r²)),  r = Ae ÷ D" last />
      </Card>

      <Muted style={{ marginTop: 18, fontSize: 12 }}>
        Values are conservative starting points from common machinist references. Coating, coolant, rigidity and
        tool condition all shift them — dial in from the safe side.
      </Muted>
    </ScrollView>
  );
}

function Formula({ label, body, last }: { label: string; body: string; last?: boolean }) {
  return (
    <View style={[styles.formula, !last && styles.trBorder]}>
      <Text style={styles.fLabel}>{label}</Text>
      <Text style={styles.fBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    color: T.textFaint, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  trBorder: { borderBottomWidth: 1, borderBottomColor: T.hairline },
  thead: { backgroundColor: T.bgElev2, borderTopLeftRadius: 17, borderTopRightRadius: 17 },
  th: { color: T.textDim, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { color: T.text, fontFamily: 'Manrope_500Medium', fontSize: 13 },
  dim: { color: T.textDim },
  num: { flex: 1, textAlign: 'right' },
  formula: { paddingVertical: 11 },
  fLabel: { color: T.textDim, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  fBody: { color: T.text, fontFamily: 'Manrope_600SemiBold', fontWeight: '600', fontSize: 15, marginTop: 3 },
});
