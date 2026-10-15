import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DB_VERSION, TABLE_COLUMNS, dumpAll, restoreAll, setSetting } from './db';

const APP_ID = 'barivara';

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d = new Date()) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

const countRows = (tables) => {
  const out = {};
  for (const t of Object.keys(TABLE_COLUMNS)) out[t] = Array.isArray(tables[t]) ? tables[t].length : 0;
  return out;
};

export function buildBackup() {
  const tables = dumpAll();
  return {
    app: APP_ID,
    dbVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    counts: countRows(tables),
    tables,
  };
}

// Throws an Error with a Bangla message if the file is not a usable backup.
// Returns the row counts.
export function validateBackup(b) {
  if (!b || typeof b !== 'object' || b.app !== APP_ID) {
    throw new Error('এটি বাড়িভাড়া ম্যানেজারের ব্যাকআপ ফাইল নয়।');
  }
  if (typeof b.dbVersion !== 'number' || b.dbVersion < 1) {
    throw new Error('ব্যাকআপ ফাইলের ভার্সন বোঝা যাচ্ছে না।');
  }
  if (b.dbVersion > DB_VERSION) {
    throw new Error('এই ব্যাকআপ অ্যাপের নতুন ভার্সনে নেওয়া। আগে অ্যাপ আপডেট করো।');
  }
  if (!b.tables || typeof b.tables !== 'object') {
    throw new Error('ব্যাকআপ ফাইলে ডেটা পাওয়া যায়নি।');
  }
  for (const t of Object.keys(TABLE_COLUMNS)) {
    const rows = b.tables[t];
    if (!Array.isArray(rows)) throw new Error(`ব্যাকআপ ফাইল অসম্পূর্ণ (${t} টেবিল নেই)।`);
    for (const r of rows) {
      if (!r || typeof r !== 'object' || Array.isArray(r)) {
        throw new Error(`ব্যাকআপ ফাইল নষ্ট (${t} টেবিলে ভুল সারি)।`);
      }
    }
  }
  // Every child row must point at an existing parent, otherwise the restore
  // would fail halfway.
  const ids = (t) => new Set(b.tables[t].map((r) => r.id));
  const buildings = ids('buildings');
  const units = ids('units');
  const tenants = ids('tenants');
  const bad =
    b.tables.units.some((r) => !buildings.has(r.building_id)) ||
    b.tables.tenants.some((r) => !units.has(r.unit_id)) ||
    b.tables.payments.some((r) => !tenants.has(r.tenant_id)) ||
    b.tables.payment_log.some((r) => !tenants.has(r.tenant_id)) ||
    b.tables.notices.some((r) => r.building_id != null && !buildings.has(r.building_id)) ||
    b.tables.rules.some((r) => !buildings.has(r.building_id));
  if (bad) throw new Error('ব্যাকআপ ফাইলের ডেটা সামঞ্জস্যপূর্ণ নয় (কিছু তথ্যের সংযোগ নেই)।');
  return countRows(b.tables);
}

function writeJson(file, data) {
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data));
}

// Writes a backup file and opens the share sheet (save to Drive, send on WhatsApp...).
export async function exportBackup() {
  const data = buildBackup();
  const file = new File(Paths.cache, `barivara-backup-${stamp()}.json`);
  writeJson(file, data);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('এই ফোনে ফাইল শেয়ার করা যাচ্ছে না।');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'ব্যাকআপ ফাইল সংরক্ষণ করুন',
  });
  setSetting('last_backup', new Date().toISOString());
  return data.counts;
}

// Lets the user pick a .json file. Returns { backup, counts } or null if cancelled.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  let text;
  try {
    text = await new File(res.assets[0].uri).text();
  } catch {
    throw new Error('ফাইলটি পড়া যায়নি।');
  }
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('এটি ঠিক ব্যাকআপ ফাইল নয় (পড়া যায়নি)।');
  }
  return { backup, counts: validateBackup(backup) };
}

// Keeps a copy of the current data inside the app before it is replaced.
export const SAFETY_FILE = 'auto-backup-before-restore.json';

export function saveSafetyCopy() {
  writeJson(new File(Paths.document, SAFETY_FILE), buildBackup());
}

// Replaces all current data with the backup. The current data is saved to
// SAFETY_FILE first, and the database write is all-or-nothing.
export function restoreBackup(backup) {
  validateBackup(backup);
  saveSafetyCopy();
  restoreAll(backup.tables);
}

// Restores the copy made before the last restore ("undo").
export function hasSafetyCopy() {
  return new File(Paths.document, SAFETY_FILE).exists;
}

export async function undoLastRestore() {
  const f = new File(Paths.document, SAFETY_FILE);
  if (!f.exists) throw new Error('আগের কোনো সেফটি কপি নেই।');
  const backup = JSON.parse(await f.text());
  validateBackup(backup);
  restoreAll(backup.tables);
}
