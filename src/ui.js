import React, { createContext, useContext } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';

export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

export function Header({ title, onBack, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 10 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={s.headerSide}>
          <Text style={s.headerBack}>‹</Text>
        </Pressable>
      ) : (
        <View style={s.headerSide} />
      )}
      <Text style={s.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[s.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function HeaderAction({ label, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text style={s.headerAction}>{label}</Text>
    </Pressable>
  );
}

export function Btn({ title, onPress, kind = 'primary', small, style }) {
  const bg = kind === 'primary' ? C.primary : kind === 'danger' ? C.dangerBg : C.card;
  const color = kind === 'primary' ? '#fff' : kind === 'danger' ? C.danger : C.primary;
  const border = kind === 'ghost' ? C.primary : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 14 }, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={[s.card, style]}>
      {children}
    </Wrap>
  );
}

export function Field({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        {...props}
        style={[s.input, props.multiline && { minHeight: 72, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, active && { backgroundColor: C.primary, borderColor: C.primary }]}
    >
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const BADGE = {
  ok: [C.okBg, C.ok],
  warn: [C.warnBg, C.warn],
  danger: [C.dangerBg, C.danger],
  info: [C.infoBg, C.info],
  gray: ['#F3F4F6', C.sub],
};

export function Badge({ text, kind = 'gray' }) {
  const [bg, fg] = BADGE[kind];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Empty({ text }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <Text style={{ color: C.sub, fontSize: 15, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function Row({ label, value, bold }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

export function SectionTitle({ children }) {
  return <Text style={s.section}>{children}</Text>;
}

const s = StyleSheet.create({
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSide: { width: 72 },
  headerBack: { color: '#fff', fontSize: 34, lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerAction: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  label: { fontSize: 13, color: C.sub, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: C.text,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipText: { fontSize: 14, color: C.text, fontWeight: '600' },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { color: C.sub, fontSize: 14 },
  rowValue: { color: C.text, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  section: { fontSize: 14, color: C.sub, fontWeight: '700', marginTop: 10, marginBottom: 8 },
});
