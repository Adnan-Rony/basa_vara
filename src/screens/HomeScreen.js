import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Screen from '../Screen';
import { Btn, Card, Empty, SectionTitle, useNav } from '../ui';
import { getBuildings, getStats } from '../db';
import { C } from '../theme';
import { monthKey, monthLabel, taka, toBn } from '../utils';

function Stat({ label, value, color = C.text }) {
  return (
    <View
      style={{
        width: '48.5%',
        backgroundColor: C.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <Text style={{ color: C.sub, fontSize: 13, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color, fontSize: 20, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const nav = useNav();
  const cur = monthKey();
  const buildings = useMemo(() => getBuildings(), [nav.version]);
  const stats = useMemo(() => getStats(cur), [nav.version, cur]);

  return (
    <Screen title="বাড়িভাড়া ম্যানেজার">
      {buildings.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Text style={{ fontSize: 40 }}>🏠</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginTop: 8 }}>
            স্বাগতম!
          </Text>
          <Text style={{ color: C.sub, textAlign: 'center', marginVertical: 10, lineHeight: 22 }}>
            প্রথমে আপনার বিল্ডিং যোগ করুন। তারপর ইউনিট আর ভাড়াটিয়া যোগ করলেই মাসের ভাড়ার হিসাব
            শুরু করতে পারবেন।
          </Text>
          <Btn title="+ প্রথম বিল্ডিং যোগ করুন" onPress={() => nav.push('buildingForm')} />
        </Card>
      ) : (
        <>
          <SectionTitle>{monthLabel(cur)} মাসের হিসাব</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Stat label="মোট ইউনিট" value={toBn(stats.units)} />
            <Stat label="ভাড়া হয়েছে" value={toBn(stats.occupied)} color={C.ok} />
            <Stat label="খালি" value={toBn(stats.vacant)} color={C.warn} />
            <Stat label="মোট সদস্য" value={toBn(stats.members)} />
            <Stat label="প্রত্যাশিত ভাড়া" value={taka(stats.expected)} />
            <Stat label="আদায় হয়েছে" value={taka(stats.collected)} color={C.ok} />
          </View>
          <Card
            onPress={() => nav.setTab('rent')}
            style={{ backgroundColor: stats.due > 0 ? C.dangerBg : C.okBg, borderColor: 'transparent' }}
          >
            <Text style={{ color: stats.due > 0 ? C.danger : C.ok, fontSize: 13, fontWeight: '700' }}>
              {stats.due > 0 ? `বকেয়া (${toBn(stats.dueCount)} জন)` : 'সব ভাড়া আদায় হয়েছে'}
            </Text>
            <Text style={{ color: stats.due > 0 ? C.danger : C.ok, fontSize: 24, fontWeight: '800' }}>
              {taka(stats.due)}
            </Text>
          </Card>

          <SectionTitle>আমার বিল্ডিং</SectionTitle>
          {buildings.map((b) => (
            <Card key={b.id} onPress={() => nav.push('building', { id: b.id })}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{b.name}</Text>
              {!!b.address && <Text style={{ color: C.sub, marginTop: 2 }}>{b.address}</Text>}
              <Text style={{ color: C.sub, marginTop: 6, fontSize: 13 }}>
                ইউনিট {toBn(b.unit_count)} · ভাড়া হয়েছে {toBn(b.occupied)} · খালি{' '}
                {toBn(Math.max(0, b.unit_count - b.occupied))}
              </Text>
            </Card>
          ))}
          <Btn kind="ghost" title="+ নতুন বিল্ডিং" onPress={() => nav.push('buildingForm')} />
        </>
      )}
      {buildings.length === 0 && <Empty text="" />}
    </Screen>
  );
}
