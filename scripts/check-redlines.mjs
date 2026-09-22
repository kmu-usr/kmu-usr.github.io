// 紅線 lint（裁定 Q11-甲 (c)，20260912）。規範正本在 laonong-usr（A 檔、B 檔第四節、G 檔第十節），本腳本只實作可機器判定之字串層級檢查。
// 檢查：1 排版新制（中英數之間無空格）2 img/ 每檔須列於 G 檔第十節對照表 3 N13 手機號碼
//       4 禁用字串 5 相對時間表述（警告）6 head 必備欄位（description、canonical、og:image）
// 任一「失敗」→ exit 1；「警告」只列出。用法：node scripts/check-redlines.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES = ['index.html', 'about/index.html', 'partner/index.html', 'school/index.html', '404.html'];
// 首頁計畫歷程之架構演進表：各期主軸名依當期名稱（裁定 Q13-甲 7-甲、戊-2，N1 歷史脈絡），僅首頁、僅整格完全相符者放行
const HIST_AXIS = new Set(['良善陪伴與促進多元發展']);
const CJK = '[　-〿㐀-䶿一-鿿！-｠—…]';
const SP1 = new RegExp(`${CJK} +[A-Za-z0-9]`);
const SP2 = new RegExp(`[A-Za-z0-9%+] +${CJK}`);
const FORBID = ['郭昭宏', '多元發展', '法式滾球隊', '隔代教養', '家暴', '外配', '早療'];
const RELTIME = ['十年', '今年', '明年', '去年', '三年', '四年', '目前累計'];
const PHONE = /09\d{2}[- ]?\d{3}[- ]?\d{3}/;

const fails = [], warns = [];
const textOf = (html) => {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const attrs = [...stripped.matchAll(/\b(?:alt|content|title)="([^"]*)"/g)].map((m) => m[1]);
  const nodes = stripped.replace(/<[^>]+>/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);
  return [...nodes, ...attrs];
};

for (const rel of PAGES) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  for (const t of textOf(html)) {
    if (SP1.test(t) || SP2.test(t)) fails.push(`${rel}: 中英（數）之間有空格 → ${t.slice(0, 60)}`);
    for (const w of FORBID) if (t.includes(w) && !(rel === 'index.html' && HIST_AXIS.has(t))) fails.push(`${rel}: 禁用字串「${w}」 → ${t.slice(0, 60)}`);
    for (const w of RELTIME) if (t.includes(w) && !t.includes('十餘年')) warns.push(`${rel}: 相對時間表述「${w}」請確認（A 檔第六節 C 類） → ${t.slice(0, 60)}`);
    if (PHONE.test(t)) fails.push(`${rel}: 疑似個人手機號碼（N13） → ${t.slice(0, 60)}`);
  }
  if (rel !== '404.html') {
    for (const [name, re] of [['description', /<meta name="description"/], ['canonical', /<link rel="canonical"/], ['og:image', /property="og:image"/]]) {
      if (!re.test(html)) fails.push(`${rel}: head 缺 ${name}`);
    }
  }
}

// img/ 對照 G 檔第十節（僅 Mac 本機有 laonong-usr 時檢查）
const gDir = path.join(os.homedir(), 'Projects', 'laonong-usr', 'L1_規範層');
const gFile = fs.existsSync(gDir) ? fs.readdirSync(gDir).filter((n) => n.startsWith('G_圖片manifest-')).sort().pop() : null;
if (gFile) {
  const g = fs.readFileSync(path.join(gDir, gFile), 'utf8');
  const sec = g.slice(g.indexOf('## 十、')); 
  const listed = new Set([...sec.matchAll(/`([\w.-]+\.(?:jpg|png|webp))`/g)].map((m) => m[1]));
  for (const n of fs.readdirSync(path.join(ROOT, 'img'))) {
    if (/\.(jpg|png|webp)$/i.test(n) && !listed.has(n)) fails.push(`img/${n}: 未列於 ${gFile} 第十節網站用圖對照（新增素材依 N18 先回報並登錄）`);
  }
} else {
  warns.push('找不到 laonong-usr 之 G 檔，略過 img/ 對照檢查');
}

for (const w of warns) console.log('警告  ' + w);
for (const f of fails) console.log('失敗  ' + f);
console.log(`[check-redlines] 失敗 ${fails.length}、警告 ${warns.length}`);
process.exit(fails.length ? 1 : 0);
