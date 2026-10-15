import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import Screen from '../Screen';
import { Badge, Btn, Card, Chip, Empty, Field, HeaderAction, SectionTitle, useNav } from '../ui';
import { addRule, deleteRule, getBuildings, getNotices, getRules, getSettings } from '../db';
import { A4, noticeHtml, rulesHtml, sharePdf } from '../pdf';
import { C } from '../theme';
import { showDate, toBn } from '../utils';

const fail = (e) => Alert.alert('PDF বানানো যায়নি', String(e?.message || e));

function NoticesTab() {
  const nav = useNav();
  const notices = useMemo(() => getNotices(), [nav.version]);

  const sharePdfOf = async (n) => {
    try {
      await sharePdf(noticeHtml(n, getSettings()), { ...A4, title: 'নোটিশ', fileName: 'notice' });
    } catch (e) {
      fail(e);
    }
  };
  const shareText = (n) =>
    Share.share({ message: `📢 ${n.title}\n\n${n.body}\n\n— ${getSettings().name || 'বাড়িওয়ালা'}` });

  return (
    <>
      <Btn title="+ নতুন নোটিশ" onPress={() => nav.push('noticeForm')} />
      <View style={{ height: 12 }} />
      {notices.length === 0 ? (
        <Empty text="এখনও কোনো নোটিশ নেই। পানির লাইন বন্ধ, ভাড়া বাড়ানো বা মিটিংয়ের মতো খবর এখানে লিখে ভাড়াটিয়াদের পাঠান।" />
      ) : (
        notices.map((n) => (
          <Card key={n.id}>
            <Pressable onPress={() => nav.push('noticeForm', { id: n.id })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: C.text }}>
                  {n.title}
                </Text>
                <Badge text={n.building_name || 'সব বিল্ডিং'} kind="info" />
              </View>
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>{showDate(n.created)}</Text>
              {!!n.body && (
                <Text style={{ color: C.text, marginTop: 6 }} numberOfLines={3}>
                  {n.body}
                </Text>
              )}
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Btn small kind="ghost" style={{ flex: 1 }} title="PDF শেয়ার" onPress={() => sharePdfOf(n)} />
              <Btn small kind="ghost" style={{ flex: 1 }} title="মেসেজ পাঠান" onPress={() => shareText(n)} />
            </View>
          </Card>
        ))
      )}
    </>
  );
}

function RulesTab() {
  const nav = useNav();
  const buildings = useMemo(() => getBuildings(), [nav.version]);
  const [bid, setBid] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!buildings.find((b) => b.id === bid)) setBid(buildings[0]?.id ?? null);
  }, [buildings, bid]);

  const rules = useMemo(() => (bid ? getRules(bid) : []), [bid, nav.version]);
  const building = buildings.find((b) => b.id === bid);

  if (buildings.length === 0) return <Empty text="আগে একটি বিল্ডিং যোগ করুন, তারপর তার নিয়ম লিখুন।" />;

  const add = () => {
    if (!text.trim()) return;
    addRule(bid, text.trim());
    setText('');
    nav.bump();
  };

  const remove = (r) =>
    Alert.alert('নিয়মটি মুছবেন?', r.text, [
      { text: 'না', style: 'cancel' },
      {
        text: 'মুছুন',
        style: 'destructive',
        onPress: () => {
          deleteRule(r.id);
          nav.bump();
        },
      },
    ]);

  const sharePdfRules = async () => {
    try {
      await sharePdf(rulesHtml(building.name, rules), { ...A4, title: 'বাসার নিয়মাবলি', fileName: 'rules' });
    } catch (e) {
      fail(e);
    }
  };
  const shareText = () =>
    Share.share({
      message:
        `🏠 ${building.name} — বাসার নিয়মাবলি\n\n` +
        rules.map((r, i) => `${toBn(i + 1)}. ${r.text}`).join('\n'),
    });

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 }}>
        {buildings.map((b) => (
          <Chip key={b.id} label={b.name} active={b.id === bid} onPress={() => setBid(b.id)} />
        ))}
      </View>

      {rules.length === 0 ? (
        <Empty text="এই বিল্ডিংয়ের কোনো নিয়ম নেই। যেমন: রাত ১১টার পর গেট বন্ধ, ছাদে অনুমতি ছাড়া অনুষ্ঠান নয়।" />
      ) : (
        rules.map((r, i) => (
          <Card key={r.id} onPress={() => remove(r)} style={{ flexDirection: 'row' }}>
            <Text style={{ color: C.primary, fontWeight: '800', width: 28 }}>{toBn(i + 1)}.</Text>
            <Text style={{ flex: 1, color: C.text, lineHeight: 22 }}>{r.text}</Text>
          </Card>
        ))
      )}
      {rules.length > 0 && (
        <Text style={{ color: C.sub, fontSize: 12, marginBottom: 10 }}>মুছতে নিয়মের উপর চাপ দিন।</Text>
      )}

      <Field
        label="নতুন নিয়ম"
        value={text}
        onChangeText={setText}
        placeholder="যেমন: প্রতি মাসের ৫ তারিখের মধ্যে ভাড়া দিতে হবে"
        multiline
      />
      <Btn title="+ নিয়ম যোগ করুন" onPress={add} />

      {rules.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Btn small kind="ghost" style={{ flex: 1 }} title="PDF শেয়ার" onPress={sharePdfRules} />
          <Btn small kind="ghost" style={{ flex: 1 }} title="মেসেজ পাঠান" onPress={shareText} />
        </View>
      )}
    </>
  );
}

export default function NoticeScreen() {
  const nav = useNav();
  const [tab, setTab] = useState('notice');
  return (
    <Screen
      title="নোটিশ ও নিয়ম"
      right={<HeaderAction label="সেটিংস" onPress={() => nav.push('settings')} />}
    >
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Chip label="নোটিশ বোর্ড" active={tab === 'notice'} onPress={() => setTab('notice')} />
        <Chip label="বাসার নিয়ম" active={tab === 'rules'} onPress={() => setTab('rules')} />
      </View>
      {tab === 'notice' ? <NoticesTab /> : <RulesTab />}
    </Screen>
  );
}
