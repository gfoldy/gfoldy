import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { T, radii, NOTICE_COLORS } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.fieldLabel}>{children}</Text>;
}

// --- Stat tile -------------------------------------------------------------
export function Stat({
  label, value, unit, sub, tone = 'default',
}: {
  label: string; value: string; unit?: string; sub?: string;
  tone?: 'default' | 'accent' | 'warn';
}) {
  const valColor = tone === 'accent' ? T.accent : tone === 'warn' ? T.warn : T.text;
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color: valColor }]}>
        {value}{unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

// --- Notice ----------------------------------------------------------------
export function Notice({ tone, children }: { tone: 'warn' | 'info' | 'error'; children: React.ReactNode }) {
  const c = NOTICE_COLORS[tone];
  return (
    <View style={[s.notice, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[s.noticeText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

// --- Segmented control -----------------------------------------------------
export function Segmented<K extends string>({
  options, value, onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={s.segment}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[s.segmentBtn, active && s.segmentBtnActive]}
          >
            <Text style={[s.segmentText, active && s.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Modal select ----------------------------------------------------------
export interface SelectOption { key: string; label: string; group?: string }

export function Select({
  label, value, options, onChange,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);

  // group options for the sheet
  const groups: { group: string | null; items: SelectOption[] }[] = [];
  for (const o of options) {
    const g = o.group ?? null;
    let bucket = groups.find((x) => x.group === g);
    if (!bucket) { bucket = { group: g, items: [] }; groups.push(bucket); }
    bucket.items.push(o);
  }

  return (
    <View>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable style={s.select} onPress={() => setOpen(true)}>
        <Text style={s.selectText} numberOfLines={1}>{current?.label ?? 'Select…'}</Text>
        <Text style={s.selectChevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setOpen(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          {label ? <Text style={s.sheetTitle}>{label}</Text> : null}
          <ScrollView style={{ maxHeight: 440 }}>
            {groups.map((g, gi) => (
              <View key={g.group ?? `g${gi}`}>
                {g.group ? <Text style={s.sheetGroup}>{g.group}</Text> : null}
                {g.items.map((o) => {
                  const active = o.key === value;
                  return (
                    <Pressable
                      key={o.key}
                      style={[s.sheetItem, active && s.sheetItemActive]}
                      onPress={() => { onChange(o.key); setOpen(false); }}
                    >
                      <Text style={[s.sheetItemText, active && s.sheetItemTextActive]}>{o.label}</Text>
                      {active ? <Text style={s.sheetCheck}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// --- Number field ----------------------------------------------------------
export function NumberField({
  label, value, onChange, suffix, placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View style={s.numberWrap}>
        <TextInput
          style={s.numberInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={T.textFaint}
          selectionColor={T.accent}
        />
        {suffix ? <Text style={s.numberSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// --- Button ----------------------------------------------------------------
export function Button({
  title, onPress, tone = 'accent', style,
}: {
  title: string; onPress: () => void; tone?: 'accent' | 'ghost' | 'danger'; style?: ViewStyle;
}) {
  const bg = tone === 'accent' ? T.accent : tone === 'danger' ? T.redSoft : T.bgElev2;
  const fg = tone === 'accent' ? T.accentInk : tone === 'danger' ? T.red : T.text;
  return (
    <Pressable onPress={onPress} style={[s.button, { backgroundColor: bg }, style]}>
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.bgElev, borderRadius: radii.lg, borderWidth: 1,
    borderColor: T.border, padding: 16,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 22, marginBottom: 10,
  },
  section: {
    color: T.textDim, fontSize: 12, fontFamily: 'Manrope_700Bold', fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  title: {
    color: T.text, fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 28,
    fontWeight: '800', marginTop: 4,
  },
  muted: { color: T.textDim, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20 },
  fieldLabel: {
    color: T.textDim, fontFamily: 'Manrope_600SemiBold', fontWeight: '600',
    fontSize: 12, marginBottom: 6,
  },

  stat: {
    flexGrow: 1, flexBasis: '30%', minWidth: 100, backgroundColor: T.bgElev2,
    borderRadius: radii.md, borderWidth: 1, borderColor: T.border, padding: 14,
  },
  statValue: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontWeight: '800', fontSize: 24 },
  statUnit: { color: T.textDim, fontFamily: 'Manrope_500Medium', fontWeight: '500', fontSize: 13 },
  statLabel: {
    color: T.textDim, fontSize: 11, marginTop: 6, textTransform: 'uppercase',
    letterSpacing: 0.5, fontFamily: 'Manrope_600SemiBold', fontWeight: '600',
  },
  statSub: { color: T.blue, fontSize: 12, marginTop: 4, fontFamily: 'Manrope_500Medium' },

  notice: { borderRadius: radii.md, borderWidth: 1, padding: 12, marginTop: 10 },
  noticeText: { fontFamily: 'Manrope_500Medium', fontWeight: '500', fontSize: 13, lineHeight: 19 },

  segment: {
    flexDirection: 'row', backgroundColor: T.bgElev2, borderRadius: radii.md,
    borderWidth: 1, borderColor: T.border, padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: T.accent },
  segmentText: { color: T.textDim, fontFamily: 'Manrope_600SemiBold', fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: T.accentInk },

  select: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.bgElev2,
    borderRadius: radii.md, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  selectText: { flex: 1, color: T.text, fontFamily: 'Manrope_500Medium', fontWeight: '500', fontSize: 15 },
  selectChevron: { color: T.textDim, fontSize: 14, marginLeft: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.bgElev,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, paddingBottom: 34, paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.borderStrong, marginBottom: 10,
  },
  sheetTitle: {
    color: T.text, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 16, marginBottom: 8,
  },
  sheetGroup: {
    color: T.textFaint, fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 4,
  },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: radii.md,
  },
  sheetItemActive: { backgroundColor: T.accentSoft },
  sheetItemText: { color: T.text, fontFamily: 'Manrope_500Medium', fontWeight: '500', fontSize: 15 },
  sheetItemTextActive: { color: T.accent },
  sheetCheck: { color: T.accent, fontSize: 16 },

  numberWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.bgElev2,
    borderRadius: radii.md, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14,
  },
  numberInput: {
    flex: 1, color: T.text, fontFamily: 'Manrope_600SemiBold', fontWeight: '600',
    fontSize: 16, paddingVertical: 13,
  },
  numberSuffix: { color: T.textDim, fontFamily: 'Manrope_500Medium', fontSize: 14, marginLeft: 6 },

  button: { borderRadius: radii.md, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontFamily: 'Manrope_700Bold', fontWeight: '700', fontSize: 15 },
});
