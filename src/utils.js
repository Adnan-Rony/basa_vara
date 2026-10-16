import { Platform } from 'react-native';

const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const pad = (n) => String(n).padStart(2, '0');

export const toBn = (v) => String(v ?? '').replace(/\d/g, (d) => BN[Number(d)]);
export const fromBn = (s) =>
  String(s ?? '').replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

// Accepts Bangla or English digits typed by the user.
export const parseNum = (s) => {
  const n = parseFloat(fromBn(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

// 1234567 -> 12,34,567 (lakh style)
export const groupIndian = (n) => {
  const s = String(Math.round(Number(n) || 0));
  const neg = s.startsWith('-');
  const d = neg ? s.slice(1) : s;
  if (d.length <= 3) return (neg ? '-' : '') + d;
  const last3 = d.slice(-3);
  const rest = d.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + rest + ',' + last3;
};

export const taka = (n) => '৳ ' + toBn(groupIndian(n || 0));

export const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

export const shiftMonth = (key, delta) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
};

export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${toBn(y)}`;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const isISODate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
};

// sms: link for one or many numbers (Android uses ?body=, iOS uses &body=).
export const smsUrl = (phones, body) =>
  `sms:${[].concat(phones).map((p) => fromBn(p).replace(/[^\d+]/g, '')).join(',')}${
    Platform.OS === 'ios' ? '&' : '?'
  }body=${encodeURIComponent(body)}`;

// Light hash for the app-lock PIN (cyrb53). It only keeps the PIN from being stored as plain text.
export const hashPin = (pin) => {
  const str = 'bari:' + String(pin);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return String(4294967296 * (2097151 & h2) + (h1 >>> 0));
};

export const showDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${toBn(d)} ${MONTHS[m - 1]} ${toBn(y)}`;
};

// 01712345678 -> 8801712345678 (for wa.me links)
export const normalizePhone = (p) => {
  const d = fromBn(p).replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('880')) return d;
  if (d.startsWith('0')) return '88' + d;
  return d;
};

export const TENANT_TYPES = [
  { key: 'family', label: 'ফ্যামিলি' },
  { key: 'bachelor', label: 'ব্যাচেলর' },
  { key: 'other', label: 'অন্যান্য' },
];

export const typeLabel = (key) =>
  (TENANT_TYPES.find((t) => t.key === key) || TENANT_TYPES[2]).label;

// Unit name suffixes used in Bangladesh: ৩এ, ৩বি ...
export const UNIT_LETTERS = ['এ', 'বি', 'সি', 'ডি', 'ই', 'এফ', 'জি', 'এইচ'];

// Whole days from an ISO date/datetime string to today. null if missing/invalid.
export const daysSince = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return null;
  const a = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = new Date();
  const b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((b - a) / 86400000);
};

export const BILL_TYPES = [
  { key: 'electric', label: 'বিদ্যুৎ', meter: true },
  { key: 'gas', label: 'গ্যাস', meter: false },
  { key: 'water', label: 'পানি', meter: false },
  { key: 'other', label: 'অন্যান্য', meter: false },
];
export const billTypeLabel = (key) => (BILL_TYPES.find((t) => t.key === key) || BILL_TYPES[3]).label;

// Meter bill = (current - previous) x rate. Never negative; rounded to paisa.
export const meterAmount = (prev, curr, rate) =>
  Math.round(Math.max(0, curr - prev) * rate * 100) / 100;

// Bangla number that keeps decimals (taka() rounds).
export const num = (n) => toBn(String(Math.round((Number(n) || 0) * 100) / 100));
