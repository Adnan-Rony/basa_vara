import { Platform } from 'react-native';
import { getSettings, getStats } from './db';
import { monthKey } from './utils';
import { tr } from './i18n';

// Local (on-device) reminders only. No server needed. Needs a build that includes expo-notifications native code (see README).
const CHANNEL = 'rent-reminders';
const MONTHS_AHEAD = 6; // schedule this many future reminders; re-planned on every app start

// expo-notifications needs its native module. If this build/Expo Go doesn't have it,
// importing it at top level crashes the whole app ("Cannot find native module"),
// so load it lazily and let the rest of the app keep working.
let _N = null;
let _tried = false;
function getN() {
  if (!_tried) {
    _tried = true;
    try {
      _N = require('expo-notifications');
      // Show the reminder as a banner even if the app is open when it fires.
      _N.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (e) {
      _N = null;
    }
  }
  return _N;
}
const NEEDS_BUILD = 'এই ভার্সনে নোটিফিকেশন সাপোর্ট নেই। অ্যাপের নতুন APK বিল্ড করে ইনস্টল করুন (Expo Go পুরনো হলে সেটা আপডেট করুন)।';
function N() {
  const n = getN();
  if (!n) throw new Error(tr(NEEDS_BUILD));
  return n;
}

export const clampDay = (n) => Math.min(28, Math.max(1, Math.floor(Number(n)) || 5));
export const clampHour = (n) => {
  const h = Math.floor(Number(n));
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 9;
};

export function readReminderSettings() {
  const s = getSettings();
  return { on: s.reminder_on === '1', day: clampDay(s.reminder_day ?? 5), hour: clampHour(s.reminder_hour ?? 9) };
}

// Next `count` reminder moments that are still in the future (day is capped at 28 so every month has it).
export function nextReminderDates(day, hour, count = MONTHS_AHEAD, now = new Date()) {
  const out = [];
  for (let i = 0; out.length < count && i < count + 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, clampDay(day), clampHour(hour), 0, 0, 0);
    if (d.getTime() > now.getTime()) out.push(d);
  }
  return out;
}

async function ensureChannel() {
  const Notifications = N();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'ভাড়া রিমাইন্ডার',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

// Asks the OS for permission if needed. Android 13+ needs the channel to exist first.
export async function askPermission() {
  const Notifications = N();
  await ensureChannel();
  let p = await Notifications.getPermissionsAsync();
  if (!p.granted) p = await Notifications.requestPermissionsAsync();
  return !!p.granted;
}

// Replaces every scheduled reminder with a fresh set from the saved settings.
// Never prompts for permission. Returns { scheduled, first, needsPermission }.
export async function syncReminders() {
  const Notifications = getN();
  if (!Notifications) return { scheduled: 0, first: null, needsPermission: false };
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { on, day, hour } = readReminderSettings();
  if (!on) return { scheduled: 0, first: null, needsPermission: false };
  const p = await Notifications.getPermissionsAsync();
  if (!p.granted) return { scheduled: 0, first: null, needsPermission: true };
  await ensureChannel();
  const dates = nextReminderDates(day, hour);
  // Count as of this app open (reminders are planned ahead, so only the soonest one, if it is this month, gets it).
  let dueCount = 0;
  try {
    dueCount = getStats(monthKey()).dueCount;
  } catch (e) {}
  for (const date of dates) {
    const withCount = dueCount > 0 && date === dates[0] && monthKey(date) === monthKey();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: tr('ভাড়া আদায়ের দিন'),
        body: tr(
          withCount
            ? `আজ ভাড়া আদায়ের দিন। সর্বশেষ হিসাবে ${dueCount} জনের ভাড়া বাকি। অ্যাপ খুলে দেখুন।`
            : 'আজ ভাড়া আদায়ের দিন। কার ভাড়া বাকি আছে অ্যাপ খুলে দেখুন।'
        ),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
  return { scheduled: dates.length, first: dates[0] ?? null, needsPermission: false };
}

export async function sendTestReminder() {
  const Notifications = N();
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: tr('টেস্ট রিমাইন্ডার'), body: tr('রিমাইন্ডার ঠিকমতো কাজ করছে') + ' ✓' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
}
