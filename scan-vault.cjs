/* 扫描真实库：按天统计 md 文件 mtime / ctime 分布，验证热力图数据源 */
const fs = require("fs");
const path = require("path");
const ROOT = "D:/Obsidian/Second Brain";
const p = n => String(n).padStart(2, "0");
const ymd = ts => { const d = new Date(ts); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };

const mtimeDays = new Map();
const ctimeDays = new Map();
let mdCount = 0, skipped = 0;
const isEx = q => ["node_modules", ".git", ".obsidian", ".trash", ".gitignore"].some(z => q.startsWith(z + "/") || q === z || q.startsWith("."));

function walk(dir) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const ent of ents) {
    const full = path.join(dir, ent.name);
    const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
    if (ent.isDirectory()) { if (!isEx(rel)) walk(full); continue; }
    if (!ent.name.endsWith(".md")) continue;
    if (rel.startsWith(".")) continue;
    mdCount++;
    let st;
    try { st = fs.statSync(full); } catch (e) { skipped++; continue; }
    const m = ymd(st.mtimeMs);
    mtimeDays.set(m, (mtimeDays.get(m) || 0) + 1);
    const c = ymd(st.ctimeMs);
    ctimeDays.set(c, (ctimeDays.get(c) || 0) + 1);
  }
}
walk(ROOT);

const now = new Date();
const today = ymd(now.getTime());
// 最近 150 天
const days = [];
for (let d = 149; d >= 0; d--) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
  days.push(ymd(t.getTime()));
}
const histDays = days.filter(k => mtimeDays.has(k)).length;
const histTotal = days.reduce((a, k) => a + (mtimeDays.get(k) || 0), 0);
// streak
let cur = new Date();
const hasToday = mtimeDays.has(today);
if (!hasToday) cur.setDate(cur.getDate() - 1);
let streak = 0;
while (mtimeDays.has(ymd(cur.getTime()))) { streak++; cur.setDate(cur.getDate() - 1); }
// 全部有记录的天数与日期范围
const allDays = [...mtimeDays.keys()].sort();
const cAllDays = [...ctimeDays.keys()].sort();

console.log("md 文件数:", mdCount, "跳过:", skipped);
console.log("mtime 有记录天数(全部):", allDays.length, "最早:", allDays[0], "最晚:", allDays[allDays.length - 1]);
console.log("ctime 有记录天数(全部):", cAllDays.length, "最早:", cAllDays[0], "最晚:", cAllDays[cAllDays.length - 1]);
console.log("近150天: 有记录天数", histDays, "总计数", histTotal);
console.log("今天有记录:", hasToday, "| streak:", streak);
console.log("--- 最近 20 天 mtime 分布 ---");
for (let d = 19; d >= 0; d--) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
  const k = ymd(t.getTime());
  console.log(k, mtimeDays.get(k) || 0, mtimeDays.has(k) ? "★" : "");
}
console.log("--- 最早 10 个 mtime 日期 ---");
for (const k of allDays.slice(0, 10)) console.log(k, mtimeDays.get(k));
