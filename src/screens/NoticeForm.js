import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../Screen';
import { Btn, Chip, Field, SectionTitle, useNav } from '../ui';
import { deleteNotice, getBuildings, getNotice, saveNotice } from '../db';

export default function NoticeForm({ id }) {
  const nav = useNav();
  const existing = id ? getNotice(id) : null;
  const buildings = useMemo(() => getBuildings(), []);
  const [buildingId, setBuildingId] = useState(existing ? existing.building_id : null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');

  const save = () => {
    if (!title.trim()) {
      Alert.alert('শিরোনাম দিন', 'নোটিশের একটি ছোট শিরোনাম লিখুন।');
      return;
    }
    saveNotice({ id, buildingId, title: title.trim(), body: body.trim() });
    nav.bump();
    nav.pop();
  };

  const remove = () =>
    Alert.alert('নোটিশ মুছবেন?', existing.title, [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: () => {
          deleteNotice(id);
          nav.bump();
          nav.pop();
        },
      },
    ]);

  return (
    <Screen title={id ? 'নোটিশ সম্পাদনা' : 'নতুন নোটিশ'} onBack={() => nav.pop()}>
      <SectionTitle>কোন বিল্ডিংয়ের জন্য</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 14 }}>
        <Chip label="সব বিল্ডিং" active={buildingId === null} onPress={() => setBuildingId(null)} />
        {buildings.map((b) => (
          <Chip key={b.id} label={b.name} active={buildingId === b.id} onPress={() => setBuildingId(b.id)} />
        ))}
      </View>
      <Field label="শিরোনাম *" value={title} onChangeText={setTitle} placeholder="যেমন: কাল পানির লাইন বন্ধ থাকবে" />
      <Field
        label="বিস্তারিত"
        value={body}
        onChangeText={setBody}
        placeholder="নোটিশের লেখা..."
        multiline
        style={{ minHeight: 140 }}
      />
      <Btn title="সংরক্ষণ করুন" onPress={save} />
      {!!id && <Btn kind="danger" style={{ marginTop: 12 }} title="নোটিশ মুছুন" onPress={remove} />}
    </Screen>
  );
}
