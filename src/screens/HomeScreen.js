import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '../i18n';
import Screen from '../Screen';
import { AppIcon, Btn, Card, Empty, Gradient, HeaderAction, SectionTitle, useNav } from '../ui';
import { getBuildings, getSettings, getStats } from '../db';
import { C, SHADOW, SOFT_SHADOW, isDark } from '../theme';
import { daysSince, monthKey, monthLabel, taka, toBn } from '../utils';

function MiniIcon({ name, color = C.primary, dark = false }) {
  return (
    <View style={{
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: dark ? 'rgba(255,255,255,0.12)' : `${color}12`,
      borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.14)' : `${color}18`,
      alignItems: 'center', justifyContent: 'center'
    }}>
      <AppIcon name={name} size={20} color={dark ? '#fff' : color} />
    </View>
  );
}

function Stat({ label, value, color = C.text, icon, hint }) {
  return (
    <View style={{
      width: '48.4%', minHeight: 124, backgroundColor: C.card,
      borderRadius: 24, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: C.line, ...SOFT_SHADOW,
      justifyContent: 'space-between', overflow: 'hidden'
    }}>
      <View style={{ position: 'absolute', right: -12, top: -12, width: 58, height: 58, borderRadius: 30, backgroundColor: `${color === C.text ? C.primary : color}08` }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MiniIcon name={icon} color={color === C.text ? C.primary : color} />
        <View style={{ width: 24, height: 4, borderRadius: 5, backgroundColor: color === C.text ? C.primary : color, opacity: 0.22 }} />
      </View>
      <View style={{ marginTop: 14 }}>
        <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', letterSpacing: 0.15 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
          <Text style={{ color, fontSize: 27, fontWeight: '900', letterSpacing: -0.4 }}>{value}</Text>
          {!!hint && <Text style={{ color: C.muted, fontSize: 10, fontWeight: '700', marginLeft: 5, marginBottom: 5 }}>{hint}</Text>}
        </View>
      </View>
    </View>
  );
}

function BuildingCard({ building, onPress }) {
  const occupied = Number(building.occupied || 0);
  const units = Number(building.unit_count || 0);
  const rate = units ? Math.round((occupied / units) * 100) : 0;
  return (
    <Card onPress={onPress} style={{ padding: 0, overflow: 'hidden', borderRadius: 24, marginBottom: 12 }}>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <AppIcon name="building" size={23} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: C.text }} numberOfLines={1}>{building.name}</Text>
          {!!building.address && <Text style={{ color: C.sub, marginTop: 2, fontSize: 12 }} numberOfLines={1}>{building.address}</Text>}
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="back" size={15} color={C.primary} />
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: C.line }} />
      <View style={{ padding: 16, paddingTop: 13 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
          <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700' }}>Occupancy</Text>
          <Text style={{ color: C.primary, fontSize: 12, fontWeight: '900' }}>{toBn(rate)}%</Text>
        </View>
        <View style={{ height: 7, borderRadius: 8, backgroundColor: C.surface, overflow: 'hidden' }}>
          <Gradient colors={[C.primary, C.primaryLight]} steps={20} style={{ width: `${Math.min(100, rate)}%`, height: 7, borderRadius: 8 }} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Text style={{ color: C.sub, fontSize: 12 }}>ইউনিট {toBn(units)}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginHorizontal: 8 }}>•</Text>
          <Text style={{ color: C.ok, fontSize: 12, fontWeight: '700' }}>ভাড়া {toBn(occupied)}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginHorizontal: 8 }}>•</Text>
          <Text style={{ color: C.warn, fontSize: 12, fontWeight: '700' }}>খালি {toBn(Math.max(0, units - occupied))}</Text>
        </View>
      </View>
    </Card>
  );
}

export default function HomeScreen() {
  const nav = useNav();
  const cur = monthKey();
  const buildings = useMemo(() => getBuildings(), [nav.version]);
  const stats = useMemo(() => getStats(cur), [nav.version, cur]);
  const ago = useMemo(() => daysSince(getSettings().last_backup), [nav.version]);
  const percent = stats.expected > 0 ? Math.min(100, Math.round((stats.collected / stats.expected) * 100)) : 0;

  return (
    <Screen
      title="বাড়িভাড়া ম্যানেজার"
      right={<HeaderAction icon="settings" onPress={() => nav.push('settings')} />}
    >
      {buildings.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 30, borderRadius: 26 }}>
          <MiniIcon name="home" color={C.primary} />
          <Text style={{ fontSize: 19, fontWeight: '900', color: C.text, marginTop: 12 }}>স্বাগতম!</Text>
          <Text style={{ color: C.sub, textAlign: 'center', marginVertical: 10, lineHeight: 22 }}>
            প্রথমে আপনার বিল্ডিং যোগ করুন। তারপর ইউনিট আর ভাড়াটিয়া যোগ করলেই মাসের ভাড়ার হিসাব শুরু করতে পারবেন।
          </Text>
          <Btn title="+ প্রথম বিল্ডিং যোগ করুন" onPress={() => nav.push('buildingForm')} />
        </Card>
      ) : (
        <>
          <Gradient colors={[C.primaryDeep, C.primaryDark, C.primary]} steps={42} style={{ borderRadius: 28, padding: 19, marginBottom: 15, ...SHADOW }}>
            <View style={{ position: 'absolute', right: -34, top: -42, width: 150, height: 150, borderRadius: 80, borderWidth: 24, borderColor: 'rgba(255,255,255,0.045)' }} />
            <View style={{ position: 'absolute', right: 34, bottom: -52, width: 110, height: 110, borderRadius: 60, borderWidth: 18, borderColor: 'rgba(210,178,122,0.10)' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MiniIcon name="rent" dark />
                <View style={{ marginLeft: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }}>MONTHLY OVERVIEW</Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 1 }}>{monthLabel(cur)} মাস</Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                <Text style={{ color: '#E8D5AE', fontSize: 11, fontWeight: '900' }}>{toBn(percent)}% COLLECTED</Text>
              </View>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.67)', fontSize: 12, marginTop: 21, fontWeight: '700' }}>আদায় হয়েছে</Text>
            <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -0.8, marginTop: 1 }}>{taka(stats.collected)}</Text>
            <View style={{ height: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Gradient colors={['#C9A869', '#EBDDBB']} steps={18} style={{ width: `${percent}%`, height: 9, borderRadius: 10 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 }}>
              <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 11 }}>প্রত্যাশিত {taka(stats.expected)}</Text>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{toBn(percent)}%</Text>
            </View>
          </Gradient>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Stat label="মোট ইউনিট" value={toBn(stats.units)} icon="building" hint="units" />
            <Stat label="ভাড়া হয়েছে" value={toBn(stats.occupied)} color={C.ok} icon="users" hint="occupied" />
            <Stat label="খালি" value={toBn(stats.vacant)} color={C.warn} icon="building" hint="vacant" />
            <Stat label="মোট সদস্য" value={toBn(stats.members)} icon="users" hint="members" />
          </View>

          <Card
            onPress={() => nav.setTab('rent')}
            style={{
              borderRadius: 23, padding: 16, marginBottom: 14,
              backgroundColor: stats.due > 0 ? C.warnBg : C.okBg,
              borderColor: C.line,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
                <AppIcon name="rent" size={20} color={stats.due > 0 ? C.warn : C.ok} />
              </View>
              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '900' }}>{stats.due > 0 ? `বকেয়া ভাড়া · ${toBn(stats.dueCount)} জন` : 'সব ভাড়া আদায় হয়েছে'}</Text>
                <Text style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>{stats.due > 0 ? 'আজকের collection follow-up দেখুন' : 'এই মাসের collection status excellent'}</Text>
              </View>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="back" size={14} color={stats.due > 0 ? C.warn : C.ok} />
              </View>
            </View>
            <Text style={{ color: stats.due > 0 ? C.warn : C.ok, fontSize: 25, fontWeight: '900', marginTop: 11 }}>{taka(stats.due)}</Text>
          </Card>

          {(ago === null || ago > 14) && (
            <Card onPress={() => nav.push('settings')} style={{ backgroundColor: C.warnBg, borderColor: C.line, borderRadius: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MiniIcon name="warning" color={C.warn} />
                <View style={{ flex: 1, marginLeft: 11 }}>
                  <Text style={{ color: C.text, fontWeight: '900', fontSize: 13 }}>ডেটার ব্যাকআপ দরকার</Text>
                  <Text style={{ color: C.sub, marginTop: 3, fontSize: 11, lineHeight: 17 }}>
                    {ago === null ? 'এখনও ব্যাকআপ নেওয়া হয়নি।' : `শেষ ব্যাকআপ ${toBn(ago)} দিন আগে।`} আপনার হিসাব নিরাপদ রাখতে এখনই ব্যাকআপ নিন।
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <SectionTitle>আমার বিল্ডিং</SectionTitle>
            <Btn kind="ghost" small title="+ নতুন" onPress={() => nav.push('buildingForm')} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8 }} />
          </View>
          {buildings.map((b) => <BuildingCard key={b.id} building={b} onPress={() => nav.push('building', { id: b.id })} />)}
        </>
      )}
      {buildings.length === 0 && <Empty text="" />}
    </Screen>
  );
}
