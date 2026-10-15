import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../Screen';
import { Btn, Chip, Field, useNav } from '../ui';
import { getTenant, saveTenant } from '../db';
import { fromBn, isISODate, parseNum, TENANT_TYPES, todayISO, toBn } from '../utils';

export default function TenantForm({ unitId, id }) {
  const nav = useNav();
  const existing = id ? getTenant(id) : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [members, setMembers] = useState(existing ? toBn(existing.members) : '১');
  const [type, setType] = useState(existing?.type ?? 'family');
  const [moveIn, setMoveIn] = useState(existing?.move_in ?? todayISO());
  const [advance, setAdvance] = useState(existing && existing.advance ? toBn(existing.advance) : '');
  const [note, setNote] = useState(existing?.note ?? '');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('নাম দিন', 'ভাড়াটিয়ার নাম লিখুন।');
      return;
    }
    const date = fromBn(moveIn).trim();
    if (date && !isISODate(date)) {
      Alert.alert('তারিখ ঠিক নেই', 'এভাবে লিখুন: 2026-10-15 (বছর-মাস-দিন)।');
      return;
    }
    const m = Math.max(1, Math.floor(parseNum(members)) || 1);
    saveTenant({
      id,
      unitId: existing?.unit_id ?? unitId,
      name: name.trim(),
      phone: fromBn(phone).trim(),
      members: m,
      type,
      moveIn: date || null,
      advance: parseNum(advance),
      note: note.trim(),
    });
    nav.bump();
    nav.pop();
  };

  return (
    <Screen title={id ? 'ভাড়াটিয়ার তথ্য' : 'নতুন ভাড়াটিয়া'} onBack={() => nav.pop()}>
      <Field label="নাম *" value={name} onChangeText={setName} placeholder="ভাড়াটিয়ার নাম" />
      <Field
        label="ফোন নম্বর"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="01XXXXXXXXX"
      />
      <Field
        label="মোট সদস্য সংখ্যা"
        value={members}
        onChangeText={setMembers}
        keyboardType="numeric"
        placeholder="১"
      />
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        {TENANT_TYPES.map((t) => (
          <Chip key={t.key} label={t.label} active={type === t.key} onPress={() => setType(t.key)} />
        ))}
      </View>
      <Field
        label="কবে উঠেছেন (বছর-মাস-দিন)"
        value={moveIn}
        onChangeText={setMoveIn}
        placeholder="2026-10-15"
        keyboardType="numbers-and-punctuation"
      />
      <Field
        label="অ্যাডভান্স জমা (৳)"
        value={advance}
        onChangeText={setAdvance}
        keyboardType="numeric"
        placeholder="ঐচ্ছিক"
      />
      <Field label="নোট" value={note} onChangeText={setNote} multiline placeholder="ঐচ্ছিক" />
      <Btn title="সংরক্ষণ করুন" onPress={save} />
    </Screen>
  );
}
