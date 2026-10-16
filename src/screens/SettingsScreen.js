import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { Alert, Text } from '../i18n';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Screen from '../Screen';
import { Btn, Chip, Field, Card, useNav } from '../ui';
import { createBackupObject, getSettings, restoreBackupObject, setSetting, validateBackupObject } from '../db';
import { C } from '../theme';
import { fromBn, hashPin, toBn, todayISO } from '../utils';
import { askPermission, clampDay, clampHour, nextReminderDates, readReminderSettings, sendTestReminder, syncReminders } from '../reminders';

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default function SettingsScreen() {
  const nav = useNav();
  const cur = getSettings();
  const [name, setName] = useState(cur.name ?? '');
  const [phone, setPhone] = useState(cur.phone ?? '');
  const [busy, setBusy] = useState(false);
  const rem = readReminderSettings();
  const [remOn, setRemOn] = useState(rem.on);
  const [remDay, setRemDay] = useState(String(rem.day));
  const [remHour, setRemHour] = useState(String(rem.hour));

  const fmtWhen = (d) =>
    `${toBn(d.getDate())}/${toBn(d.getMonth() + 1)}/${toBn(d.getFullYear())}, সময় ${toBn(String(d.getHours()).padStart(2, '0'))}:০০`;

  const saveReminder = async () => {
    const dayNum = Number(fromBn(remDay));
    const hourNum = Number(fromBn(remHour));
    if (remOn && !(dayNum >= 1 && dayNum <= 28)) return Alert.alert('তারিখ ঠিক নেই', 'মাসের ১ থেকে ২৮ এর মধ্যে একটি তারিখ দিন।');
    if (remOn && !(hourNum >= 0 && hourNum <= 23)) return Alert.alert('সময় ঠিক নেই', 'ঘণ্টা ০ থেকে ২৩ এর মধ্যে দিন (যেমন ৯ = সকাল ৯টা, ১৮ = সন্ধ্যা ৬টা)।');
    const day = clampDay(dayNum);
    const hour = clampHour(hourNum);
    try {
      if (remOn && !(await askPermission())) {
        setRemOn(false);
        setSetting('reminder_on', '0');
        await syncReminders();
        return Alert.alert('অনুমতি পাওয়া যায়নি', 'ফোনের সেটিংস থেকে এই অ্যাপের নোটিফিকেশন চালু করে আবার চেষ্টা করুন।');
      }
      setSetting('reminder_on', remOn ? '1' : '0');
      setSetting('reminder_day', String(day));
      setSetting('reminder_hour', String(hour));
      setRemDay(String(day));
      setRemHour(String(hour));
      const res = await syncReminders();
      Alert.alert(
        'সংরক্ষণ হয়েছে',
        remOn && res.first ? `পরের রিমাইন্ডার: ${fmtWhen(res.first)}` : 'রিমাইন্ডার বন্ধ আছে।'
      );
    } catch (e) {
      Alert.alert('রিমাইন্ডার চালু করা যায়নি', String(e?.message || e));
    }
  };

  const testReminder = async () => {
    try {
      if (!(await askPermission())) {
        return Alert.alert('অনুমতি পাওয়া যায়নি', 'ফোনের সেটিংস থেকে নোটিফিকেশন চালু করুন।');
      }
      await sendTestReminder();
      Alert.alert('টেস্ট পাঠানো হলো', '৫ সেকেন্ডের মধ্যে নোটিফিকেশন আসবে। অ্যাপটি background-এ নিলে ভালো দেখা যাবে।');
    } catch (e) {
      Alert.alert('টেস্ট হয়নি', String(e?.message || e));
    }
  };

  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [hasPin, setHasPin] = useState(!!cur.pin_hash);
  const savePin = () => {
    const p = fromBn(pin1).trim();
    if (!/^\d{4}$/.test(p)) return Alert.alert('PIN ঠিক নেই', '৪ অঙ্কের একটি PIN দিন।');
    if (p !== fromBn(pin2).trim()) return Alert.alert('PIN মেলেনি', 'দুইবার একই PIN লিখুন।');
    setSetting('pin_hash', hashPin(p));
    setHasPin(true);
    setPin1('');
    setPin2('');
    Alert.alert('PIN চালু হয়েছে', 'এখন থেকে অ্যাপ খুলতে PIN লাগবে। PIN ভুলে গেলে শুধু সব ডেটা মুছে রিসেট করা যায়, তাই আগে Backup নিয়ে রাখুন।');
  };
  const removePin = () =>
    Alert.alert('PIN বন্ধ করবেন?', 'অ্যাপ আর লক থাকবে না।', [
      { text: 'না', style: 'cancel' },
      {
        text: 'বন্ধ করুন',
        style: 'destructive',
        onPress: () => {
          setSetting('pin_hash', '');
          setHasPin(false);
        },
      },
    ]);

  const save = () => {
    setSetting('name', name.trim());
    setSetting('phone', phone.trim());
    nav.bump();
    Alert.alert('সংরক্ষণ হয়েছে');
    nav.pop();
  };

  const exportBackup = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const backup = createBackupObject();
      const json = JSON.stringify(backup, null, 2);
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error('এই ডিভাইসে ফাইল সংরক্ষণের জায়গা পাওয়া যায়নি।');
      const fileUri = `${baseDir}barivara-backup-${timestampForFile()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('ব্যাকআপ তৈরি হয়েছে', `ফাইল তৈরি হয়েছে:\n${fileUri}`);
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'বাড়িভাড়া ম্যানেজার ব্যাকআপ সংরক্ষণ করুন',
        UTI: 'public.json',
      });
      setSetting('last_backup', todayISO());
      nav.bump();
    } catch (error) {
      Alert.alert('ব্যাকআপ করা যায়নি', error?.message || 'আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  const chooseRestore = () => {
    if (busy) return;
    Alert.alert(
      'ব্যাকআপ Restore করবেন?',
      'Restore করলে এই ফোনের বর্তমান বাড়ি, ইউনিট, ভাড়াটিয়া, ভাড়া, পেমেন্ট, খরচ, নোটিশ, নিয়ম ও সেটিংস ব্যাকআপের তথ্য দিয়ে প্রতিস্থাপিত হবে। আগে বর্তমান ডেটার Backup নিয়ে নিন।',
      [
        { text: 'বাতিল', style: 'cancel' },
        { text: 'ব্যাকআপ বাছাই করুন', style: 'destructive', onPress: importBackup },
      ]
    );
  };

  const importBackup = async () => {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: '*/*', // WhatsApp/Drive often give .json as octet-stream, so don't filter by type
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      let raw;
      try {
        raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      } catch {
        throw new Error('ফাইলটি পড়া যায়নি। অন্য একটি JSON ব্যাকআপ বাছাই করুন।');
      }
      let backup;
      try {
        backup = JSON.parse(raw);
      } catch {
        throw new Error('ফাইলটি বৈধ JSON নয়।');
      }

      // Validate before showing the final destructive confirmation.
      // restoreBackupObject validates again immediately before its transaction.
      validateBackupObject(backup);
      const counts = Object.entries(backup.tables)
        .map(([table, rows]) => `${table}: ${rows.length}`)
        .join('\n');
      Alert.alert(
        'Restore নিশ্চিত করুন',
        `ব্যাকআপ তৈরি: ${backup.createdAt || 'তারিখ নেই'}\n\n${counts}\n\nবর্তমান ডেটা প্রতিস্থাপিত হবে। এগিয়ে যাবেন?`,
        [
          { text: 'বাতিল', style: 'cancel' },
          {
            text: 'Restore করুন',
            style: 'destructive',
            onPress: () => {
              try {
                restoreBackupObject(backup);
                const fresh = getSettings();
                setName(fresh.name ?? '');
                setPhone(fresh.phone ?? '');
                syncReminders().catch(() => {});
                nav.bump();
                Alert.alert('Restore সম্পন্ন', 'ব্যাকআপের তথ্য সফলভাবে ফিরিয়ে আনা হয়েছে।');
              } catch (error) {
                Alert.alert('Restore করা যায়নি', error?.message || 'বর্তমান ডেটা অপরিবর্তিত রাখা হয়েছে।');
              }
            },
          },
        ]
      );
    } catch (error) {
      if (error?.message) Alert.alert('Restore করা যায়নি', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="সেটিংস" onBack={() => nav.pop()}>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>ভাষা / Language</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Chip label="বাংলা" active={nav.lang !== 'en'} onPress={() => nav.setLanguage('bn')} />
        <Chip label="English" active={nav.lang === 'en'} onPress={() => nav.setLanguage('en')} />
      </View>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>থিম / Theme</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Chip label="Light" active={nav.theme !== 'dark'} onPress={() => nav.setTheme('light')} />
        <Chip label="Dark" active={nav.theme === 'dark'} onPress={() => nav.setTheme('dark')} />
      </View>
      <Text style={{ color: C.sub, marginBottom: 14, lineHeight: 21 }}>
        এই তথ্য রসিদ আর নোটিশের নিচে বাড়িওয়ালার নাম ও ফোন হিসেবে ছাপা হবে।
      </Text>
      <Field label="আপনার নাম" value={name} onChangeText={setName} placeholder="যেমন: আব্দুর রহমান" />
      <Field label="আপনার ফোন নম্বর" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="০১৭XXXXXXXX" />
      <Btn title="সংরক্ষণ করুন" onPress={save} />

      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 8 }}>
        অ্যাপ লক (PIN)
      </Text>
      <Card>
        <Text style={{ color: C.sub, lineHeight: 21, marginBottom: 10 }}>
          {hasPin ? 'PIN চালু আছে। নতুন PIN দিলে বদলে যাবে।' : '৪ অঙ্কের PIN দিয়ে অ্যাপ লক করুন, যাতে অন্য কেউ আপনার ভাড়ার হিসাব দেখতে না পারে।'}
        </Text>
        <Field label="নতুন PIN (৪ অঙ্ক)" value={pin1} onChangeText={setPin1} keyboardType="number-pad" secureTextEntry maxLength={4} />
        <Field label="PIN আবার লিখুন" value={pin2} onChangeText={setPin2} keyboardType="number-pad" secureTextEntry maxLength={4} />
        <Btn title={hasPin ? 'PIN বদলান' : 'PIN চালু করুন'} onPress={savePin} />
        {hasPin && <Btn small kind="danger" style={{ marginTop: 10 }} title="PIN বন্ধ করুন" onPress={removePin} />}
      </Card>

      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 8 }}>
        ভাড়া আদায়ের রিমাইন্ডার
      </Text>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>প্রতি মাসে নোটিফিকেশন পাঠান</Text>
          <Switch value={remOn} onValueChange={setRemOn} trackColor={{ true: C.primary }} />
        </View>
        {remOn && (
          <>
            <Field label="মাসের কত তারিখে (১–২৮)" value={remDay} onChangeText={setRemDay} keyboardType="number-pad" placeholder="৫" />
            <Field label="কটার সময় (০–২৩, যেমন ৯ = সকাল ৯টা)" value={remHour} onChangeText={setRemHour} keyboardType="number-pad" placeholder="৯" />
          </>
        )}
        <Btn title="রিমাইন্ডার সংরক্ষণ করুন" onPress={saveReminder} />
        <View style={{ height: 10 }} />
        <Btn kind="ghost" title="টেস্ট নোটিফিকেশন (৫ সেকেন্ড পরে)" onPress={testReminder} />
        <Text style={{ color: C.sub, fontSize: 12, lineHeight: 18, marginTop: 10 }}>
          রিমাইন্ডার ফোনেই সেট থাকে, ইন্টারনেট লাগে না। অ্যাপ খুললে পরের ৬ মাসের রিমাইন্ডার নতুন করে সাজানো হয়, তাই মাঝে মাঝে অ্যাপ খুলবেন। ফোন বন্ধ করে চালু করলেও থাকে।
        </Text>
      </Card>

      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 8 }}>
        ডেটা Backup & Restore
      </Text>
      <Card>
        <Text style={{ color: C.sub, lineHeight: 21, marginBottom: 12 }}>
          আপনার বাড়ি, ইউনিট, ভাড়াটিয়া, ভাড়ার হিসাব, পেমেন্টের ইতিহাস, খরচ, নোটিশ, নিয়ম ও সেটিংস JSON ফাইলে Backup করুন। ফোন বদলালে এই ফাইল দিয়ে ডেটা Restore করতে পারবেন।
        </Text>
        <Btn title={busy ? 'অপেক্ষা করুন…' : '⬇ Backup তৈরি ও Share করুন'} onPress={exportBackup} />
        <View style={{ height: 10 }} />
        <Btn title={busy ? 'অপেক্ষা করুন…' : '⬆ JSON Backup থেকে Restore'} kind="ghost" onPress={chooseRestore} />
      </Card>
      <Text style={{ color: C.danger, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 20 }}>
        সতর্কতা: Restore করলে বর্তমান ডেটা প্রতিস্থাপিত হবে। Restore করার আগে বর্তমান ডেটার Backup তৈরি করে রাখুন।
      </Text>
    </Screen>
  );
}
