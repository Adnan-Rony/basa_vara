import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Screen from '../Screen';
import { Btn, Card, Chip, Empty, Field, useNav } from '../ui';
import { addUtilityBill, deleteUtilityBill, getUtilityBills } from '../db';
import { C } from '../theme';
import { monthKey, monthLabel, taka, parseNum, toBn } from '../utils';

const CATEGORIES = ['পানি', 'বিদ্যুৎ', 'গ্যাস', 'ইন্টারনেট', 'অন্যান্য'];

export default function UtilityBillScreen() {
  const nav = useNav();
  const [category, setCategory] = useState('বিদ্যুৎ');
  const [billMonth, setBillMonth] = useState(monthKey());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const bills = useMemo(() => getUtilityBills(), [nav.version]);
  const total = bills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

  const save = () => {
    const value = parseNum(amount);
    if (!/^\d{4}-\d{2}$/.test(billMonth) || Number(billMonth.slice(5)) < 1 || Number(billMonth.slice(5)) > 12) {
      return Alert.alert('মাস ঠিক নয়', 'মাস YYYY-MM ফরম্যাটে লিখুন, যেমন ২০২৬-১০ এর বদলে 2026-10।');
    }
    if (value <= 0) return Alert.alert('সঠিক পরিমাণ দিন', 'বিলের টাকা ০-এর বেশি হতে হবে।');
    try {
      addUtilityBill({ category, billMonth, amount: value, note: note.trim(), createdAt: new Date().toISOString() });
      setAmount(''); setNote('');
      nav.bump();
      Alert.alert('সংরক্ষণ হয়েছে', 'ইউটিলিটি বিল যোগ করা হয়েছে।');
    } catch (e) {
      Alert.alert('সংরক্ষণ হয়নি', e?.message || 'আবার চেষ্টা করুন।');
    }
  };

  const remove = (bill) => Alert.alert('বিল মুছবেন?', `${bill.category} — ${taka(bill.amount)}`, [
    { text: 'না', style: 'cancel' },
    { text: 'মুছুন', style: 'destructive', onPress: () => { deleteUtilityBill(bill.id); nav.bump(); } },
  ]);

  return (
    <Screen title="ইউটিলিটি বিল">
      <Card>
        <Text style={{ color: C.sub, marginBottom: 4 }}>সব বিলের মোট</Text>
        <Text style={{ color: C.primary, fontSize: 26, fontWeight: '800' }}>{taka(total)}</Text>
        <Text style={{ color: C.sub, marginTop: 4 }}>মোট {toBn(bills.length)}টি বিল</Text>
      </Card>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 12 }}>নতুন বিল যোগ করুন</Text>
        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>বিলের ধরন</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 14 }}>
          {CATEGORIES.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
        </View>
        <Field label="বিলের মাস (YYYY-MM)" value={billMonth} onChangeText={setBillMonth} placeholder="2026-10" />
        <Field label="টাকার পরিমাণ" value={amount} onChangeText={setAmount} placeholder="যেমন: ১২০০" keyboardType="decimal-pad" />
        <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="যেমন: মিটার নম্বর বা বিলের তথ্য" />
        <Btn title="বিল সংরক্ষণ করুন" onPress={save} />
      </Card>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 10 }}>বিলের তালিকা</Text>
      {bills.length === 0 ? <Empty text="এখনও কোনো ইউটিলিটি বিল যোগ করা হয়নি।" /> : bills.map((bill) => (
        <Card key={bill.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{bill.category}</Text>
              <Text style={{ color: C.sub, marginTop: 4 }}>{monthLabel(bill.bill_month)}</Text>
              {!!bill.note && <Text style={{ color: C.sub, marginTop: 4 }}>{bill.note}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: C.primary, fontWeight: '800', fontSize: 16 }}>{taka(bill.amount)}</Text>
              <Pressable onPress={() => remove(bill)} style={{ paddingVertical: 8 }}><Text style={{ color: C.danger }}>মুছুন</Text></Pressable>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
