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

export const isISODate = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());

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
