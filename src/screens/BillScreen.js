import React, { useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Alert, Text } from '../i18n';
import Screen from '../Screen';
import { Badge, Btn, Card, Chip, Empty, Field, Sheet, useNav } from '../ui';
import { deleteBill, getBills, getLastReading, getRentRows, getSettings, saveBill, setBillPaid, setSetting } from '../db';
import { C } from '../theme';
import {
  BILL_TYPES, billTypeLabel, meterAmount, monthLabel, normalizePhone, num, parseNum, shiftMonth, smsUrl, taka,
} from '../utils';

const open = async (url) => {
  try {
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('খোলা যায়নি', 'এই অ্যাপটি ফোনে পাওয়া যায়নি।');
  }
};

export default function BillScreen() {
  const nav = useNav();
  const month = nav.month;
  const rows = useMemo(() => getRentRows(month), [nav.version, month]);
  const bills = useMemo(() => getBills(month), [nav.version, month]);
  const [sel, setSel] = useState(null); // the tenant row being edited
  const [type, setType] = useState('electric');
  const [meter, setMeter] = useState(true);
  const [prev, setPrev] = useState('');
  const [curr, setCurr] = useState('');
  const [rate, setRate] = useState('');
  const [fixed, setFixed] = useState('');

  const billOf = (row, t) => bills.find((b) => b.unit_id === row.unit_id && b.type === t);
  const cur = sel ? billOf(sel, type) : null;

  // Fill the form for (row, type): the saved bill, else last month's reading + last used rate.
  const load = (row, t) => {
    setType(t);
    const b = billOf(row, t);
    const isMeter = b ? b.curr_reading != null : BILL_TYPES.find((x) => x.key === t).meter;
    setMeter(isMeter);
    if (b) {
      setPrev(b.prev_reading != null ? String(b.prev_reading) : '');
      setCurr(b.curr_reading != null ? String(b.curr_reading) : '');
      setRate(b.rate != null ? String(b.rate) : '');
      setFixed(isMeter ? '' : String(b.amount));
    } else {
      const last = getLastReading(row.unit_id, t, month);
      setPrev(last != null ? String(last) : '');
      setCurr('');
      setRate(getSettings()[`rate_${t}`] ?? '');
      setFixed('');
    }
  };
  const openFor = (row, t) => {
    setSel(row);
    load(row, t);
  };

  const amount = meter ? meterAmount(parseNum(prev), parseNum(curr), parseNum(rate)) : parseNum(fixed);

  const save = () => {
    if (meter) {
      if (!String(curr).trim()) return Alert.alert('এখনকার রিডিং দিন');
      if (parseNum(curr) < parseNum(prev)) return Alert.alert('রিডিং ভুল', 'এখনকার রিডিং আগের রিডিংয়ের চেয়ে কম হতে পারে না।');
      if (parseNum(rate) <= 0) return Alert.alert('ইউনিট প্রতি দাম দিন');
    } else if (amount <= 0) {
      return Alert.alert('টাকার অঙ্ক দিন');
    }
    saveBill({
      unitId: sel.unit_id,
      tenantId: sel.tenant_id,
      month,
      type,
      prev: meter ? parseNum(prev) : null,
      curr: meter ? parseNum(curr) : null,
      rate: meter ? parseNum(rate) : null,
      amount,
    });
    if (meter) setSetting(`rate_${type}`, String(parseNum(rate))); // remembered for next time
    nav.bump();
    setSel(null);
  };

  // Built from the SAVED bill (not half-typed form values), so what is sent matches what is stored.
  const message = () => {
    const isMeter = cur.curr_reading != null;
    const detail = isMeter
      ? ` (রিডিং ${num(cur.prev_reading ?? 0)} থেকে ${num(cur.curr_reading)}, মোট ${num(cur.curr_reading - (cur.prev_reading ?? 0))} ইউনিট × ${num(cur.rate ?? 0)} টাকা)`
      : '';
    return (
      `প্রিয় ${sel.name}, ${sel.building_name} ${sel.unit_name} এর ${monthLabel(month)} মাসের ` +
      `${billTypeLabel(type)} বিল ${taka(cur.amount)}${detail}। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ।`
    );
  };

  const remove = () =>
    Alert.alert('বিলটি মুছবেন?', `${billTypeLabel(type)} বিল মুছে যাবে।`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: () => {
          deleteBill(cur.id);
          nav.bump();
          setSel(null);
        },
      },
    ]);

  const total = bills.reduce((s, b) => s + b.amount, 0);
  const unpaid = bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);

  return (
    <Screen title="ইউটিলিটি বিল">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable onPress={() => nav.setMonth(shiftMonth(month, -1))} hitSlop={12}>
          <Text style={{ fontSize: 30, color: C.primary, paddingHorizontal: 12 }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{monthLabel(month)}</Text>
        <Pressable onPress={() => nav.setMonth(shiftMonth(month, 1))} hitSlop={12}>
          <Text style={{ fontSize: 30, color: C.primary, paddingHorizontal: 12 }}>›</Text>
        </Pressable>
      </View>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>মোট বিল</Text>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>{taka(total)}</Text>
        </View>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>আদায় বাকি</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: unpaid > 0 ? C.danger : C.ok }}>{taka(unpaid)}</Text>
        </View>
      </Card>
      <Text style={{ color: C.sub, fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
        বিলের হিসাব ভাড়া থেকে আলাদা। ভাড়াটিয়াকে বিল পাঠান, টাকা পেলে “পরিশোধিত” চিহ্ন দিন।
      </Text>

      {rows.length === 0 ? (
        <Empty text="এই মাসে কোনো ভাড়াটিয়া নেই। আগে বিল্ডিং → ইউনিট → ভাড়াটিয়া যোগ করুন।" />
      ) : (
        rows.map((r) => {
          const mine = bills.filter((b) => b.unit_id === r.unit_id);
          return (
            <Card key={r.tenant_id}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{r.name}</Text>
              <Text style={{ color: C.sub, marginBottom: 6 }}>
                {r.building_name} · {r.unit_name}
              </Text>
              {mine.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => openFor(r, b.type)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}
                >
                  <Text style={{ color: C.text }}>
                    {billTypeLabel(b.type)} · {taka(b.amount)}
                  </Text>
                  <Badge text={b.paid ? 'পরিশোধিত' : 'বাকি'} kind={b.paid ? 'ok' : 'danger'} />
                </Pressable>
              ))}
              <Btn small kind="ghost" style={{ marginTop: 6 }} title="+ বিল যোগ করুন" onPress={() => openFor(r, 'electric')} />
            </Card>
          );
        })
      )}

      <Sheet visible={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{sel.name}</Text>
            <Text style={{ color: C.sub, marginBottom: 12 }}>
              {sel.building_name} · {sel.unit_name} · {monthLabel(month)}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 }}>
              {BILL_TYPES.map((t) => (
                <Chip key={t.key} label={t.label} active={type === t.key} onPress={() => load(sel, t.key)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <Chip label="মিটার রিডিং" active={meter} onPress={() => setMeter(true)} />
              <Chip label="নির্দিষ্ট টাকা" active={!meter} onPress={() => setMeter(false)} />
            </View>
            {meter ? (
              <>
                <Field label="আগের রিডিং" value={prev} onChangeText={setPrev} keyboardType="decimal-pad" placeholder="০" />
                <Field label="এখনকার রিডিং" value={curr} onChangeText={setCurr} keyboardType="decimal-pad" placeholder="০" />
                <Field label="প্রতি ইউনিটের দাম (টাকা)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="যেমন: ৮" />
                <Text style={{ color: C.text, marginBottom: 12 }}>
                  ব্যবহার: {num(Math.max(0, parseNum(curr) - parseNum(prev)))} ইউনিট
                </Text>
              </>
            ) : (
              <Field label="বিলের টাকা" value={fixed} onChangeText={setFixed} keyboardType="decimal-pad" placeholder="০" />
            )}
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary, marginBottom: 12 }}>বিল: {taka(amount)}</Text>
            <Btn title={cur ? 'বিল আপডেট করুন' : 'বিল সংরক্ষণ করুন'} onPress={save} />
            {cur && (
              <>
                <Btn
                  small
                  kind="ghost"
                  style={{ marginTop: 10 }}
                  title={cur.paid ? 'বাকি হিসেবে চিহ্নিত করুন' : '✓ পরিশোধিত চিহ্নিত করুন'}
                  onPress={() => {
                    setBillPaid(cur.id, !cur.paid);
                    nav.bump();
                    setSel(null);
                  }}
                />
                {!cur.paid && !!sel.phone && (
                  <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                    <Btn small kind="ghost" style={{ flex: 1 }} title="SMS" onPress={() => open(smsUrl(sel.phone, message()))} />
                    <Btn
                      small
                      kind="ghost"
                      style={{ flex: 1 }}
                      title="WhatsApp"
                      onPress={() => open(`https://wa.me/${normalizePhone(sel.phone)}?text=${encodeURIComponent(message())}`)}
                    />
                  </View>
                )}
                <Btn small kind="danger" style={{ marginTop: 10 }} title="বিলটি মুছুন" onPress={remove} />
              </>
            )}
            <Pressable onPress={() => setSel(null)} style={{ alignItems: 'center', marginTop: 14 }}>
              <Text style={{ color: C.sub, fontWeight: '600' }}>বাতিল</Text>
            </Pressable>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
