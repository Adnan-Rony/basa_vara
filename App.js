import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { initDb } from './src/db';
import { NavContext } from './src/ui';
import { C } from './src/theme';
import { monthKey } from './src/utils';

import HomeScreen from './src/screens/HomeScreen';
import RentScreen from './src/screens/RentScreen';
import BuildingScreen from './src/screens/BuildingScreen';
import BuildingForm from './src/screens/BuildingForm';
import UnitScreen from './src/screens/UnitScreen';
import UnitForm from './src/screens/UnitForm';
import BulkUnits from './src/screens/BulkUnits';
import TenantForm from './src/screens/TenantForm';
import NoticeScreen from './src/screens/NoticeScreen';
import NoticeForm from './src/screens/NoticeForm';
import SettingsScreen from './src/screens/SettingsScreen';

const SCREENS = {
  building: BuildingScreen,
  buildingForm: BuildingForm,
  unit: UnitScreen,
  unitForm: UnitForm,
  bulkUnits: BulkUnits,
  tenantForm: TenantForm,
  noticeForm: NoticeForm,
  settings: SettingsScreen,
};

let dbError = null;
try {
  initDb();
} catch (e) {
  dbError = e;
}

function TabBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  const items = [
    ['home', '🏠', 'বাড়ি'],
    ['rent', '💰', 'ভাড়া'],
    ['notice', '📢', 'নোটিশ'],
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: C.line,
        paddingBottom: insets.bottom,
      }}
    >
      {items.map(([key, icon, label]) => (
        <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: tab === key ? C.primary : C.sub }}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Root() {
  const [stack, setStack] = useState([]); // screens pushed above the tabs
  const [tab, setTab] = useState('home');
  const [month, setMonth] = useState(monthKey());
  const [version, setVersion] = useState(0);

  const push = useCallback((name, params = {}) => setStack((s) => [...s, { name, params }]), []);
  const pop = useCallback((n = 1) => setStack((s) => s.slice(0, Math.max(0, s.length - n))), []);
  const popToTop = useCallback(() => setStack([]), []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 0) {
        pop();
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  const nav = useMemo(
    () => ({ push, pop, popToTop, bump, version, month, setMonth, tab, setTab }),
    [push, pop, popToTop, bump, version, month, tab]
  );

  if (dbError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: C.danger, textAlign: 'center' }}>
          ডাটাবেস চালু করা যায়নি: {String(dbError.message || dbError)}
        </Text>
      </View>
    );
  }

  const top = stack[stack.length - 1];
  const Screen = top ? SCREENS[top.name] : null;

  return (
    <NavContext.Provider value={nav}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {Screen ? (
          <Screen key={stack.length + top.name} {...top.params} />
        ) : (
          <>
            <View style={{ flex: 1 }}>{tab === 'home' ? <HomeScreen /> : tab === 'rent' ? <RentScreen /> : <NoticeScreen />}</View>
            <TabBar tab={tab} setTab={setTab} />
          </>
        )}
      </View>
    </NavContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}
