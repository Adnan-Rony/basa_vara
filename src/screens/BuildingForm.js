import React, { useState } from 'react';
import { Alert } from '../i18n';
import Screen from '../Screen';
import { Btn, Field, useNav } from '../ui';
import { deleteBuilding, getBuilding, saveBuilding } from '../db';

export default function BuildingForm({ id }) {
  const nav = useNav();
  const existing = id ? getBuilding(id) : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');

  const save = () => {
    if (!name.trim()) {
      Alert.alert('নাম দিন', 'বিল্ডিংয়ের নাম লিখুন (যেমন: রহমান ভিলা)।');
      return;
    }
    const newId = saveBuilding({ id, name: name.trim(), address: address.trim() });
    nav.bump();
    if (id) {
      nav.pop();
    } else {
      // replace the form with the new building so the user can add units right away
      nav.pop();
      nav.push('building', { id: newId });
    }
  };

  const remove = () => {
    Alert.alert(
      'বিল্ডিং মুছবেন?',
      'এই বিল্ডিংয়ের সব ইউনিট, ভাড়াটিয়া ও ভাড়ার হিসাব মুছে যাবে। এটি আর ফেরানো যাবে না।',
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'মুছুন',
          style: 'destructive',
          onPress: () => {
            deleteBuilding(id);
            nav.bump();
            nav.popToTop();
          },
        },
      ]
    );
  };

  return (
    <Screen title={id ? 'বিল্ডিং সম্পাদনা' : 'নতুন বিল্ডিং'} onBack={() => nav.pop()}>
      <Field label="বিল্ডিংয়ের নাম *" value={name} onChangeText={setName} placeholder="যেমন: রহমান ভিলা" />
      <Field
        label="ঠিকানা"
        value={address}
        onChangeText={setAddress}
        placeholder="যেমন: ৫/এ, মিরপুর ১০, ঢাকা"
        multiline
      />
      <Btn title="সংরক্ষণ করুন" onPress={save} />
      {!!id && <Btn kind="danger" style={{ marginTop: 12 }} title="বিল্ডিং মুছুন" onPress={remove} />}
    </Screen>
  );
}
