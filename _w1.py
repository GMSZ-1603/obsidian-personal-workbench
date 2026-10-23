# -*- coding: utf-8 -*-
import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r"C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin\src\main.js"
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    if old in s:
        s = s.replace(old, new, 1); print("OK", tag)
    else:
        print("MISS", tag)

# A. DEFAULT_SETTINGS：birthdayFile -> dataFile，删 activities
rep('''  birthdayFile: "生活/生日日期.md",
  activities: [],''',
'''  dataFile: "生活/个人工作台数据.md",''',
'A dataFile setting')

# B. 新增统一解析器（插在 scanBirthdays 函数定义之前）
parser = '''
/* ---------------- 个人工作台数据笔记（统一数据源：生日/单双休/生活安排） ---------------- */
const DATA_FILE_DEFAULT = "生活/个人工作台数据.md";
const LIFE_DEFAULT_COLOR = "#c084fc";

/* 表格行 -> 单元格数组 */
function tableCells(line) {
  const a = String(line).split("|").map(x => x.trim());
  if (a.length && a[0] === "") a.shift();
  if (a.length && a[a.length - 1] === "") a.pop();
  return a.filter((x, i) => !(i === 0 && x === "") && !(i === a.length - 1 && x === "")).length ? a : a.filter(x => x !== "");
}

/* 生活安排日期列：支持 "20261002-07"、"20261007、14、21、28"、"20261002" 及逗号/顿号多段 */
function pushDateRange(out, y1, mo1, d1, y2, mo2, d2) {
  const st = new Date(y1, mo1 - 1, d1), en = new Date(y2, mo2 - 1, d2);
  if (isNaN(st.getTime()) || isNaN(en.getTime()) || en < st) return;
  for (let d = new Date(st); d <= en; d.setDate(d.getDate() + 1)) {
    out.push(fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }
}
function expandLifeDates(str, defYear) {
  const out = [];
  let lastPrefix = "";
  const segs = String(str || "").split(/[、,，;；]/).map(x => x.trim()).filter(Boolean);
  for (const seg of segs) {
    let m = seg.match(/^(\\d{4})(\\d{2})(\\d{2})(?:\\s*-\\s*(\\d{2,8}))?$/);
    if (m) {
      const y1 = +m[1], mo1 = +m[2], d1 = +m[3];
      let y2 = y1, mo2 = mo1, d2 = d1;
      if (m[4]) {
        const e = m[4];
        if (e.length === 2) { d2 = +e; }
        else if (e.length === 4) { mo2 = +e.slice(0, 2); d2 = +e.slice(2); }
        else if (e.length === 8) { y2 = +e.slice(0, 4); mo2 = +e.slice(4, 6); d2 = +e.slice(6); }
        else continue;
      }
      pushDateRange(out, y1, mo1, d1, y2, mo2, d2);
      lastPrefix = String(y1) + String(mo1).padStart(2, "0");
      continue;
    }
    m = seg.match(/^(\\d{2,4})$/);
    if (m && lastPrefix) {
      const v = m[1], y = +lastPrefix.slice(0, 4), mo = +lastPrefix.slice(4, 6);
      if (v.length === 2) pushDateRange(out, y, mo, +v, y, mo, +v);
      else if (v.length === 4) { const mo2 = +v.slice(0, 2), d2 = +v.slice(2); pushDateRange(out, y, mo2, d2, y, mo2, d2); }
    }
  }
  return out;
}
function parseLifeRow(cells, year, map) {
  const dates = cells[0], name = (cells[1] || "").trim();
  if (!dates || !name) return;
  for (const key of expandLifeDates(dates, year)) {
    if (!map.has(key)) map.set(key, []);
    const arr = map.get(key);
    if (!arr.some(x => x.name === name)) arr.push({ name, color: LIFE_DEFAULT_COLOR, text: name });
  }
}
function parseRestRow(cells, year, weekRest) {
  const wk = String(cells[0]).trim();
  const rest = String(cells[2] || "").replace(/、/g, "，");
  if (!/^\\d+$/.test(wk) || !rest) return;
  const hasSat = rest.includes("周六"), hasSun = rest.includes("周日");
  if (hasSat && hasSun) weekRest[String(year)][wk] = "double";
  else if (hasSat) weekRest[String(year)][wk] = "sat";
  else if (hasSun) weekRest[String(year)][wk] = "sun";
}

/* 解析【个人工作台数据】笔记 -> { birthdays, weekRest, lifeMap } */
function parseDataFile(content) {
  const res = { birthdays: [], weekRest: {}, lifeMap: new Map() };
  const blocks = {};
  let cur = null;
  for (const raw of String(content || "").split(/\\r?\\n/)) {
    const hm = raw.match(/^##\\s+(.+)$/);
    if (hm) { cur = hm[1].trim(); blocks[cur] = blocks[cur] || []; continue; }
    if (cur) blocks[cur].push(raw);
  }
  // 生日日期（兼容旧列表格式）
  for (const line of blocks["生日日期"] || []) {
    let l = line.trim().replace(/^[-*+]\\s+/, "");
    if (!l || l.startsWith("#") || l.startsWith("---")) continue;
    const parts = l.split(/[，,]/);
    if (parts.length < 2) continue;
    const name = parts[0].trim();
    let nickname = null, dateStr;
    if (parts.length >= 3) { nickname = parts[1].trim(); dateStr = parts.slice(2).join("，").trim(); }
    else { dateStr = parts.slice(1).join("，").trim(); }
    const parsed = parseBirthdayDate(dateStr);
    if (!parsed || !name) continue;
    res.birthdays.push({ name, nickname: nickname || name, ...parsed, dateRaw: dateStr });
  }
  // 单双休安排（### 年度 + 表格）
  let curYear = new Date().getFullYear();
  for (const line of blocks["单双休安排"] || []) {
    const ym = line.match(/^###\\s*(\\d{4})年?\\s*$/);
    if (ym) { curYear = +ym[1]; res.weekRest[String(curYear)] = res.weekRest[String(curYear)] || {}; continue; }
    const c = tableCells(line);
    if (c.length >= 3 && /^\\d+$/.test(String(c[0])) && c[2]) {
      res.weekRest[String(curYear)] = res.weekRest[String(curYear)] || {};
      parseRestRow(c, curYear, res.weekRest);
    }
  }
  // 生活安排（### 年度 + 表格）
  curYear = new Date().getFullYear();
  for (const line of blocks["生活安排"] || []) {
    const ym = line.match(/^###\\s*(\\d{4})年?\\s*$/);
    if (ym) { curYear = +ym[1]; continue; }
    const c = tableCells(line);
    if (c.length >= 2 && c[0] && c[1]) parseLifeRow(c, curYear, res.lifeMap);
  }
  return res;
}

/* 单双休表判定：restMap[year][wk] = "double"|"sat"|"sun"，缺省双休；dow 0=周日 6=周六 */
function restFromTable(restMap, y, m, d, dow) {
  const yr = restMap && restMap[String(y)];
  if (!yr) return true;
  const wk = String(isoWeek(y, m, d));
  const v = yr[wk];
  if (v === "sun") return dow === 0;
  if (v === "sat") return dow === 6;
  return true;
}

async function scanBirthdays(app, settings) {'''

rep('''async function scanBirthdays(app, settings) {''', parser, 'B parser block')

# C. getActivities -> getData/getWeekRest/getLifeActivities（替换原 getActivities 方法）
old_c = '''  async getActivities(force) {
    const c = this.activityCache;
    if (c.data && !c.stale && !force) return c.data;
    try { c.data = buildActivityMap(this.settings.activities); }
    catch (e) { console.error("workbench buildActivityMap", e); }
    c.stale = false;
    return c.data || new Map();
  }'''
new_c = '''  async getData(force) {
    const c = this.dataCache;
    if (c.data && !c.stale && !force) return c.data;
    try {
      const f = this.app.vault.getAbstractFileByPath(this.settings.dataFile);
      let content = "";
      if (f && f.extension === "md") { try { content = await this.app.vault.cachedRead(f); } catch (e) {} }
      c.data = parseDataFile(content);
    } catch (e) { console.error("workbench parseDataFile", e); }
    c.stale = false;
    return c.data || { birthdays: [], weekRest: {}, lifeMap: new Map() };
  }
  async getWeekRest(force) { const d = await this.getData(force); return d.weekRest || {}; }
  async getLifeActivities(force) { const d = await this.getData(force); return d.lifeMap || new Map(); }'''
rep(old_c, new_c, 'C getData/getWeekRest/getLifeActivities')

# D. getBirthdays 改为从统一数据读
rep('''  async getBirthdays(force) {
    const c = this.birthdayCache;
    if (c.data && c.data.length && !c.stale && !force) return c.data;
    try { c.data = await scanBirthdays(this.app, this.settings); }
    catch (e) { console.error("workbench scanBirthdays", e); }
    c.stale = false;
    return c.data || [];
  }''',
'''  async getBirthdays(force) {
    const c = this.birthdayCache;
    if (c.data && c.data.length && !c.stale && !force) return c.data;
    try { c.data = (await this.getData(force)).birthdays || []; }
    catch (e) { console.error("workbench birthdays from dataFile", e); }
    c.stale = false;
    return c.data || [];
  }''',
'D getBirthdays from data')

# E. onOpen 初始化 dataCache（在 activityCache 后）
rep('''    this.activityCache = { data: null, stale: true };''',
'''    this.activityCache = { data: null, stale: true };
    this.dataCache = { data: null, stale: true };''',
'E dataCache init')

# F. metadataCache changed 标 dataCache stale
rep('''      this.plugin.birthdayCache.stale = true;
      this.plugin.activityCache.stale = true;
      if (this.contentEl) this.render();''',
'''      this.plugin.birthdayCache.stale = true;
      this.plugin.activityCache.stale = true;
      this.plugin.dataCache.stale = true;
      if (this.contentEl) this.render();''',
'F dataCache stale hook')

# G. __wb_test 暴露新解析函数
rep('''expandActivityDates, buildActivityMap, ACTIVITY_DEFAULT_COLOR, lunarLib''',
'''expandActivityDates, buildActivityMap, expandLifeDates, parseDataFile, restFromTable, parseLifeRow, lunarLib''',
'G wb_test exports')

io.open(p, 'w', encoding='utf-8').write(s)
print("written", len(s))
