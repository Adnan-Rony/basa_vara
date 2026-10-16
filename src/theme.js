// Premium palette: deep emerald + champagne. `C` / SHADOW are mutated in place by applyTheme(),
// and the app tree is re-mounted (keyed by mode) so every screen re-reads them.
const LIGHT = {
  primary: '#0B5D4F',
  primaryDark: '#073B33',
  primaryDeep: '#052B26',
  primaryLight: '#2C8A75',
  accent: '#B8955A',
  accentSoft: '#F3EBDB',
  primarySoft: '#E6F0EC',
  bg: '#F7F4EE',
  card: '#FFFFFF',
  surface: '#F2EEE5',
  inputBg: '#FFFFFF',
  inputBorder: '#DDD6C8',
  text: '#16221F',
  sub: '#5E6A66',
  muted: '#98A19D',
  line: '#E9E3D7',
  danger: '#B83A42',
  dangerBg: '#F9E9E8',
  warn: '#9A6A25',
  warnBg: '#F8EFDD',
  ok: '#17744F',
  okBg: '#E5F2EA',
  info: '#3B5F9E',
  infoBg: '#EAEFF8',
  bar: '#1B2220',
  overlay: 'rgba(12,20,18,0.5)',
  shadow: '#2A2418',
  shadowOpacity: 0.08,
};

const DARK = {
  primary: '#2B806B',
  primaryDark: '#0F2A25',
  primaryDeep: '#0B1E1A',
  primaryLight: '#4BA48D',
  accent: '#D2B27A',
  accentSoft: '#2A261C',
  primarySoft: '#1A2A25',
  bg: '#0C110F',
  card: '#161D1A',
  surface: '#1F2924',
  inputBg: '#1A2320',
  inputBorder: '#2D3934',
  text: '#ECE8DE',
  sub: '#A4AFAA',
  muted: '#707C77',
  line: '#2A3531',
  danger: '#E0727A',
  dangerBg: '#2E1B1D',
  warn: '#D9AE6A',
  warnBg: '#2B2418',
  ok: '#5CC49A',
  okBg: '#17281F',
  info: '#8FAEE3',
  infoBg: '#1A2333',
  bar: '#222D29',
  overlay: 'rgba(0,0,0,0.62)',
  shadow: '#000000',
  shadowOpacity: 0.35,
};

export const C = { ...LIGHT };
const mk = (o, k) => ({
  get shadowColor() { return C.shadow; },
  get shadowOpacity() { return C.shadowOpacity * k; },
  get shadowRadius() { return k === 1 ? 20 : 10; },
  get shadowOffset() { return { width: 0, height: k === 1 ? 8 : 3 }; },
  get elevation() { return mode === 'dark' ? 0 : k === 1 ? 4 : 1; },
});
let mode = 'light';
export const SHADOW = mk(null, 1);
export const SOFT_SHADOW = mk(null, 0.55);

const listeners = [];
export const getMode = () => mode;
export const isDark = () => mode === 'dark';
export const onThemeChange = (fn) => listeners.push(fn);

export function applyTheme(m) {
  mode = m === 'dark' ? 'dark' : 'light';
  Object.assign(C, mode === 'dark' ? DARK : LIGHT);
  listeners.forEach((f) => f());
}

applyTheme('light');
