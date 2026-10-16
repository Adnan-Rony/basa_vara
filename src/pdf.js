import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getSettings, setSetting } from './db';
import { monthLabel, showDate, taka, toBn } from './utils';
import { takaInWords } from './words';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');

const BASE_CSS = `
  @page { margin: 24px; }
  * { box-sizing: border-box; }
  body { font-family: sans-serif; color: #111827; font-size: 15px; line-height: 1.55; }
  .brand { color: #0F766E; }
  .box { border: 2px solid #0F766E; border-radius: 10px; padding: 18px; }
  .center { text-align: center; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 0; vertical-align: top; }
  td.l { color: #6B7280; width: 38%; }
  hr { border: 0; border-top: 1px dashed #9CA3AF; margin: 12px 0; }
`;

// Expo Go-তে printToFileAsync-এর ফাইল অ্যাপ নিজে পড়তে/কপি করতে পারে না
// ("Missing 'READ' permission")। তাই সেই ফাইল ছোঁয়াই হয় না: PDF-এর base64 চেয়ে নিয়ে
// অ্যাপের নিজের cache ফোল্ডারে নতুন ফাইল লিখে সেখান থেকে শেয়ার/সেভ করা হয়।
async function makePdfBase64(html, width, height) {
  const { base64 } = await Print.printToFileAsync({ html, width, height, base64: true });
  if (!base64) throw new Error('PDF তৈরি হয়নি');
  return base64;
}

const safeName = (fileName) => String(fileName || 'document').replace(/[^A-Za-z0-9_-]/g, '_');

// Makes the PDF and opens the share sheet. Returns the shared file uri.
export async function sharePdf(
  html,
  { width = 420, height = 595, title = 'PDF', fileName = 'document' } = {}
) {
  const base64 = await makePdfBase64(html, width, height);
  const file = new File(Paths.cache, `${safeName(fileName)}-${Date.now()}.pdf`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('এই ফোনে শেয়ার সুবিধা পাওয়া যায়নি');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: title,
  });
  return file.uri;
}

// ---- Phone-এ সরাসরি সেভ (Android) ----
// শেয়ার শিটে "Downloads/ফাইলে সেভ" অপশন সব ফোনে থাকে না। তাই Android-এ ব্যবহারকারীর
// বেছে নেওয়া ফোল্ডারে সরাসরি PDF লেখা হয়। ফোল্ডারটি একবার বেছে নিলে মনে রাখা হয়।
async function pickSaveDir(forcePick) {
  const SAF = LegacyFS.StorageAccessFramework;
  if (!forcePick) {
    const saved = getSettings().pdf_dir;
    if (saved) return saved;
  }
  const perm = await SAF.requestDirectoryPermissionsAsync(SAF.getUriForDirectoryInRoot('Documents'));
  if (!perm.granted) return null;
  setSetting('pdf_dir', perm.directoryUri);
  return perm.directoryUri;
}

export const folderName = (dirUri) => {
  try {
    return decodeURIComponent(String(dirUri)).split(':').pop() || 'ফোল্ডার';
  } catch (e) {
    return 'ফোল্ডার';
  }
};

// Returns { folder } when saved, or null if the user cancelled the folder picker.
// iOS: share sheet already has "Save to Files", so it just shares and returns { folder: null }.
export async function savePdf(
  html,
  { width = 420, height = 595, title = 'PDF', fileName = 'document' } = {}
) {
  if (Platform.OS !== 'android') {
    await sharePdf(html, { width, height, title, fileName });
    return { folder: null };
  }
  const SAF = LegacyFS.StorageAccessFramework;
  const base64 = await makePdfBase64(html, width, height);
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const safe = safeName(fileName);
  // SAF adds the .pdf extension from the mime type, so the name has none.
  const name = `${safe}-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const write = async (dir) => {
    const fileUri = await SAF.createFileAsync(dir, name, 'application/pdf');
    await LegacyFS.writeAsStringAsync(fileUri, base64, { encoding: LegacyFS.EncodingType.Base64 });
  };
  let dir = await pickSaveDir(false);
  if (!dir) return null;
  try {
    await write(dir);
  } catch (e) {
    // সংরক্ষিত ফোল্ডারের অনুমতি চলে গেলে আবার বাছাই করতে বলা হয়
    dir = await pickSaveDir(true);
    if (!dir) return null;
    await write(dir);
  }
  return { folder: folderName(dir) };
}

export function receiptHtml(r, landlord = {}) {
  const status =
    r.remaining > 0
      ? `<b style="color:#B45309">আংশিক পরিশোধ — বাকি ${esc(taka(r.remaining))}</b>`
      : `<b style="color:#15803D">সম্পূর্ণ পরিশোধিত</b>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${BASE_CSS}</style></head><body>
  <div class="box">
    <div class="center">
      <h2 class="brand" style="margin:0">ভাড়ার রসিদ</h2>
      <div style="color:#6B7280">${esc(r.building_name)}${r.building_address ? ' · ' + esc(r.building_address) : ''}</div>
    </div>
    <hr/>
    <table>
      <tr><td class="l">রসিদ নং</td><td>${esc(toBn(r.receiptNo))}</td></tr>
      <tr><td class="l">তারিখ</td><td>${esc(showDate(r.paidDate))}</td></tr>
      <tr><td class="l">ভাড়াটিয়া</td><td>${esc(r.tenant_name)}</td></tr>
      <tr><td class="l">ইউনিট</td><td>${esc(r.unit_name)}</td></tr>
      <tr><td class="l">কোন মাসের ভাড়া</td><td>${esc(monthLabel(r.month))}</td></tr>
    </table>
    <hr/>
    <div class="center">
      <div style="color:#6B7280">এই পেমেন্টে পেয়েছি</div>
      <div style="font-size:30px;font-weight:800" class="brand">${esc(taka(r.amount))}</div>
      <div>(${esc(takaInWords(r.amount))})</div>
    </div>
    <hr/>
    <table>
      <tr><td class="l">মাসের মোট ভাড়া</td><td>${esc(taka(r.due))}</td></tr>
      <tr><td class="l">এ পর্যন্ত পরিশোধ</td><td>${esc(taka(r.totalPaid))}</td></tr>
      ${r.carried > 0 ? `<tr><td class="l">বাড়তি (পরের মাসে অগ্রিম)</td><td>${esc(taka(r.carried))}</td></tr>` : ''}
      <tr><td class="l">অবস্থা</td><td>${status}</td></tr>
    </table>
    <div style="margin-top:36px;text-align:right">
      <div style="border-top:1px solid #111827;display:inline-block;padding-top:4px;min-width:140px;text-align:center">
        ${landlord.name ? esc(landlord.name) + '<br/>' : ''}বাড়িওয়ালার স্বাক্ষর
      </div>
      ${landlord.phone ? `<div style="color:#6B7280;font-size:13px">${esc(toBn(landlord.phone))}</div>` : ''}
    </div>
  </div>
  </body></html>`;
}

export function noticeHtml(n, landlord = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${BASE_CSS}</style></head><body>
  <div class="box" style="min-height:700px">
    <div class="center">
      <h1 class="brand" style="margin:0 0 4px">নোটিশ</h1>
      <div style="color:#6B7280">${n.building_name ? esc(n.building_name) + ' · ' : ''}তারিখ: ${esc(showDate(n.created))}</div>
    </div>
    <hr/>
    <h2 style="margin:12px 0">${esc(n.title)}</h2>
    <div style="font-size:17px">${esc(n.body)}</div>
    <div style="margin-top:48px;text-align:right">
      ${landlord.name ? `<b>${esc(landlord.name)}</b><br/>` : ''}বাড়িওয়ালা
      ${landlord.phone ? `<br/>${esc(toBn(landlord.phone))}` : ''}
    </div>
  </div>
  </body></html>`;
}

export function rulesHtml(buildingName, rules) {
  const items = rules.map((r) => `<li style="margin-bottom:8px">${esc(r.text)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${BASE_CSS}</style></head><body>
  <div class="box" style="min-height:700px">
    <div class="center">
      <h1 class="brand" style="margin:0 0 4px">বাসার নিয়মাবলি</h1>
      <div style="color:#6B7280">${esc(buildingName)}</div>
    </div>
    <hr/>
    <ol style="font-size:17px;padding-left:24px">${items}</ol>
  </div>
  </body></html>`;
}

export const A4 = { width: 595, height: 842 };
