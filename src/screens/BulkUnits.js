import React, { useMemo, useState } from 'react';
import { Alert, Text } from '../i18n';
import Screen from '../Screen';
import { Btn, Card, Field, useNav } from '../ui';
import { addUnitsBulk } from '../db';
import { C } from '../theme';
import { parseNum, toBn, UNIT_LETTERS } from '../utils';

export default function BulkUnits({ buildingId }) {
  const nav = useNav();
  const [floors, setFloors] = useState('');
  const [perFloor, setPerFloor] = useState('');
  const [rent, setRent] = useState('');
  const [service, setService] = useState('');

  const names = useMemo(() => {
    const f = Math.min(Math.floor(parseNum(floors)), 40);
    const p = Math.min(Math.floor(parseNum(perFloor)), UNIT_LETTERS.length);
    const out = [];
    for (let i = 1; i <= f; i++) for (let j = 0; j < p; j++) out.push(`${toBn(i)}${UNIT_LETTERS[j]}`);
    return out;
  }, [floors, perFloor]);

  const create = () => {
    if (names.length === 0) {
      Alert.alert('তলা ও ইউনিট সংখ্যা দিন', 'কয়টি তলা এবং প্রতি তলায় কয়টি ইউনিট তা লিখুন।');
      return;
    }
    addUnitsBulk(buildingId, names, parseNum(rent), parseNum(service));
    nav.bump();
    nav.pop();
  };

  return (
    <Screen title="একসাথে ইউনিট তৈরি" onBack={() => nav.pop()}>
      <Field label="কয়টি তলা?" value={floors} onChangeText={setFloors} keyboardType="numeric" placeholder="যেমন: ৫" />
      <Field
        label="প্রতি তলায় কয়টি ইউনিট? (সর্বোচ্চ ৮)"
        value={perFloor}
        onChangeText={setPerFloor}
        keyboardType="numeric"
        placeholder="যেমন: ২"
      />
      <Field
        label="সবার জন্য ডিফল্ট ভাড়া (৳)"
        value={rent}
        onChangeText={setRent}
        keyboardType="numeric"
        placeholder="পরে আলাদা করে বদলানো যাবে"
      />
      <Field
        label="ডিফল্ট সার্ভিস চার্জ (৳)"
        value={service}
        onChangeText={setService}
        keyboardType="numeric"
        placeholder="ঐচ্ছিক"
      />
      {names.length > 0 && (
        <Card>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>
            মোট {toBn(names.length)} টি ইউনিট তৈরি হবে
          </Text>
          <Text style={{ color: C.sub, lineHeight: 22 }}>{names.join(', ')}</Text>
        </Card>
      )}
      <Btn title="ইউনিট তৈরি করুন" onPress={create} />
    </Screen>
  );
}
