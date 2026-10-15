import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Screen from '../Screen';
import { Btn, Card, Chip, Empty, Field, useNav } from '../ui';
import { addExpense, deleteExpense, getExpenses } from '../db';
import { C } from '../theme';
import { todayISO, taka, showDate, parseNum } from '../utils';

const CATEGORIES = ['মেরামত', 'পানি', 'বিদ্যুৎ', 'পরিষ্কার', 'অন্যান্য'];

export default function ExpenseScreen() {
  const nav = useNav();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('অন্যান্য');
  const [note, setNote] = useState('');
  const expenses = useMemo(() => getExpenses(), [nav.version]);
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const save = () => {
    const value = parseNum(amount);
    if (!title.trim()) return Alert.alert('তথ্য দিন', 'খরচের নাম লিখুন।');
    if (value <= 0) return Alert.alert('সঠিক পরিমাণ দিন', 'খরচের পরিমাণ ০-এর বেশি হতে হবে।');
    try {
      addExpense({ title: title.trim(), amount: value, category, expenseDate: todayISO(), note: note.trim() });
      setTitle(''); setAmount(''); setNote(''); setCategory('অন্যান্য');
      nav.bump();
      Alert.alert('সংরক্ষণ হয়েছে', 'খরচ যোগ করা হয়েছে।');
    } catch (e) {
      Alert.alert('সংরক্ষণ হয়নি', e?.message || 'আবার চেষ্টা করুন।');
    }
  };

  const remove = (item) => Alert.alert('খরচ মুছবেন?', `${item.title} — ${taka(item.amount)}`, [
    { text: 'না', style: 'cancel' },
    { text: 'মুছুন', style: 'destructive', onPress: () => { deleteExpense(item.id); nav.bump(); } },
  ]);

  return (
    <Screen title="খরচের হিসাব">
      <Card>
        <Text style={{ color: C.sub, marginBottom: 4 }}>সব খরচের মোট</Text>
        <Text style={{ color: C.primary, fontSize: 26, fontWeight: '800' }}>{taka(total)}</Text>
      </Card>
      <Card>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 12 }}>নতুন খরচ যোগ করুন</Text>
        <Field label="খরচের নাম" value={title} onChangeText={setTitle} placeholder="যেমন: পানির মোটর মেরামত" />
        <Field label="টাকার পরিমাণ" value={amount} onChangeText={setAmount} placeholder="যেমন: ১৫০০" keyboardType="decimal-pad" />
        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>খরচের ধরন</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 14 }}>
          {CATEGORIES.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}
        </View>
        <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="অতিরিক্ত তথ্য" />
        <Btn title="খরচ সংরক্ষণ করুন" onPress={save} />
      </Card>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 10 }}>খরচের তালিকা</Text>
      {expenses.length === 0 ? <Empty text="এখনও কোনো খরচ যোগ করা হয়নি।" /> : expenses.map((item) => (
        <Card key={item.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{item.title}</Text>
              <Text style={{ color: C.sub, marginTop: 4 }}>{item.category} · {showDate(item.expense_date)}</Text>
              {!!item.note && <Text style={{ color: C.sub, marginTop: 4 }}>{item.note}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: C.danger, fontWeight: '800', fontSize: 16 }}>{taka(item.amount)}</Text>
              <Pressable onPress={() => remove(item)} style={{ paddingVertical: 8 }}><Text style={{ color: C.danger }}>মুছুন</Text></Pressable>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
