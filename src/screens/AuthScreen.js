import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { C } from '../theme';

const DEFAULT_API_URL = 'http://192.168.1.100:4000/api';

export default function AuthScreen({ onAuthenticated, savedApiUrl = '' }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('landlord');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState(savedApiUrl || DEFAULT_API_URL);
  const [showApi, setShowApi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    setError('');
    setMessage('');
    const base = apiUrl.trim().replace(/\/+$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      setError('API URL http:// বা https:// দিয়ে শুরু করতে হবে।');
      return;
    }
    if (!phone.trim() || !password) {
      setError('ফোন নম্বর ও পাসওয়ার্ড লিখুন।');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('আপনার নাম লিখুন।');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }
    setBusy(true);
    try {
      await SecureStore.setItemAsync('barivara_api_url', base);
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const payload = mode === 'register'
        ? { name: name.trim(), phone: phone.trim(), password, role }
        : { phone: phone.trim(), password };
      const response = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'লগইন করা যায়নি। সার্ভার ও API URL পরীক্ষা করুন।');
      await SecureStore.setItemAsync('barivara_auth_token', data.token);
      await SecureStore.setItemAsync('barivara_api_url', base);
      onAuthenticated({ user: data.user, token: data.token, apiUrl: base });
    } catch (e) {
      const raw = String(e?.message || e);
      if (raw.includes('Network request failed') || raw.includes('Failed to fetch')) {
        setError('সার্ভারে সংযোগ হচ্ছে না। সার্ভার চালু আছে কি না এবং API URL-এ কম্পিউটারের সঠিক Wi-Fi IP দেওয়া আছে কি না দেখুন।');
      } else {
        setError(raw);
      }
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = { borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: C.text, fontSize: 16, marginTop: 6, marginBottom: 14 };
  const labelStyle = { color: C.sub, fontWeight: '600', fontSize: 13 };
  const field = (label, value, setter, options = {}) => (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <TextInput value={value} onChangeText={setter} placeholder={options.placeholder || ''} placeholderTextColor="#9CA3AF" keyboardType={options.keyboardType} autoCapitalize={options.autoCapitalize || 'none'} secureTextEntry={options.secureTextEntry} autoCorrect={false} style={inputStyle} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 44 }}>🏠</Text>
          <Text style={{ fontSize: 25, fontWeight: '800', color: C.primary, marginTop: 8 }}>বাড়িভাড়া ম্যানেজার</Text>
          <Text style={{ color: C.sub, fontSize: 14, marginTop: 5, textAlign: 'center' }}>বাড়িওয়ালা ও ভাড়াটিয়ার জন্য</Text>
        </View>
        <View style={{ backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.text, fontSize: 21, fontWeight: '800', marginBottom: 5 }}>{mode === 'login' ? 'লগইন করুন' : 'নতুন অ্যাকাউন্ট খুলুন'}</Text>
          <Text style={{ color: C.sub, marginBottom: 18 }}>{mode === 'login' ? 'আপনার ফোন নম্বর ও পাসওয়ার্ড দিন।' : 'আপনার পরিচয় অনুযায়ী অ্যাকাউন্ট তৈরি করুন।'}</Text>
          {mode === 'register' && <>
            {field('আপনার নাম', name, setName, { placeholder: 'পূর্ণ নাম', autoCapitalize: 'words' })}
            <Text style={labelStyle}>আপনি কে?</Text>
            <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 16 }}>
              {[['landlord', '🏠 বাড়িওয়ালা'], ['tenant', '🧑‍💼 ভাড়াটিয়া']].map(([value, label]) => (
                <Pressable key={value} onPress={() => setRole(value)} style={{ flex: 1, paddingVertical: 11, marginRight: value === 'landlord' ? 8 : 0, borderRadius: 10, alignItems: 'center', backgroundColor: role === value ? C.primary : '#fff', borderWidth: 1, borderColor: role === value ? C.primary : C.line }}>
                  <Text style={{ fontWeight: '700', color: role === value ? '#fff' : C.text }}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </>}
          {field('ফোন নম্বর', phone, setPhone, { placeholder: 'যেমন: 01XXXXXXXXX', keyboardType: 'phone-pad' })}
          {field('পাসওয়ার্ড', password, setPassword, { placeholder: mode === 'register' ? 'কমপক্ষে ৮ অক্ষর' : 'আপনার পাসওয়ার্ড', secureTextEntry: true })}
          <Pressable onPress={() => setShowApi((v) => !v)} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>{showApi ? '− সার্ভার সেটিংস লুকান' : '⚙ সার্ভার সেটিংস / API URL'}</Text>
          </Pressable>
          {showApi && <>
            {field('API URL', apiUrl, setApiUrl, { placeholder: DEFAULT_API_URL, autoCapitalize: 'none' })}
            <Text style={{ color: C.sub, fontSize: 12, marginTop: -8, marginBottom: 12 }}>কম্পিউটার ও ফোন একই Wi-Fi-তে রাখুন। এখানে কম্পিউটারের IPv4 ঠিকানা বসান।</Text>
          </>}
          {!!error && <View style={{ backgroundColor: C.dangerBg, padding: 11, borderRadius: 9, marginBottom: 12 }}><Text style={{ color: C.danger, lineHeight: 20 }}>{error}</Text></View>}
          {!!message && <Text style={{ color: C.ok, marginBottom: 10 }}>{message}</Text>}
          <Pressable disabled={busy} onPress={submit} style={{ backgroundColor: C.primary, paddingVertical: 14, borderRadius: 11, alignItems: 'center', opacity: busy ? 0.7 : 1 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{mode === 'login' ? 'লগইন' : 'অ্যাকাউন্ট তৈরি করুন'}</Text>}
          </Pressable>
          <Pressable onPress={() => { setMode((m) => m === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }} style={{ alignItems: 'center', paddingTop: 17 }}>
            <Text style={{ color: C.primary, fontWeight: '700' }}>{mode === 'login' ? 'নতুন ব্যবহারকারী? অ্যাকাউন্ট খুলুন' : 'আগে অ্যাকাউন্ট আছে? লগইন করুন'}</Text>
          </Pressable>
        </View>
        <Text style={{ textAlign: 'center', color: C.sub, fontSize: 12, lineHeight: 18, marginTop: 16 }}>এটি অনলাইন লগইন। কাজ করতে ব্যাকএন্ড সার্ভার ও MongoDB চালু থাকতে হবে।</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
