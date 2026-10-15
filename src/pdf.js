import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
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

// Expo Go-তে printToFileAsync-এর ফাইল শেয়ারের অনুমতি-পাওয়া ফোল্ডারে থাকে না।
// তাই ফাইলটা অ্যাপের নিজের cache ফোল্ডারে কপি করে সেখান থেকে শেয়ার করা হয়।
function copyToCache(uri, fileName) {
  const safe = String(fileName || 'document').replace(/[^A-Za-z0-9_-]/g, '_');
  const dest = new File(Paths.cache, `${safe}-${Date.now()}.pdf`);
  if (dest.exists) dest.delete();
  new File(uri).copy(dest);
  return dest.uri;
}

// Makes the PDF and opens the share sheet. Returns the shared file uri.
export async function sharePdf(
  html,
  { width = 420, height = 595, title = 'PDF', fileName = 'document' } = {}
) {
  const { uri } = await Print.printToFileAsync({ html, width, height });
  let shareUri = uri;
  try {
    shareUri = copyToCache(uri, fileName);
  } catch (e) {
    // কপি না হলে আগের uri-ই ব্যবহার হবে
    shareUri = uri;
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('এই ফোনে শেয়ার সুবিধা পাওয়া যায়নি');
  }
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: title,
  });
  return shareUri;
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
