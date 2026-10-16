import * as SQLite from 'expo-sqlite';
import { monthKey, shiftMonth, todayISO } from './utils';

const db = SQLite.openDatabaseSync('barivara.db');

const cols = (table) => db.getAllSync(`PRAGMA table_info(${table})`).map((c) => c.name);

// Older installs may have tables created by an earlier version (CREATE TABLE IF NOT EXISTS won't fix them).
function migrate() {
  // utility_bills is a new feature: an old/partial table without `month` is unusable, so rebuild it.
  const ub = cols('utility_bills');
  if (ub.length && !ub.includes('month')) db.execSync('DROP TABLE utility_bills');
  const add = (table, col, def) => {
    const c = cols(table);
    if (c.length && !c.includes(col)) db.execSync(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  };
  add('payments', 'month', "TEXT NOT NULL DEFAULT ''");
  add('payment_log', 'month', "TEXT NOT NULL DEFAULT ''");
  add('payments', 'paid_date', 'TEXT');
  add('expenses', 'expense_date', "TEXT NOT NULL DEFAULT ''");
  add('expenses', 'note', "TEXT DEFAULT ''");
}

export function initDb() {
  migrate();
  db.execSync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      rent REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      note TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      members INTEGER NOT NULL DEFAULT 1,
      type TEXT DEFAULT 'family',
      move_in TEXT,
      move_out TEXT,
      advance REAL DEFAULT 0,
      note TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      due REAL NOT NULL,
      paid REAL NOT NULL DEFAULT 0,
      paid_date TEXT,
      UNIQUE (tenant_id, month)
    );
    CREATE TABLE IF NOT EXISTS payment_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS utility_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      tenant_id INTEGER,
      month TEXT NOT NULL,
      type TEXT NOT NULL,
      prev_reading REAL,
      curr_reading REAL,
      rate REAL,
      amount REAL NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      UNIQUE (unit_id, month, type)
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'অন্যান্য',
      expense_date TEXT NOT NULL,
      note TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      created TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_units_building ON units(building_id);
    CREATE INDEX IF NOT EXISTS idx_tenants_unit ON tenants(unit_id);
  `);
}

// ---------- Buildings ----------
export function getBuildings() {
  return db.getAllSync(`
    SELECT b.*,
      (SELECT COUNT(*) FROM units u WHERE u.building_id = b.id) AS unit_count,
      (SELECT COUNT(DISTINCT t.unit_id) FROM tenants t
        JOIN units u ON u.id = t.unit_id
        WHERE u.building_id = b.id AND t.active = 1) AS occupied
    FROM buildings b ORDER BY b.name
  `);
}

export const getBuilding = (id) =>
  db.getFirstSync('SELECT * FROM buildings WHERE id = ?', [id]);

export function saveBuilding({ id, name, address }) {
  if (id) {
    db.runSync('UPDATE buildings SET name = ?, address = ? WHERE id = ?', [name, address, id]);
    return id;
  }
  return db.runSync('INSERT INTO buildings (name, address) VALUES (?, ?)', [name, address])
    .lastInsertRowId;
}

export const deleteBuilding = (id) => db.runSync('DELETE FROM buildings WHERE id = ?', [id]);

// ---------- Units ----------
export function getUnits(buildingId) {
  return db.getAllSync(
    `SELECT u.*, t.id AS tenant_id, t.name AS tenant_name, t.members AS tenant_members
     FROM units u
     LEFT JOIN tenants t ON t.unit_id = u.id AND t.active = 1
     WHERE u.building_id = ?
     ORDER BY u.name`,
    [buildingId]
  );
}

export const getUnit = (id) => db.getFirstSync('SELECT * FROM units WHERE id = ?', [id]);

// Before a unit's rent changes, pin the OLD amount onto earlier months that have no payment row yet,
// so past months keep the rent that applied back then (the change only affects this month onward).
function freezePastRent(unitId, oldDue) {
  const thisMonth = monthKey();
  const tenants = db.getAllSync('SELECT id, move_in, move_out FROM tenants WHERE unit_id = ?', [unitId]);
  for (const t of tenants) {
    if (!t.move_in) continue;
    let m = substr7(t.move_in);
    const cap = shiftMonth(thisMonth, -36);
    if (m < cap) m = cap;
    const last = t.move_out && substr7(t.move_out) < thisMonth ? substr7(t.move_out) : shiftMonth(thisMonth, -1);
    for (; m <= last; m = shiftMonth(m, 1)) {
      const has = db.getFirstSync('SELECT id FROM payments WHERE tenant_id = ? AND month = ?', [t.id, m]);
      if (!has) db.runSync('INSERT INTO payments (tenant_id, month, due, paid) VALUES (?, ?, ?, 0)', [t.id, m, oldDue]);
    }
  }
}
const substr7 = (iso) => String(iso).slice(0, 7);

export function saveUnit({ id, buildingId, name, rent, serviceCharge, note }) {
  if (id) {
    const old = db.getFirstSync('SELECT rent, service_charge FROM units WHERE id = ?', [id]);
    if (old && (old.rent !== rent || old.service_charge !== serviceCharge)) {
      db.withTransactionSync(() => freezePastRent(id, old.rent + old.service_charge));
    }
    db.runSync(
      'UPDATE units SET name = ?, rent = ?, service_charge = ?, note = ? WHERE id = ?',
      [name, rent, serviceCharge, note, id]
    );
    return id;
  }
  return db.runSync(
    'INSERT INTO units (building_id, name, rent, service_charge, note) VALUES (?, ?, ?, ?, ?)',
    [buildingId, name, rent, serviceCharge, note]
  ).lastInsertRowId;
}

export function addUnitsBulk(buildingId, names, rent, serviceCharge) {
  db.withTransactionSync(() => {
    for (const name of names) {
      db.runSync(
        'INSERT INTO units (building_id, name, rent, service_charge, note) VALUES (?, ?, ?, ?, ?)',
        [buildingId, name, rent, serviceCharge, '']
      );
    }
  });
}

export const deleteUnit = (id) => db.runSync('DELETE FROM units WHERE id = ?', [id]);

// ---------- Tenants ----------
export const getActiveTenant = (unitId) =>
  db.getFirstSync('SELECT * FROM tenants WHERE unit_id = ? AND active = 1', [unitId]);

export const getPastTenants = (unitId) =>
  db.getAllSync(
    'SELECT * FROM tenants WHERE unit_id = ? AND active = 0 ORDER BY move_out DESC',
    [unitId]
  );

export const getTenant = (id) => db.getFirstSync('SELECT * FROM tenants WHERE id = ?', [id]);

export function saveTenant({ id, unitId, name, phone, members, type, moveIn, advance, note }) {
  if (id) {
    db.runSync(
      `UPDATE tenants SET name = ?, phone = ?, members = ?, type = ?, move_in = ?,
         advance = ?, note = ? WHERE id = ?`,
      [name, phone, members, type, moveIn, advance, note, id]
    );
    return id;
  }
  return db.runSync(
    `INSERT INTO tenants (unit_id, name, phone, members, type, move_in, advance, note, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [unitId, name, phone, members, type, moveIn, advance, note]
  ).lastInsertRowId;
}

export const endTenancy = (id) =>
  db.runSync('UPDATE tenants SET active = 0, move_out = ? WHERE id = ?', [todayISO(), id]);

export const getTenantPayments = (tenantId) =>
  db.getAllSync('SELECT * FROM payments WHERE tenant_id = ? ORDER BY month DESC', [tenantId]);

// ---------- Rent ----------
// One row per tenant who was living in the building during `month`.
export function getRentRows(month) {
  const rows = db.getAllSync(
    `SELECT t.id AS tenant_id, t.name, t.phone, t.members, t.move_in, t.active,
            u.id AS unit_id, u.name AS unit_name, b.name AS building_name,
            COALESCE(p.due, u.rent + u.service_charge) AS due,
            COALESCE(p.paid, 0) AS paid
     FROM tenants t
     JOIN units u ON u.id = t.unit_id
     JOIN buildings b ON b.id = u.building_id
     LEFT JOIN payments p ON p.tenant_id = t.id AND p.month = ?
     WHERE (t.active = 1 OR substr(t.move_out, 1, 7) >= ?)
       AND (t.move_in IS NULL OR substr(t.move_in, 1, 7) <= ?)
     ORDER BY b.name, u.name`,
    [month, month, month]
  );
  return rows.map((r) => ({ ...r, remaining: Math.max(0, r.due - r.paid) }));
}

export function addPayment(tenantId, month, defaultDue, amount) {
  let logId = 0;
  db.withTransactionSync(() => {
    logId = addPaymentInner(tenantId, month, defaultDue, amount);
  });
  return logId;
}

// Adds `amount` to a month. Anything above that month's due is carried into the next month(s) as advance.
function addPaymentInner(tenantId, month, defaultDue, amount) {
  applyPayment(tenantId, month, defaultDue, amount, 0);
  return db.runSync(
    'INSERT INTO payment_log (tenant_id, month, amount, paid_date) VALUES (?, ?, ?, ?)',
    [tenantId, month, amount, todayISO()]
  ).lastInsertRowId;
}

function applyPayment(tenantId, month, defaultDue, amount, depth) {
  const row = db.getFirstSync('SELECT * FROM payments WHERE tenant_id = ? AND month = ?', [tenantId, month]);
  const due = row ? row.due : defaultDue;
  const total = (row ? row.paid : 0) + amount;
  const carry = due > 0 && total > due && depth < 24;
  const keep = carry ? due : total;
  if (row) {
    db.runSync('UPDATE payments SET paid = ?, paid_date = ? WHERE id = ?', [keep, todayISO(), row.id]);
  } else {
    db.runSync('INSERT INTO payments (tenant_id, month, due, paid, paid_date) VALUES (?, ?, ?, ?, ?)', [
      tenantId, month, defaultDue, keep, todayISO(),
    ]);
  }
  if (carry) {
    const u = db.getFirstSync(
      'SELECT u.rent + u.service_charge AS due FROM tenants t JOIN units u ON u.id = t.unit_id WHERE t.id = ?',
      [tenantId]
    );
    applyPayment(tenantId, shiftMonth(month, 1), u?.due ?? due, total - due, depth + 1);
  }
}

export function resetPayment(tenantId, month) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM payments WHERE tenant_id = ? AND month = ?', [tenantId, month]);
    db.runSync('DELETE FROM payment_log WHERE tenant_id = ? AND month = ?', [tenantId, month]);
  });
}

export const getPaymentLog = (tenantId, month) =>
  db.getAllSync(
    'SELECT * FROM payment_log WHERE tenant_id = ? AND month = ? ORDER BY id',
    [tenantId, month]
  );

// Everything a receipt needs for one logged payment.
export function getReceiptData(logId) {
  const log = db.getFirstSync('SELECT * FROM payment_log WHERE id = ?', [logId]);
  if (!log) return null;
  const info = db.getFirstSync(
    `SELECT t.name AS tenant_name, t.phone, u.name AS unit_name,
            b.name AS building_name, b.address AS building_address, p.due AS due
     FROM tenants t
     JOIN units u ON u.id = t.unit_id
     JOIN buildings b ON b.id = u.building_id
     LEFT JOIN payments p ON p.tenant_id = t.id AND p.month = ?
     WHERE t.id = ?`,
    [log.month, log.tenant_id]
  );
  const upTo = db.getFirstSync(
    'SELECT COALESCE(SUM(amount), 0) AS s FROM payment_log WHERE tenant_id = ? AND month = ? AND id <= ?',
    [log.tenant_id, log.month, logId]
  ).s;
  const due = info.due ?? 0;
  const totalPaid = due > 0 ? Math.min(upTo, due) : upTo;
  return {
    ...info,
    receiptNo: log.id,
    month: log.month,
    amount: log.amount,
    paidDate: log.paid_date,
    totalPaid,
    carried: Math.max(0, upTo - due),
    due,
    remaining: Math.max(0, due - upTo),
  };
}

// ---------- Arrears (all months) ----------
// Every tenant who still owes something, with the unpaid months (last 36 months, up to this month).
export function getArrears() {
  const cur = monthKey();
  const first = db.getFirstSync(
    'SELECT MIN(substr(move_in, 1, 7)) AS m FROM tenants WHERE move_in IS NOT NULL'
  )?.m;
  let start = first || cur;
  const cap = shiftMonth(cur, -35);
  if (start < cap) start = cap;
  const map = new Map();
  for (let m = start; m <= cur; m = shiftMonth(m, 1)) {
    for (const r of getRentRows(m)) {
      if (r.remaining <= 0) continue;
      if (!r.move_in && m < cur) continue; // no move-in date: only count this month
      const e = map.get(r.tenant_id) || {
        tenant_id: r.tenant_id, name: r.name, phone: r.phone, unit_name: r.unit_name,
        building_name: r.building_name, active: r.active, months: [], total: 0,
      };
      e.months.push({ month: m, remaining: r.remaining });
      e.total += r.remaining;
      map.set(r.tenant_id, e);
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// Phone numbers of current tenants (one building, or all when buildingId is null).
export const getTenantPhones = (buildingId = null) =>
  db
    .getAllSync(
      `SELECT t.phone FROM tenants t JOIN units u ON u.id = t.unit_id
       WHERE t.active = 1 AND t.phone IS NOT NULL AND t.phone != '' ${buildingId ? 'AND u.building_id = ?' : ''}`,
      buildingId ? [buildingId] : []
    )
    .map((r) => r.phone);

// ---------- Settings ----------
export function getSettings() {
  const out = {};
  for (const r of db.getAllSync('SELECT key, value FROM settings')) out[r.key] = r.value;
  return out;
}

export function setSetting(key, value) {
  db.runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// ---------- Notices ----------
// buildingId null => সব বিল্ডিংয়ের জন্য
export const getNotices = () =>
  db.getAllSync(
    `SELECT n.*, b.name AS building_name FROM notices n
     LEFT JOIN buildings b ON b.id = n.building_id
     ORDER BY n.created DESC, n.id DESC`
  );

export const getNotice = (id) => db.getFirstSync('SELECT * FROM notices WHERE id = ?', [id]);

export function saveNotice({ id, buildingId, title, body }) {
  if (id) {
    db.runSync('UPDATE notices SET building_id = ?, title = ?, body = ? WHERE id = ?', [
      buildingId,
      title,
      body,
      id,
    ]);
    return id;
  }
  return db.runSync('INSERT INTO notices (building_id, title, body, created) VALUES (?, ?, ?, ?)', [
    buildingId,
    title,
    body,
    todayISO(),
  ]).lastInsertRowId;
}

export const deleteNotice = (id) => db.runSync('DELETE FROM notices WHERE id = ?', [id]);

// ---------- House rules ----------
export const getRules = (buildingId) =>
  db.getAllSync('SELECT * FROM rules WHERE building_id = ? ORDER BY sort, id', [buildingId]);

export function addRule(buildingId, text) {
  const next =
    db.getFirstSync('SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM rules WHERE building_id = ?', [
      buildingId,
    ]).n;
  db.runSync('INSERT INTO rules (building_id, text, sort) VALUES (?, ?, ?)', [
    buildingId,
    text,
    next,
  ]);
}

export const deleteRule = (id) => db.runSync('DELETE FROM rules WHERE id = ?', [id]);



// ---------- Simple Expense Manager ----------
// month = 'YYYY-MM' to see one month only; omit for every expense.
export const getExpenses = (month = null) =>
  month
    ? db.getAllSync(
        'SELECT * FROM expenses WHERE substr(expense_date, 1, 7) = ? ORDER BY expense_date DESC, id DESC',
        [month]
      )
    : db.getAllSync('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC');

export const updateExpense = ({ id, title, amount, category, expenseDate, note }) =>
  db.runSync(
    'UPDATE expenses SET title = ?, amount = ?, category = ?, expense_date = ?, note = ? WHERE id = ?',
    [title, amount, category || 'অন্যান্য', expenseDate, note || '', id]
  );

export const addExpense = ({ title, amount, category, expenseDate, note }) =>
  db.runSync(
    'INSERT INTO expenses (title, amount, category, expense_date, note) VALUES (?, ?, ?, ?, ?)',
    [title, amount, category || 'অন্যান্য', expenseDate, note || '']
  ).lastInsertRowId;

export const deleteExpense = (id) => db.runSync('DELETE FROM expenses WHERE id = ?', [id]);

// ---------- Utility bills (meter reading / fixed) ----------
export const getBills = (month) =>
  db.getAllSync('SELECT * FROM utility_bills WHERE month = ? ORDER BY id', [month]);

// Last meter reading from an earlier month for this unit + bill type (prefills "previous").
export const getLastReading = (unitId, type, month) =>
  db.getFirstSync(
    `SELECT curr_reading FROM utility_bills
     WHERE unit_id = ? AND type = ? AND month < ? AND curr_reading IS NOT NULL
     ORDER BY month DESC LIMIT 1`,
    [unitId, type, month]
  )?.curr_reading ?? null;

// One bill per unit + month + type. Saving again edits it and keeps the paid flag.
export function saveBill({ unitId, tenantId, month, type, prev, curr, rate, amount }) {
  db.runSync(
    `INSERT INTO utility_bills (unit_id, tenant_id, month, type, prev_reading, curr_reading, rate, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(unit_id, month, type) DO UPDATE SET
       tenant_id = excluded.tenant_id, prev_reading = excluded.prev_reading,
       curr_reading = excluded.curr_reading, rate = excluded.rate, amount = excluded.amount`,
    [unitId, tenantId, month, type, prev, curr, rate, amount]
  );
}

export const setBillPaid = (id, paid) =>
  db.runSync('UPDATE utility_bills SET paid = ? WHERE id = ?', [paid ? 1 : 0, id]);

export const deleteBill = (id) => db.runSync('DELETE FROM utility_bills WHERE id = ?', [id]);

// ---------- Backup & Restore ----------
// Keep this list in dependency order (parents before children).
const BACKUP_TABLES = [
  'buildings',
  'expenses',
  'units',
  'tenants',
  'payments',
  'payment_log',
  'utility_bills',
  'settings',
  'notices',
  'rules',
];
const OPTIONAL_BACKUP_TABLES = ['expenses', 'utility_bills'];
const BACKUP_FORMAT = 'barivara-sqlite-backup';
const BACKUP_VERSION = 1;

export function createBackupObject() {
  const tables = {};
  for (const table of BACKUP_TABLES) {
    // Table names come only from the constant allowlist above.
    tables[table] = db.getAllSync(`SELECT * FROM "${table}"`);
    if (table === 'settings') tables[table] = tables[table].filter((r) => r.key !== 'pin_hash');
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    app: 'বাড়িভাড়া ম্যানেজার',
    tables,
  };
}

export function validateBackupObject(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new Error('ব্যাকআপ ফাইলটি সঠিক JSON নয়।');
  }
  if (backup.format !== BACKUP_FORMAT) {
    throw new Error('এটি বাড়িভাড়া ম্যানেজারের ব্যাকআপ ফাইল নয়।');
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`এই ব্যাকআপের সংস্করণ (${backup.version}) সমর্থিত নয়।`);
  }
  if (!backup.tables || typeof backup.tables !== 'object' || Array.isArray(backup.tables)) {
    throw new Error('ব্যাকআপে ডেটাবেসের তথ্য পাওয়া যায়নি।');
  }

  for (const table of BACKUP_TABLES) {
    // Older version-1 backups did not include these tables; treat them as empty.
    if (OPTIONAL_BACKUP_TABLES.includes(table) && backup.tables[table] === undefined) continue;
    if (!Array.isArray(backup.tables[table])) {
      throw new Error(`ব্যাকআপে ${table} টেবিলের তথ্য নেই বা ভুল।`);
    }
    const columns = db.getAllSync(`PRAGMA table_info("${table}")`).map((c) => c.name);
    for (const row of backup.tables[table]) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`${table} টেবিলে ভুল রেকর্ড পাওয়া গেছে।`);
      }
      for (const key of Object.keys(row)) {
        if (!columns.includes(key)) {
          throw new Error(`${table} টেবিলে অচেনা কলাম পাওয়া গেছে: ${key}`);
        }
      }
    }
  }
  return true;
}

export function restoreBackupObject(backup) {
  validateBackupObject(backup);

  const deleteOrder = [...BACKUP_TABLES].reverse();
  const keepPin = db.getFirstSync("SELECT value FROM settings WHERE key = 'pin_hash'");
  db.withTransactionSync(() => {
    // Delete child records first so foreign-key constraints remain satisfied.
    for (const table of deleteOrder) db.runSync(`DELETE FROM "${table}"`);

    for (const table of BACKUP_TABLES) {
      const rows = backup.tables[table] || [];
      if (!rows.length) continue;
      const validColumns = db.getAllSync(`PRAGMA table_info("${table}")`).map((c) => c.name);
      for (const row of rows) {
        const columns = Object.keys(row);
        if (!columns.length || columns.some((column) => !validColumns.includes(column))) {
          throw new Error(`ব্যাকআপের ${table} রেকর্ড যাচাই করা যায়নি।`);
        }
        const quoted = columns.map((column) => `"${column}"`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        db.runSync(
          `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders})`,
          columns.map((column) => row[column])
        );
      }
    }

    if (keepPin) {
      db.runSync(
        "INSERT INTO settings (key, value) VALUES ('pin_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [keepPin.value]
      );
    }
    const fkErrors = db.getAllSync('PRAGMA foreign_key_check');
    if (fkErrors.length) {
      throw new Error('ব্যাকআপে অসম্পূর্ণ সম্পর্ক আছে। বর্তমান ডেটা পরিবর্তন করা হয়নি।');
    }
  });
  return true;
}

// Wipes everything (used only by "forgot PIN → reset").
export function resetAllData() {
  db.withTransactionSync(() => {
    for (const table of [...BACKUP_TABLES].reverse()) db.runSync(`DELETE FROM "${table}"`);
  });
}

// ---------- Dashboard ----------
export function getStats(month) {
  const units = db.getFirstSync('SELECT COUNT(*) AS c FROM units').c;
  const occ = db.getFirstSync(
    'SELECT COUNT(DISTINCT unit_id) AS c, COALESCE(SUM(members), 0) AS m FROM tenants WHERE active = 1'
  );
  const rows = getRentRows(month);
  const expected = rows.reduce((s, r) => s + r.due, 0);
  const collected = rows.reduce((s, r) => s + Math.min(r.paid, r.due), 0);
  return {
    units,
    occupied: occ.c,
    vacant: Math.max(0, units - occ.c),
    members: occ.m,
    expected,
    collected,
    due: Math.max(0, expected - collected),
    dueCount: rows.filter((r) => r.remaining > 0).length,
  };
}
