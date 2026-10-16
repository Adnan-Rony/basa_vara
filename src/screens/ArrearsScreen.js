import React, { useMemo } from 'react';
import { Linking, View } from 'react-native';
import { Alert, Text } from '../i18n';
import Screen from '../Screen';
import { Badge, Btn, Card, Empty, useNav } from '../ui';
import { getArrears } from '../db';
import { C } from '../theme';
import { monthLabel, normalizePhone, smsUrl, taka } from '../utils';

const open = async (url) => {
  try {
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('খোলা যায়নি', 'এই অ্যাপটি ফোনে পাওয়া যায়নি।');
  }
};

const messageFor = (a) =>
  `প্রিয় ${a.name}, ${a.building_name} ${a.unit_name} এর ভাড়া বাকি আছে: ` +
  a.months.map((m) => `${monthLabel(m.month)} ${taka(m.remaining)}`).join(', ') +
  `। মোট ${taka(a.total)}। অনুগ্রহ করে পরিশোধ করুন। ধন্যবাদ।`;

export default function ArrearsScreen() {
  const nav = useNav();
  const list = useMemo(() => getArrears(), [nav.version]);
  const grand = list.reduce((s, a) => s + a.total, 0);
  const phones = list.filter((a) => a.phone).map((a) => a.phone);

  return (
    <Screen title="সব মাসের বকেয়া" onBack={() => nav.pop()}>
      <Card>
        <Text style={{ color: C.sub, fontSize: 12 }}>মোট বকেয়া ({list.length} জন)</Text>
        <Text style={{ fontWeight: '800', fontSize: 22, color: list.length ? C.danger : C.ok }}>{taka(grand)}</Text>
      </Card>

      {phones.length > 0 && (
        <Btn
          kind="ghost"
          style={{ marginBottom: 12 }}
          title={`বকেয়া সবাইকে একসাথে SMS (${phones.length} জন)`}
          onPress={() =>
            open(
              smsUrl(
                phones,
                'প্রিয় ভাড়াটিয়া, আপনার ভাড়া বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। ধন্যবাদ।'
              )
            )
          }
        />
      )}

      {list.length === 0 ? (
        <Empty text="কারো ভাড়া বকেয়া নেই। 🎉" />
      ) : (
        list.map((a) => (
          <Card key={a.tenant_id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>{a.name}</Text>
                <Text style={{ color: C.sub, marginTop: 2 }}>
                  {a.building_name} · {a.unit_name}
                  {a.active ? '' : ' · (ছেড়ে গেছেন)'}
                </Text>
              </View>
              <Badge text={taka(a.total)} kind="danger" />
            </View>
            {a.months.map((m) => (
              <View key={m.month} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: C.text }}>{monthLabel(m.month)}</Text>
                <Text style={{ color: C.danger, fontWeight: '700' }}>{taka(m.remaining)}</Text>
              </View>
            ))}
            {!!a.phone && (
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                <Btn small kind="ghost" style={{ flex: 1 }} title="SMS" onPress={() => open(smsUrl(a.phone, messageFor(a)))} />
                <Btn
                  small
                  kind="ghost"
                  style={{ flex: 1 }}
                  title="WhatsApp"
                  onPress={() => open(`https://wa.me/${normalizePhone(a.phone)}?text=${encodeURIComponent(messageFor(a))}`)}
                />
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
