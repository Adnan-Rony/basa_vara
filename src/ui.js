import React, { createContext, useContext } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Text, TextInput } from './i18n';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SHADOW, onThemeChange } from './theme';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
};

// Gradient without any native module: a row (or column) of thin colour bands.
export function Gradient({ colors = [C.primaryDark, C.primaryLight], horizontal = true, steps = 28, style, children }) {
  const bands = [];
  const n = colors.length - 1;
  for (let i = 0; i < steps; i++) {
    const p = (i / (steps - 1)) * n;
    const k = Math.min(n - 1, Math.floor(p));
    bands.push(<View key={i} style={{ flex: 1, backgroundColor: mix(colors[k], colors[k + 1], p - k) }} />);
  }
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: horizontal ? 'row' : 'column' }]}>
        {bands}
      </View>
      {children}
    </View>
  );
}

export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

const ICONS = {
  home: ['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10'],
  rent: ['M3 8a3 3 0 013-3h12a3 3 0 013 3v9a3 3 0 01-3 3H6a3 3 0 01-3-3z', 'M3 10h18', 'M16 15h2'],
  bill: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  expense: ['M3 7l6 6 4-4 8 8', 'M15 17h6v-6'],
  notice: ['M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7', 'M10 20a2 2 0 004 0'],
  back: ['M19 12H5', 'M11 6l-6 6 6 6'],
  settings: ['M4 7h9', 'M19 7h1', 'M4 17h1', 'M11 17h9', 'C16,7,2.2', 'C8,17,2.2'],
  building: ['M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16', 'M3 21h18', 'M10 7h1', 'M13 7h1', 'M10 11h1', 'M13 11h1', 'M10 21v-5h4v5'],
  users: ['C9,8,3.3', 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6', 'M16 4.8a3.3 3.3 0 010 6.4', 'M18 14.3c1.8.7 3 2.6 3 5.7'],
  warning: ['M12 3.5L21.5 20h-19z', 'M12 10v4', 'M12 17h.01'],
};

export function AppIcon({ name, size = 22, color = C.primary }) {
  const d = ICONS[name];
  if (!d) return <View style={{ width: size, height: size }} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d.map((x, i) =>
        x.startsWith('C') ? (
          <Circle key={i} cx={+x.slice(1).split(',')[0]} cy={+x.split(',')[1]} r={+x.split(',')[2]} />
        ) : (
          <Path key={i} d={x} />
        )
      )}
    </Svg>
  );
}

export function Header({ title, onBack, right }) {
  const insets = useSafeAreaInsets();
  return (
    <Gradient colors={[C.primaryDeep, C.primaryDark, C.primary]} steps={36} style={[s.header, { paddingTop: insets.top + 10 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={s.headerSide}>
          <AppIcon name="back" size={22} color="#fff" />
        </Pressable>
      ) : (
        <View style={s.headerSide} />
      )}
      <Text style={s.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[s.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </Gradient>
  );
}

export function HeaderAction({ label, icon, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={s.headerActionWrap}>
      {icon ? <View style={s.headerActionIcon}><AppIcon name={icon} size={18} color="#E8D5AE" /></View> : <Text style={s.headerAction}>{label}</Text>}
    </Pressable>
  );
}

export function Btn({ title, onPress, kind = 'primary', small, style }) {
  const bg = kind === 'primary' ? C.primary : kind === 'danger' ? C.dangerBg : C.primarySoft;
  const color = kind === 'primary' ? '#fff' : kind === 'danger' ? C.danger : C.primary;
  const border = kind === 'ghost' ? C.line : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        kind === 'primary' && { ...SHADOW, shadowColor: C.primary, shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 14 }, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }) {
  if (!onPress) return <View style={[s.card, SHADOW, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, SHADOW, pressed && { opacity: 0.9 }, style]}>
      {children}
    </Pressable>
  );
}

export function Field({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.muted}
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

const badgeMap = () => ({
  ok: [C.okBg, C.ok],
  warn: [C.warnBg, C.warn],
  danger: [C.dangerBg, C.danger],
  info: [C.infoBg, C.info],
  gray: [C.surface, C.sub],
});

export function Badge({ text, kind = 'gray' }) {
  const [bg, fg] = badgeMap()[kind];
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

const build = () => StyleSheet.create({
  header: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSide: { width: 72, minHeight: 30, justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: 0.15 },
  headerAction: { color: '#E8D5AE', fontSize: 14, fontWeight: '800' },
  headerActionWrap: { minWidth: 40, alignItems: 'flex-end', justifyContent: 'center' },
  headerActionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(232,213,174,0.35)' },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  label: { fontSize: 13, color: C.sub, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: C.text,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.inputBorder,
    backgroundColor: C.card,
    marginRight: 8,
  },
  chipText: { fontSize: 14, color: C.text, fontWeight: '600' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { color: C.sub, fontSize: 14 },
  rowValue: { color: C.text, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  section: { fontSize: 13, color: C.accent, fontWeight: '800', marginTop: 12, marginBottom: 8, letterSpacing: 0.6 },
});

let s = build();
onThemeChange(() => { s = build(); });

// Popup that scrolls and stays above the keyboard.
export function Sheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.overlay }} behavior="padding">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.line }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
