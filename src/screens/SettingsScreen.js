import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Screen from '../Screen';
import { Btn, Field, Card, useNav } from '../ui';
import { createBackupObject, getSettings, restoreBackupObject, setSetting, validateBackupObject } from '../db';
import { C } from '../theme';

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default function SettingsScreen() {
  const nav = useNav();
  const cur = getSettings();
  const [name, setName] = useState(cur.name ?? '');
  const [phone, setPhone] = useState(cur.phone ?? '');
  const [busy, setBusy] = useState(false);

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
      <Text style={{ color: C.sub, marginBottom: 14, lineHeight: 21 }}>
        এই তথ্য রসিদ আর নোটিশের নিচে বাড়িওয়ালার নাম ও ফোন হিসেবে ছাপা হবে।
      </Text>
      <Field label="আপনার নাম" value={name} onChangeText={setName} placeholder="যেমন: আব্দুর রহমান" />
      <Field label="আপনার ফোন নম্বর" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="০১৭XXXXXXXX" />
      <Btn title="সংরক্ষণ করুন" onPress={save} />

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
