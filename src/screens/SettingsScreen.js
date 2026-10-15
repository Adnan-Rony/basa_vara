import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import Screen from '../Screen';
import { Btn, Field, useNav } from '../ui';
import { getSettings, setSetting } from '../db';
import { C } from '../theme';

export default function SettingsScreen() {
  const nav = useNav();
  const cur = getSettings();
  const [name, setName] = useState(cur.name ?? '');
  const [phone, setPhone] = useState(cur.phone ?? '');

  const save = () => {
    setSetting('name', name.trim());
    setSetting('phone', phone.trim());
    nav.bump();
    Alert.alert('সংরক্ষণ হয়েছে');
    nav.pop();
  };

  return (
    <Screen title="সেটিংস" onBack={() => nav.pop()}>
      <Text style={{ color: C.sub, marginBottom: 14, lineHeight: 21 }}>
        এই তথ্য রসিদ আর নোটিশের নিচে বাড়িওয়ালার নাম ও ফোন হিসেবে ছাপা হবে।
      </Text>
      <Field label="আপনার নাম" value={name} onChangeText={setName} placeholder="যেমন: আব্দুর রহমান" />
      <Field label="আপনার ফোন নম্বর" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="০১৭XXXXXXXX" />
      <Btn title="সংরক্ষণ করুন" onPress={save} />
    </Screen>
  );
}
