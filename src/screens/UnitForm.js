import React, { useState } from 'react';
import { Alert } from '../i18n';
import Screen from '../Screen';
import { Btn, Field, useNav } from '../ui';
import { deleteUnit, getUnit, saveUnit } from '../db';
import { parseNum, toBn } from '../utils';

export default function UnitForm({ buildingId, id }) {
  const nav = useNav();
  const existing = id ? getUnit(id) : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [rent, setRent] = useState(existing ? toBn(existing.rent) : '');
  const [service, setService] = useState(existing ? toBn(existing.service_charge) : '');
  const [note, setNote] = useState(existing?.note ?? '');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('ইউনিটের নাম দিন', 'যেমন: ৩এ, ২য় তলা, বাম পাশ।');
      return;
    }
    saveUnit({
      id,
      buildingId: existing?.building_id ?? buildingId,
      name: name.trim(),
      rent: parseNum(rent),
      serviceCharge: parseNum(service),
      note: note.trim(),
    });
    nav.bump();
    nav.pop();
  };

  const remove = () => {
    Alert.alert('ইউনিট মুছবেন?', 'এই ইউনিটের ভাড়াটিয়া ও হিসাবও মুছে যাবে।', [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: () => {
          deleteUnit(id);
          nav.bump();
          nav.pop(2);
        },
      },
    ]);
  };

  return (
    <Screen title={id ? 'ইউনিট সম্পাদনা' : 'নতুন ইউনিট'} onBack={() => nav.pop()}>
      <Field label="ইউনিটের নাম *" value={name} onChangeText={setName} placeholder="যেমন: ৩এ" />
      <Field
        label="মাসিক ভাড়া (৳)"
        value={rent}
        onChangeText={setRent}
        keyboardType="numeric"
        placeholder="যেমন: ১৫০০০"
      />
      <Field
        label="সার্ভিস চার্জ (৳)"
        value={service}
        onChangeText={setService}
        keyboardType="numeric"
        placeholder="যেমন: ১০০০ (না থাকলে খালি রাখুন)"
      />
      <Field label="নোট" value={note} onChangeText={setNote} multiline placeholder="ঐচ্ছিক" />
      <Btn title="সংরক্ষণ করুন" onPress={save} />
      {!!id && <Btn kind="danger" style={{ marginTop: 12 }} title="ইউনিট মুছুন" onPress={remove} />}
    </Screen>
  );
}
