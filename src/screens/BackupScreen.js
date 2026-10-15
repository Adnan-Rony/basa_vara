import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import Screen from '../Screen';
import { Btn, Card, Row, SectionTitle, useNav } from '../ui';
import { getSettings } from '../db';
import {
  buildBackup,
  exportBackup,
  hasSafetyCopy,
  pickBackup,
  restoreBackup,
  undoLastRestore,
} from '../backup';
import { showDate, toBn } from '../utils';
import { C } from '../theme';

const summary = (c) =>
  `${toBn(c.buildings)}টি বিল্ডিং, ${toBn(c.units)}টি ইউনিট, ${toBn(c.tenants)} জন ভাড়াটিয়া, ${toBn(c.payments)}টি মাসের হিসাব`;

export default function BackupScreen() {
  const nav = useNav();
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0); // re-read counts after a backup
  const counts = buildBackup().counts;
  const last = getSettings().last_backup;
  const canUndo = hasSafetyCopy();

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('সমস্যা হয়েছে', String(e?.message || e));
    } finally {
      setBusy(false);
      setTick((t) => t + 1);
    }
  };

  const backup = () =>
    run(async () => {
      await exportBackup();
    });

  const finish = (title) => {
    nav.bump();
    nav.setTab('home');
    nav.popToTop();
    Alert.alert(title);
  };

  const restore = () =>
    run(async () => {
      const picked = await pickBackup();
      if (!picked) return;
      Alert.alert(
        'ব্যাকআপ থেকে ফিরিয়ে আনবে?',
        `ব্যাকআপ ফাইলে আছে:\n${summary(picked.counts)}\n\nএখন অ্যাপে আছে:\n${summary(counts)}\n\n` +
          'এখনকার সব ডেটা মুছে ব্যাকআপের ডেটা বসবে। তার আগে এখনকার ডেটার একটা সেফটি কপি অ্যাপের ভেতরে রাখা হবে।',
        [
          { text: 'বাতিল', style: 'cancel' },
          {
            text: 'ফিরিয়ে আনো',
            style: 'destructive',
            onPress: () =>
              run(async () => {
                restoreBackup(picked.backup);
                finish('ডেটা ফিরিয়ে আনা হয়েছে');
              }),
          },
        ]
      );
    });

  const undo = () =>
    Alert.alert(
      'শেষ রিস্টোর বাতিল করবে?',
      'রিস্টোরের আগের ডেটা আবার ফিরে আসবে। এখনকার ডেটা মুছে যাবে।',
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'হ্যাঁ, বাতিল করো',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await undoLastRestore();
              finish('আগের ডেটা ফিরে এসেছে');
            }),
        },
      ]
    );

  return (
    <Screen title="ব্যাকআপ ও রিস্টোর" onBack={() => nav.pop()}>
      <Text style={{ color: C.sub, marginBottom: 14, lineHeight: 21 }}>
        আপনার সব ডেটা শুধু এই ফোনে আছে। ফোন হারালে বা অ্যাপ মুছলে ডেটাও যাবে। তাই নিয়মিত ব্যাকআপ নিয়ে Google Drive, WhatsApp বা ইমেইলে রাখুন।
      </Text>

      <Card>
        <Row label="এখন অ্যাপে আছে" value={summary(counts)} />
        <Row label="শেষ ব্যাকআপ" value={last ? showDate(last.slice(0, 10)) : 'এখনো নেওয়া হয়নি'} />
      </Card>

      <SectionTitle>ব্যাকআপ নিন</SectionTitle>
      <Btn title={busy ? 'অপেক্ষা করুন...' : 'ব্যাকআপ ফাইল তৈরি ও সেভ করুন'} onPress={backup} />

      <SectionTitle>ব্যাকআপ থেকে ফিরিয়ে আনুন</SectionTitle>
      <Text style={{ color: C.sub, marginBottom: 10, lineHeight: 21 }}>
        নতুন ফোনে বা অ্যাপ মোছার পরে আগের ব্যাকআপ ফাইল বেছে নিন। ফাইল ঠিক আছে কি না আগে যাচাই করা হয়।
      </Text>
      <Btn kind="ghost" title="ব্যাকআপ ফাইল বেছে নিন" onPress={restore} />

      {canUndo ? (
        <>
          <SectionTitle>ভুল হলে</SectionTitle>
          <Btn kind="danger" title="শেষ রিস্টোর বাতিল করুন" onPress={undo} />
        </>
      ) : null}
    </Screen>
  );
}
