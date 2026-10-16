import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Alert, Text } from '../i18n';
import { getSettings, resetAllData, setSetting } from '../db';
import { C } from '../theme';
import { Gradient } from '../ui';
import { hashPin, toBn } from '../utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [bad, setBad] = useState(false);

  const press = (k) => {
    if (k === '⌫') {
      setPin((p) => p.slice(0, -1));
      setBad(false);
      return;
    }
    if (!k || pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    setBad(false);
    if (next.length === 4) {
      if (hashPin(next) === getSettings().pin_hash) {
        setPin('');
        onUnlock();
      } else {
        setBad(true);
        setTimeout(() => setPin(''), 300);
      }
    }
  };

  const forgot = () =>
    Alert.alert(
      'PIN ভুলে গেছেন?',
      'PIN রিসেট করতে হলে এই ফোনের সব ডেটা (বাড়ি, ভাড়াটিয়া, হিসাব) মুছে যাবে। Backup থাকলে পরে Restore করা যাবে। মুছবেন?',
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'সব মুছে রিসেট',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            setSetting('pin_hash', '');
            onUnlock();
          },
        },
      ]
    );

  return (
    <Gradient colors={['#052B26', '#073B33', '#0B5D4F']} horizontal={false} steps={40} style={{ flex: 1 }}>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 40 }}>🔒</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 8 }}>PIN দিন</Text>
      <View style={{ flexDirection: 'row', marginVertical: 20, gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 16, height: 16, borderRadius: 8, borderWidth: 2,
              borderColor: bad ? '#FCA5A5' : '#fff',
              backgroundColor: i < pin.length ? (bad ? '#FCA5A5' : '#fff') : 'transparent',
            }}
          />
        ))}
      </View>
      {bad && <Text style={{ color: '#FECACA', marginBottom: 8 }}>PIN ভুল</Text>}
      <View style={{ width: 270, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {KEYS.map((k, i) => (
          <Pressable
            key={i}
            onPress={() => press(k)}
            style={{ width: 80, height: 64, margin: 5, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: k ? 'rgba(255,255,255,0.95)' : 'transparent' }}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: C.text }}>{k && k !== '⌫' ? toBn(k) : k}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={forgot} style={{ marginTop: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' }}>PIN ভুলে গেছি</Text>
      </Pressable>
    </View>
    </Gradient>
  );
}
