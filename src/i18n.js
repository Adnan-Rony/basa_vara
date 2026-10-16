import React from 'react';
import { Alert as RNAlert, Text as RNText, TextInput as RNTextInput } from 'react-native';
import EN from './en';
import { C } from './theme';

// UI language: 'bn' (default) or 'en'. The app is written in Bangla; English mode
// swaps known Bangla phrases for English and Bangla digits for 0-9 at render time.
let lang = 'bn';
export const getLang = () => lang;
export const setLang = (l) => {
  lang = l === 'en' ? 'en' : 'bn';
};

const keys = Object.keys(EN).sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Match whole Bangla words only (digits excluded from the word class so "৩এ" -> "3A").
const W = '\\u0980-\\u09E5\\u09F0-\\u09FF';
const RE = new RegExp(`(^|[^${W}])(${keys.map(esc).join('|')})(?![${W}])`, 'g');
const DIGITS = '০১২৩৪৫৬৭৮৯';

export function tr(s) {
  if (lang === 'bn' || typeof s !== 'string' || !s) return s;
  return s
    .replace(RE, (_, pre, m) => pre + EN[m])
    .replace(/[০-৯]/g, (d) => String(DIGITS.indexOf(d)));
}

const trNode = (c) => (typeof c === 'string' ? tr(c) : Array.isArray(c) ? c.map(trNode) : c);

export function Text({ children, ...props }) {
  return (
    <RNText {...props} style={[{ color: C.text }, props.style]}>
      {trNode(children)}
    </RNText>
  );
}

export const TextInput = React.forwardRef(function TextInput({ placeholder, ...props }, ref) {
  return <RNTextInput ref={ref} placeholder={tr(placeholder)} {...props} style={[{ color: C.text }, props.style]} />;
});

export const Alert = {
  alert: (title, message, buttons, options) =>
    RNAlert.alert(
      tr(title),
      tr(message),
      buttons && buttons.map((b) => ({ ...b, text: tr(b.text) })),
      options
    ),
};
