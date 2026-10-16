import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Pressable, View } from 'react-native';
import { Text } from './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSettings, initDb, setSetting } from './src/db';
import { syncReminders } from './src/reminders';
import { AppIcon, NavContext } from './src/ui';
import { setLang } from './src/i18n';
import { C, SHADOW, applyTheme, getMode } from './src/theme';
import { monthKey } from './src/utils';

import HomeScreen from './src/screens/HomeScreen';
import RentScreen from './src/screens/RentScreen';
import BuildingScreen from './src/screens/BuildingScreen';
import BuildingForm from './src/screens/BuildingForm';
import UnitScreen from './src/screens/UnitScreen';
import UnitForm from './src/screens/UnitForm';
import BulkUnits from './src/screens/BulkUnits';
import TenantForm from './src/screens/TenantForm';
import BillScreen from './src/screens/BillScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import NoticeScreen from './src/screens/NoticeScreen';
import NoticeForm from './src/screens/NoticeForm';
import SettingsScreen from './src/screens/SettingsScreen';
import ArrearsScreen from './src/screens/ArrearsScreen';
import LockScreen from './src/screens/LockScreen';
import SplashScreen from './src/screens/SplashScreen';

const SCREENS = {
  building: BuildingScreen,
  buildingForm: BuildingForm,
  unit: UnitScreen,
  unitForm: UnitForm,
  bulkUnits: BulkUnits,
  tenantForm: TenantForm,
  noticeForm: NoticeForm,
  settings: SettingsScreen,
  arrears: ArrearsScreen,
};

const LOCK_AFTER_MS = 60 * 1000; // re-lock if the app was in the background longer than this
const pinOn = () => {
  try {
    return !!getSettings().pin_hash;
  } catch (e) {
    return false;
  }
};

let dbError = null;
try {
  initDb();
  setLang(getSettings().lang); // saved UI language ('bn' | 'en')
  applyTheme(getSettings().theme); // saved theme ('light' | 'dark')
} catch (e) {
  dbError = e;
}

function TabItem({ icon, label, on, onPress }) {
  const lift = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(lift, { toValue: on ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [on]);
  const GOLD = '#D9BE86';
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 }}>
      <Animated.View
        style={{
          position: 'absolute', top: 6, width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
          backgroundColor: C.primary, borderWidth: 5, borderColor: C.bg, opacity: lift,
          transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [14, -22] }) }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      />
      <Animated.View style={{ position: 'absolute', top: 18, transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }] }}>
        <AppIcon name={icon} size={23} color={on ? GOLD : 'rgba(255,255,255,0.55)'} />
      </Animated.View>
      <Text style={{ fontSize: 11, fontWeight: on ? '800' : '600', color: on ? GOLD : 'rgba(255,255,255,0.5)', letterSpacing: 0.2 }}>{label}</Text>
    </Pressable>
  );
}

function TabBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  const items = [
    ['home', 'home', 'বাড়ি'],
    ['rent', 'rent', 'ভাড়া'],
    ['bill', 'bill', 'বিল'],
    ['expense', 'expense', 'খরচ'],
    ['notice', 'notice', 'নোটিশ'],
  ];
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 10, paddingTop: 26, marginTop: -18, backgroundColor: 'transparent' }} pointerEvents="box-none">
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.bar,
          borderRadius: 30,
          paddingHorizontal: 6,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
          ...SHADOW,
          shadowColor: '#000',
          shadowOpacity: 0.28,
        }}
      >
        {items.map(([key, icon, label]) => (
          <TabItem key={key} icon={icon} label={label} on={tab === key} onPress={() => setTab(key)} />
        ))}
      </View>
    </View>
  );
}

function Root() {
  const [stack, setStack] = useState([]); // screens pushed above the tabs
  const [tab, setTab] = useState('home');
  const [month, setMonth] = useState(monthKey());
  const [version, setVersion] = useState(0);
  const [locked, setLocked] = useState(() => !dbError && pinOn());
  const [splash, setSplash] = useState(true);
  const [theme, setThemeState] = useState(getMode());
  const [lang, setLanguageState] = useState(() => (dbError ? 'bn' : getSettings().lang === 'en' ? 'en' : 'bn'));

  // Switch UI language, remember it, and re-plan reminders so notifications use the same language.
  const setLanguage = useCallback((l) => {
    setLang(l);
    try {
      setSetting('lang', l);
    } catch (e) {}
    setLanguageState(l);
    syncReminders().catch(() => {});
  }, []);

  // Switch light/dark and remember the choice.
  const setTheme = useCallback((m) => {
    applyTheme(m);
    try {
      setSetting('theme', m);
    } catch (e) {}
    setThemeState(m);
  }, []);

  // Lock again when the app comes back after being in the background for a while.
  useEffect(() => {
    let leftAt = 0;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') leftAt = Date.now();
      else if (st === 'active' && leftAt && Date.now() - leftAt > LOCK_AFTER_MS && pinOn()) {
        setLocked(true);
        leftAt = 0;
      }
    });
    return () => sub.remove();
  }, []);

  // Re-plan the next months' reminders every time the app opens.
  useEffect(() => {
    if (!dbError) syncReminders().catch(() => {});
  }, []);

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
    () => ({ push, pop, popToTop, bump, version, month, setMonth, tab, setTab, lang, setLanguage, theme, setTheme }),
    [push, pop, popToTop, bump, version, month, tab, lang, setLanguage, theme, setTheme]
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

  if (locked)
    return (
      <View key={lang + theme} style={{ flex: 1 }}>
        <LockScreen onUnlock={() => { setLocked(false); setVersion((v) => v + 1); }} />
        {splash && <SplashScreen onDone={() => setSplash(false)} />}
      </View>
    );

  const top = stack[stack.length - 1];
  const Screen = top ? SCREENS[top.name] : null;

  return (
    <NavContext.Provider value={nav}>
      <StatusBar style="light" />
      <View key={lang + theme} style={{ flex: 1, backgroundColor: C.bg }}>
        {Screen ? (
          <Screen key={stack.length + top.name} {...top.params} />
        ) : (
          <>
            <View style={{ flex: 1 }}>{tab === 'home' ? (
                <HomeScreen />
              ) : tab === 'rent' ? (
                <RentScreen />
              ) : tab === 'bill' ? (
                <BillScreen />
              ) : tab === 'expense' ? (
                <ExpenseScreen />
              ) : (
                <NoticeScreen />
              )}</View>
            <TabBar tab={tab} setTab={setTab} />
          </>
        )}
        {splash && <SplashScreen onDone={() => setSplash(false)} />}
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
