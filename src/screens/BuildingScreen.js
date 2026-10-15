import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Screen from '../Screen';
import { Badge, Btn, Card, Empty, HeaderAction, useNav } from '../ui';
import { getBuilding, getUnits } from '../db';
import { C } from '../theme';
import { taka, toBn } from '../utils';

export default function BuildingScreen({ id }) {
  const nav = useNav();
  const b = useMemo(() => getBuilding(id), [nav.version, id]);
  const units = useMemo(() => getUnits(id), [nav.version, id]);
  if (!b) return null;

  const occupied = units.filter((u) => u.tenant_id).length;
  const members = units.reduce((s, u) => s + (u.tenant_members || 0), 0);

  return (
    <Screen
      title={b.name}
      onBack={() => nav.pop()}
      right={<HeaderAction label="সম্পাদনা" onPress={() => nav.push('buildingForm', { id })} />}
    >
      {!!b.address && <Text style={{ color: C.sub, marginBottom: 8 }}>{b.address}</Text>}
      <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>ইউনিট</Text>
          <Text style={{ fontWeight: '800', fontSize: 18 }}>{toBn(units.length)}</Text>
        </View>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>ভাড়া হয়েছে</Text>
          <Text style={{ fontWeight: '800', fontSize: 18, color: C.ok }}>{toBn(occupied)}</Text>
        </View>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>খালি</Text>
          <Text style={{ fontWeight: '800', fontSize: 18, color: C.warn }}>
            {toBn(units.length - occupied)}
          </Text>
        </View>
        <View>
          <Text style={{ color: C.sub, fontSize: 12 }}>সদস্য</Text>
          <Text style={{ fontWeight: '800', fontSize: 18 }}>{toBn(members)}</Text>
        </View>
      </Card>

      {units.length === 0 && <Empty text="এখনও কোনো ইউনিট নেই। নিচ থেকে যোগ করুন।" />}
      {units.map((u) => (
        <Card key={u.id} onPress={() => nav.push('unit', { id: u.id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>ইউনিট {u.name}</Text>
            {u.tenant_id ? <Badge text="ভাড়া হয়েছে" kind="ok" /> : <Badge text="খালি" kind="warn" />}
          </View>
          <Text style={{ color: C.sub, marginTop: 4 }}>
            ভাড়া {taka(u.rent + u.service_charge)}
            {u.tenant_id ? ` · ${u.tenant_name} (${toBn(u.tenant_members)} জন)` : ''}
          </Text>
        </Card>
      ))}

      <Btn title="+ নতুন ইউনিট" onPress={() => nav.push('unitForm', { buildingId: id })} />
      <Btn
        kind="ghost"
        style={{ marginTop: 10 }}
        title="একসাথে অনেক ইউনিট তৈরি করুন"
        onPress={() => nav.push('bulkUnits', { buildingId: id })}
      />
    </Screen>
  );
}
