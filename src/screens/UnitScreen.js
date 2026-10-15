import React, { useMemo } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import Screen from '../Screen';
import { Badge, Btn, Card, HeaderAction, Row, SectionTitle, useNav } from '../ui';
import { endTenancy, getActiveTenant, getPastTenants, getTenantPayments, getUnit } from '../db';
import { C } from '../theme';
import { monthLabel, showDate, taka, toBn, typeLabel } from '../utils';

export default function UnitScreen({ id }) {
  const nav = useNav();
  const unit = useMemo(() => getUnit(id), [nav.version, id]);
  const tenant = useMemo(() => getActiveTenant(id), [nav.version, id]);
  const past = useMemo(() => getPastTenants(id), [nav.version, id]);
  const payments = useMemo(() => (tenant ? getTenantPayments(tenant.id).slice(0, 6) : []), [
    nav.version,
    tenant?.id,
  ]);
  if (!unit) return null;

  const leave = () => {
    Alert.alert('ভাড়াটিয়া ছেড়ে দিয়েছেন?', `${tenant.name} কে এই ইউনিট থেকে সরানো হবে। আগের হিসাব থাকবে।`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ, ছেড়ে দিয়েছে',
        onPress: () => {
          endTenancy(tenant.id);
          nav.bump();
        },
      },
    ]);
  };

  return (
    <Screen
      title={`ইউনিট ${unit.name}`}
      onBack={() => nav.pop()}
      right={<HeaderAction label="সম্পাদনা" onPress={() => nav.push('unitForm', { id })} />}
    >
      <Card>
        <Row label="মাসিক ভাড়া" value={taka(unit.rent)} />
        <Row label="সার্ভিস চার্জ" value={taka(unit.service_charge)} />
        <Row label="মোট" value={taka(unit.rent + unit.service_charge)} bold />
        {!!unit.note && <Row label="নোট" value={unit.note} />}
      </Card>

      <SectionTitle>বর্তমান ভাড়াটিয়া</SectionTitle>
      {tenant ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{tenant.name}</Text>
              <Badge text={typeLabel(tenant.type)} kind="info" />
            </View>
            <Row label="সদস্য সংখ্যা" value={`${toBn(tenant.members)} জন`} />
            {!!tenant.phone && <Row label="ফোন" value={toBn(tenant.phone)} />}
            {!!tenant.move_in && <Row label="উঠেছেন" value={showDate(tenant.move_in)} />}
            {tenant.advance > 0 && <Row label="অ্যাডভান্স জমা" value={taka(tenant.advance)} />}
            {!!tenant.note && <Row label="নোট" value={tenant.note} />}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {!!tenant.phone && (
                <Btn
                  small
                  kind="ghost"
                  style={{ flex: 1 }}
                  title="কল করুন"
                  onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
                />
              )}
              <Btn
                small
                kind="ghost"
                style={{ flex: 1 }}
                title="তথ্য সম্পাদনা"
                onPress={() => nav.push('tenantForm', { unitId: id, id: tenant.id })}
              />
            </View>
            <Btn small kind="danger" style={{ marginTop: 8 }} title="ভাড়াটিয়া ছেড়ে দিয়েছে" onPress={leave} />
          </Card>

          <SectionTitle>সাম্প্রতিক ভাড়ার হিসাব</SectionTitle>
          {payments.length === 0 && (
            <Text style={{ color: C.sub, marginBottom: 10 }}>
              এখনও কোনো পেমেন্ট রেকর্ড নেই। "ভাড়া" ট্যাব থেকে পেমেন্ট মার্ক করুন।
            </Text>
          )}
          {payments.map((p) => (
            <Card key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700', color: C.text }}>{monthLabel(p.month)}</Text>
              <Text style={{ color: p.paid >= p.due ? C.ok : C.warn, fontWeight: '700' }}>
                {taka(p.paid)} / {taka(p.due)}
              </Text>
            </Card>
          ))}
        </>
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: C.sub, marginBottom: 10 }}>এই ইউনিট এখন খালি।</Text>
          <Btn title="+ ভাড়াটিয়া যোগ করুন" onPress={() => nav.push('tenantForm', { unitId: id })} />
        </Card>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>আগের ভাড়াটিয়া</SectionTitle>
          {past.map((t) => (
            <Card key={t.id}>
              <Text style={{ fontWeight: '700', color: C.text }}>{t.name}</Text>
              <Text style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>
                {showDate(t.move_in)} — {showDate(t.move_out)}
              </Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
