import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Alert, Text } from '../i18n';
import Screen from '../Screen';
import { Btn, Card, Chip, Empty, Field, useNav } from '../ui';
import { addExpense, deleteExpense, getExpenses, updateExpense } from '../db';
import { C } from '../theme';
import {
  fromBn, isISODate, monthKey, monthLabel, parseNum, shiftMonth, showDate, taka, todayISO,
} from '../utils';

const CATEGORIES = ['মেরামত', 'পানি', 'বিদ্যুৎ', 'পরিষ্কার', 'অন্যান্য'];

export default function ExpenseScreen() {
  const nav = useNav();
  const [showAll, setShowAll] = useState(false); // false = only nav.month
  const month = nav.month;
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('অন্যান্য');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const expenses = useMemo(
    () => getExpenses(showAll ? null : month),
    [nav.version, month, showAll]
  );
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // New expense in another month starts on that month's 1st instead of today.
  const defaultDate = () => (showAll || month === monthKey() ? todayISO() : `${month}-01`);

  const reset = () => {
    setEditId(null);
    setTitle('');
    setAmount('');
    setNote('');
    setCategory('অন্যান্য');
    setDate(defaultDate());
  };

  const changeMonth = (m) => {
    nav.setMonth(m);
    if (!editId) setDate(m === monthKey() ? todayISO() : `${m}-01`);
  };

  const save = () => {
    const value = parseNum(amount);
    const d = fromBn(date).trim();
    if (!title.trim()) return Alert.alert('তথ্য দিন', 'খরচের নাম লিখুন।');
    if (value <= 0) return Alert.alert('সঠিক পরিমাণ দিন', 'খরচের পরিমাণ ০-এর বেশি হতে হবে।');
    if (!isISODate(d)) return Alert.alert('তারিখ ঠিক নেই', 'এভাবে লিখুন: 2026-10-15');
    try {
      const data = { title: title.trim(), amount: value, category, expenseDate: d, note: note.trim() };
      if (editId) updateExpense({ id: editId, ...data });
      else addExpense(data);
      // jump to the month of the saved expense so the person sees it in the list
      if (!showAll && d.slice(0, 7) !== month) nav.setMonth(d.slice(0, 7));
      nav.bump();
      Alert.alert('সংরক্ষণ হয়েছে', editId ? 'খরচ আপডেট হয়েছে।' : 'খরচ যোগ করা হয়েছে।');
      reset();
    } catch (e) {
      Alert.alert('সংরক্ষণ হয়নি', e?.message || 'আবার চেষ্টা করুন।');
    }
  };

  const edit = (item) => {
    setEditId(item.id);
    setTitle(item.title);
    setAmount(String(item.amount));
    setCategory(item.category);
    setDate(item.expense_date);
    setNote(item.note || '');
  };

  const remove = (item) =>
    Alert.alert('খরচ মুছবেন?', `${item.title} — ${taka(item.amount)}`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: () => {
          deleteExpense(item.id);
          if (editId === item.id) reset();
          nav.bump();
        },
      },
    ]);

  return (
    <Screen title="খরচের হিসাব">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable disabled={showAll} onPress={() => changeMonth(shiftMonth(month, -1))} hitSlop={12}>
          <Text style={{ fontSize: 30, color: showAll ? C.line : C.primary, paddingHorizontal: 12 }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
          {showAll ? 'সব সময়' : monthLabel(month)}
        </Text>
        <Pressable disabled={showAll} onPress={() => changeMonth(shiftMonth(month, 1))} hitSlop={12}>
          <Text style={{ fontSize: 30, color: showAll ? C.line : C.primary, paddingHorizontal: 12 }}>›</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Chip label="এই মাস" active={!showAll} onPress={() => setShowAll(false)} />
        <Chip label="সব মাস" active={showAll} onPress={() => setShowAll(true)} />
      </View>

      <Card>
        <Text style={{ color: C.sub, marginBottom: 4 }}>
          {showAll ? 'সব খরচের মোট' : `${monthLabel(month)} মাসের খরচ`}
        </Text>
        <Text style={{ color: C.primary, fontSize: 26, fontWeight: '800' }}>{taka(total)}</Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 12 }}>
          {editId ? 'খরচ সম্পাদনা' : 'নতুন খরচ যোগ করুন'}
        </Text>
        <Field label="খরচের নাম" value={title} onChangeText={setTitle} placeholder="যেমন: পানির মোটর মেরামত" />
        <Field label="টাকার পরিমাণ" value={amount} onChangeText={setAmount} placeholder="যেমন: ১৫০০" keyboardType="decimal-pad" />
        <Field label="তারিখ (বছর-মাস-দিন)" value={date} onChangeText={setDate} placeholder="2026-10-15" />
        <Text style={{ color: C.sub, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>খরচের ধরন</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 14 }}>
          {CATEGORIES.map((item) => (
            <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
          ))}
        </View>
        <Field label="নোট (ঐচ্ছিক)" value={note} onChangeText={setNote} placeholder="অতিরিক্ত তথ্য" />
        <Btn title={editId ? 'আপডেট করুন' : 'খরচ সংরক্ষণ করুন'} onPress={save} />
        {editId && <Btn kind="ghost" style={{ marginTop: 8 }} title="বাতিল" onPress={reset} />}
      </Card>

      <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 10 }}>খরচের তালিকা</Text>
      {expenses.length === 0 ? (
        <Empty text={showAll ? 'এখনও কোনো খরচ যোগ করা হয়নি।' : 'এই মাসে কোনো খরচ নেই।'} />
      ) : (
        expenses.map((item) => (
          <Card key={item.id} onPress={() => edit(item)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{item.title}</Text>
                <Text style={{ color: C.sub, marginTop: 4 }}>
                  {item.category} · {showDate(item.expense_date)}
                </Text>
                {!!item.note && <Text style={{ color: C.sub, marginTop: 4 }}>{item.note}</Text>}
                <Text style={{ color: C.primary, fontSize: 12, marginTop: 6 }}>সম্পাদনা করতে চাপুন</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.danger, fontWeight: '800', fontSize: 16 }}>{taka(item.amount)}</Text>
                <Pressable onPress={() => remove(item)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: C.danger }}>মুছুন</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
