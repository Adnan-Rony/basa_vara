import React, { useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, View } from 'react-native';
import Screen from '../Screen';
import { Badge, Btn, Card, Chip, Empty, Field, useNav } from '../ui';
import { addPayment, getPaymentLog, getReceiptData, getRentRows, getSettings, resetPayment } from '../db';
import { receiptHtml, sharePdf } from '../pdf';
import { C } from '../theme';
import { monthLabel, normalizePhone, parseNum, shiftMonth, showDate, taka, toBn } from '../utils';

const statusOf = (r) => {
  if (r.due <= 0 || r.remaining <= 0) return { text: 'পরিশোধিত', kind: 'ok' };
  if (r.paid > 0) return { text: 'আংশিক', kind: 'warn' };
  return { text: 'বকেয়া', kind: 'danger' };
};

export default function RentScreen() {
  const nav = useNav();
  const { month, setMonth } = nav;
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const [amount, setAmount] = useState('');

  const rows = useMemo(() => getRentRows(month), [nav.version, month]);
  const expected = rows.reduce((s, r) => s + r.due, 0);
  const collected = rows.reduce((s, r) => s + Math.min(r.paid, r.due), 0);
  const shown = rows.filter((r) => {
    if (filter === 'due') return r.remaining > 0;
    if (filter === 'paid') return r.remaining <= 0;
    return true;
  });

  const open = (r) => {
    setSel(r);
    setAmount(r.remaining > 0 ? String(Math.round(r.remaining)) : '');
  };

  const log = useMemo(
    () => (sel ? getPaymentLog(sel.tenant_id, month) : []),
    [sel, nav.version, month]
  );

  const receipt = async (logId) => {
    try {
      const data = getReceiptData(logId);
      if (!data) return;
      await sharePdf(receiptHtml(data, getSettings()), { title: 'ভাড়ার রসিদ' });
    } catch (e) {
      Alert.alert('রসিদ বানানো যায়নি', String(e?.message || e));
    }
  };

  const save = () => {
    const n = parseNum(amount);
    if (n <= 0) {
      Alert.alert('টাকার অঙ্ক দিন', 'কত টাকা পেয়েছেন তা লিখুন।');
      return;
    }
    const logId = addPayment(sel.tenant_id, month, sel.due, n);
    nav.bump();
    setSel(null);
    Alert.alert('সংরক্ষণ হয়েছে', `${taka(n)} জমা হয়েছে। রসিদ দেবেন?`, [
      { text: 'পরে', style: 'cancel' },
      { text: 'রসিদ দিন', onPress: () => receipt(logId) },
    ]);
  };

  const clear = () => {
    Alert.alert('পেমেন্ট মুছবেন?', `${monthLabel(month)} মাসের পেমেন্ট রেকর্ড মুছে যাবে।`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: () => {
          resetPayment(sel.tenant_id, month);
          nav.bump();
          setSel(null);
        },
      },
    ]);
  };

  const message = (r) =>
    `প্রিয় ${r.name}, ${r.building_name} ${r.unit_name} এর ${monthLabel(month)} মাসের ভাড়া ` +
    `${taka(r.remaining)} বাকি আছে। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ।`;

  const send = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('খোলা যায়নি', 'এই অ্যাপটি ফোনে পাওয়া যায়নি।');
    }
  };

  return (
    <Screen title="মাসিক ভাড়া">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={12}>
          <Text style={{ fontSize: 30, color: C.primary, paddingHorizontal: 12 }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={12}>
          <Text style={{ fontSize: 30, color: C.primary, paddingHorizontal: 12 }}>›</Text>
        </Pressable>
      </View>

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>প্রত্যাশিত</Text>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>{taka(expected)}</Text>
        </View>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>আদায়</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.ok }}>{taka(collected)}</Text>
        </View>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>বকেয়া</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.danger }}>
            {taka(Math.max(0, expected - collected))}
          </Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Chip label="সব" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="বকেয়া" active={filter === 'due'} onPress={() => setFilter('due')} />
        <Chip label="পরিশোধিত" active={filter === 'paid'} onPress={() => setFilter('paid')} />
      </View>

      {rows.length === 0 ? (
        <Empty text="এখনও কোনো ভাড়াটিয়া নেই। আগে বিল্ডিং → ইউনিট → ভাড়াটিয়া যোগ করুন।" />
      ) : shown.length === 0 ? (
        <Empty text="এই তালিকায় কেউ নেই।" />
      ) : (
        shown.map((r) => {
          const st = statusOf(r);
          return (
            <Card key={r.tenant_id} onPress={() => open(r)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{r.name}</Text>
                  <Text style={{ color: C.sub, marginTop: 2 }}>
                    {r.building_name} · {r.unit_name}
                  </Text>
                </View>
                <Badge text={st.text} kind={st.kind} />
              </View>
              <Text style={{ marginTop: 8, color: C.sub, fontSize: 13 }}>
                ভাড়া {taka(r.due)} · পেয়েছি {taka(r.paid)}
                {r.remaining > 0 ? ` · বাকি ${taka(r.remaining)}` : ''}
              </Text>
            </Card>
          );
        })
      )}

      <Modal visible={!!sel} transparent animationType="fade" onRequestClose={() => setSel(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          {sel && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{sel.name}</Text>
              <Text style={{ color: C.sub, marginBottom: 12 }}>
                {sel.building_name} · {sel.unit_name} · {monthLabel(month)}
              </Text>
              <Text style={{ color: C.text, marginBottom: 2 }}>ভাড়া: {taka(sel.due)}</Text>
              <Text style={{ color: C.text, marginBottom: 2 }}>এ পর্যন্ত পেয়েছি: {taka(sel.paid)}</Text>
              <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 12 }}>
                বাকি: {taka(sel.remaining)}
              </Text>
              <Field
                label="এখন কত টাকা পেয়েছেন?"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="০"
              />
              <Btn title="সংরক্ষণ করুন" onPress={save} />
              {log.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: C.sub, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                    এই মাসের পেমেন্ট
                  </Text>
                  {log.map((l) => (
                    <View
                      key={l.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: C.text }}>
                        {showDate(l.paid_date)} · {taka(l.amount)}
                      </Text>
                      <Btn small kind="ghost" title="রসিদ" onPress={() => receipt(l.id)} />
                    </View>
                  ))}
                </View>
              )}
              {sel.remaining > 0 && !!sel.phone && (
                <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                  <Btn
                    small
                    kind="ghost"
                    style={{ flex: 1 }}
                    title="SMS রিমাইন্ডার"
                    onPress={() =>
                      send(`sms:${sel.phone}?body=${encodeURIComponent(message(sel))}`)
                    }
                  />
                  <Btn
                    small
                    kind="ghost"
                    style={{ flex: 1 }}
                    title="WhatsApp"
                    onPress={() =>
                      send(
                        `https://wa.me/${normalizePhone(sel.phone)}?text=${encodeURIComponent(
                          message(sel)
                        )}`
                      )
                    }
                  />
                </View>
              )}
              {sel.paid > 0 && (
                <Btn
                  small
                  kind="danger"
                  style={{ marginTop: 10 }}
                  title="এই মাসের পেমেন্ট মুছুন"
                  onPress={clear}
                />
              )}
              <Pressable onPress={() => setSel(null)} style={{ alignItems: 'center', marginTop: 14 }}>
                <Text style={{ color: C.sub, fontWeight: '600' }}>বাতিল</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
}
