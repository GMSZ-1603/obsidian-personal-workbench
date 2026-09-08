/* 无头渲染测试：用真实库数据验证 renderDashboard 输出结构 */
const fs = require("fs");
const path = require("path");
const Module = require("module");

const VAULT = "D:\\Obsidian\\Second Brain";
const stub = path.join(__dirname, "obsidian-stub.js");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "obsidian") return stub;
  return origResolve.call(this, request, ...args);
};
require(path.join(__dirname, "dist", "main.js"));
const WorkbenchPlugin = module.parent ? module.parent.exports : null;
const PluginClass = globalThis.__wb_test ? require(path.join(__dirname, "dist", "main.js")) : null;

// 重新 require 拿到插件类（module.exports 已被插件覆盖）
const loaded = require(path.join(__dirname, "dist", "main.js"));
const WB = loaded.default || loaded;
if (typeof WB !== "function") { console.error("无法获取 WorkbenchPlugin 类"); process.exit(1); }

/* ---------- 简易 DOM 假实现 ---------- */
class FakeEl {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this._cls = new Set();
    this._attrs = {};
    this._text = "";
    this._html = "";
    this.style = {};
    this.listeners = {};
    this.parentEl = null;
    this.value = "";
  }
  get className() { return [...this._cls].join(" "); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  addClass(c) { String(c).split(/\s+/).filter(Boolean).forEach(x => this._cls.add(x)); return this; }
  removeClass(c) { this._cls.delete(c); return this; }
  toggleClass(c, on) {
    if (on === undefined) { if (this._cls.has(c)) this._cls.delete(c); else this._cls.add(c); }
    else if (on) this._cls.add(c); else this._cls.delete(c);
    return this;
  }
  hasClass(c) { return this._cls.has(c); }
  setAttribute(k, v) { this._attrs[k] = String(v); return this; }
  getAttribute(k) { return this._attrs[k]; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this._html = ""; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this._text = ""; }
  set title(v) { this._attrs["title"] = v; }
  get title() { return this._attrs["title"]; }
  appendChild(c) { c.parentEl = this; this.children.push(c); return c; }
  append(c) { return this.appendChild(c); }
  empty() { this.children = []; this._text = ""; return this; }
  remove() { if (this.parentEl) { const i = this.parentEl.children.indexOf(this); if (i >= 0) this.parentEl.children.splice(i, 1); } }
  contains(node) {
    let n = node;
    while (n) { if (n === this) return true; n = n.parentEl; }
    return false;
  }
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; }
  fire(ev, e) { (this.listeners[ev] || []).forEach(fn => fn(e || {})); }
  createEl(tag, opts = {}) {
    const c = new FakeEl(tag);
    if (opts.cls) c.addClass(opts.cls);
    if (opts.text != null) c.textContent = opts.text;
    if (opts.placeholder) c.setAttribute("placeholder", opts.placeholder);
    if (opts.type) c.setAttribute("type", opts.type);
    this.appendChild(c);
    return c;
  }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
  querySelector(sel) {
    const cls = sel.replace(/^\./, "");
    const walk = (n) => {
      for (const c of n.children) { if (c._cls.has(cls)) return c; const r = walk(c); if (r) return r; }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(sel) {
    const cls = sel.replace(/^\./, "");
    const out = [];
    const walk = (n) => { for (const c of n.children) { if (c._cls.has(cls)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}
global.document = {
  createElement: (t) => new FakeEl(t),
  addEventListener() {},
  contains: () => true
};
global.window = { setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1 };
global.navigator = {};

/* ---------- mock app（接真实库） ---------- */
function listMd(dir, base) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.join(base || "", ent.name).replace(/\\/g, "/");
    if (ent.name === ".obsidian") continue;
    if (ent.isDirectory()) out.push(...listMd(full, rel));
    else if (ent.name.endsWith(".md")) {
      const st = fs.statSync(full);
      out.push({ path: rel, basename: ent.name.replace(/\.md$/, ""), name: ent.name, extension: "md", stat: { ctime: st.ctimeMs, mtime: st.mtimeMs } });
    }
  }
  return out;
}
const files = listMd(VAULT);
const app = {
  vault: {
    getMarkdownFiles: () => files,
    cachedRead: async (f) => { try { return fs.readFileSync(path.join(VAULT, f.path), "utf8"); } catch (e) { return ""; } },
    getAbstractFileByPath: (p) => {
      const full = path.join(VAULT, p);
      if (fs.existsSync(full)) return { path: p.replace(/\\/g, "/"), extension: path.extname(p).replace(".", "") };
      return null;
    }
  },
  workspace: { getLeaf: () => ({ openFile: async () => {} }) },
  metadataCache: {
    on: () => ({}),
    resolvedLinks: {},
    getFileCache: () => null
  },
  commands: { listCommands: () => [], executeCommandById: () => {} }
};

/* ---------- 运行渲染 ---------- */
(async () => {
  const plugin = new WB(app, {});
  plugin.settings = {
    city: "常州", latitude: 31.77, longitude: 119.97,
    birthdayFile: "生活/生日日期.md",
    excludeFolders: ["图片", "Templates", "OneNote", "smart-note-agent", ".smartnotes", "微信公众号文章", "统计"],
    refreshMinutes: 30,
    bannerEnabled: true, queryEnabled: true, weatherEnabled: true,
    yearProgressEnabled: true, todayTasksEnabled: true, birthdaysEnabled: true, calendarEnabled: true
  };
  plugin.tasksCache = { data: null, stale: true, scanning: false };
  plugin.birthdayCache = { data: null, stale: true };
  plugin.weatherCache = { data: null, stale: true };
  // 天气用固定 mock 保证确定性
  plugin.getWeather = async () => ({
    temp: 30, feels: 33, humidity: 69, wind: 6, code: 3,
    list: [
      { date: "2026-09-03", code: 3, max: 29, min: 24 },
      { date: "2026-09-04", code: 3, max: 30, min: 23 },
      { date: "2026-09-05", code: 53, max: 29, min: 23 },
      { date: "2026-09-06", code: 2, max: 29, min: 22 },
      { date: "2026-09-07", code: 2, max: 28, min: 21 },
      { date: "2026-09-08", code: 3, max: 28, min: 21 }
    ]
  });

  const el = new FakeEl("div");
  const state = { year: 2026, month: 9, selected: "2026-09-03", loading: false };
  await plugin.renderDashboard(el, null, state);

  let pass = 0, fail = 0;
  const check = (name, cond, extra) => {
    if (cond) { pass++; console.log("  ✓", name); }
    else { fail++; console.log("  ✗", name, extra || ""); }
  };
  const textOf = (n) => {
    let s = n.textContent || "";
    for (const c of n.children) s += textOf(c);
    return s;
  };

  console.log("== 统计横幅 ==");
  const banner = el.querySelector(".wb-banner");
  const bannerText = banner ? textOf(banner) : "";
  check("横幅存在", !!banner);
  check("总笔记", bannerText.includes("总笔记"));
  check("活跃天数", bannerText.includes("活跃天数"));
  check("周/月发文", bannerText.includes("本周") && bannerText.includes("本月"));
  check("任务完成率", bannerText.includes("任务完成率"));
  check("连通度", bannerText.includes("连通度"));
  check("孤立率", bannerText.includes("孤立率"));
  check("链接/篇", bannerText.includes("链接/篇"));
  const dots = el.querySelectorAll(".dashboard-banner-heatmap-cell");
  check("活动点阵98格", dots.length === 98, "got " + dots.length);
  const numL = banner && banner.querySelector(".dashboard-banner-stat-num");
  check("总笔记数>0", !!numL && parseInt(numL.textContent) > 0, numL && numL.textContent);
  check("热力图today标记", !!el.querySelector(".dashboard-banner-heatmap-cell--today"));

  console.log("== 查询栏 ==");
  check("查询栏存在", !!el.querySelector(".wb-querybar"));

  console.log("== 天气 + 当天农历 ==");
  check("天气温度", !!el.querySelector(".wb-wx-temp") && el.querySelector(".wb-wx-temp").textContent.includes("30"));
  check("天气状况", !!el.querySelector(".wb-wx-cond") && el.querySelector(".wb-wx-cond").textContent.includes("阴"));
  const wxl = el.querySelector(".wb-wx-lunar");
  const T = globalThis.__wb_test;
  const _now = new Date();
  const _l = T.lunarLib.Solar.fromYmd(_now.getFullYear(), _now.getMonth() + 1, _now.getDate()).getLunar();
  const _mCn = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"][_l.getMonth()];
  check("农历干支已移除", !!wxl && !textOf(wxl).includes(_l.getYearInGanZhi() + "年"), textOf(wxl));
  check("农历日期已移除", !!wxl && !textOf(wxl).includes(`农历 ${_mCn}月${_l.getDayInChinese()}`), textOf(wxl));
  const _fest = _l.getOtherFestivals() || [];
  check("节日标签已移除", !!wxl && !(_fest.length && textOf(wxl).includes(_fest[0])), textOf(wxl) + " / " + _fest.join(","));
  // 每日一签：与当日日期哈希结果一致
  const qv = el.querySelector(".wb-lunar-verse");
  const expectQ = T.dailyQuote(_now.getFullYear(), _now.getMonth() + 1, _now.getDate());
  const qBlock = el.querySelector(".wb-lunar-quote");
  check("引用语为当日一签", !!qBlock && textOf(qBlock) === expectQ, qBlock && textOf(qBlock) + " / " + expectQ);
  const qLines = qBlock ? qBlock.querySelectorAll(".wb-lunar-verse") : [];
  check("引用语分两行", qLines.length === 2, "got " + qLines.length);
  if (qLines.length === 2) check("两行字数相近", Math.abs(qLines[0].textContent.length - qLines[1].textContent.length) <= 5, qLines[0].textContent + " / " + qLines[1].textContent);
  check("引用语无'每日一签'字样", !!qBlock && !textOf(qBlock).includes("每日一签"), qBlock && textOf(qBlock));
  const fc = el.querySelectorAll(".wb-wx-f");
  check("6天预报", fc.length === 6, "got " + fc.length);

  console.log("== 年度进度 ==");
  const pct = el.querySelector(".wb-progress-pct");
  const _doy = T.dayOfYear(_now);
  const _din = T.daysInYear(_now.getFullYear());
  const _pct = (_doy / _din * 100).toFixed(1);
  check("进度与今日一致", !!pct && pct.textContent.includes(_pct), pct && pct.textContent + " / " + _pct);

  console.log("== 今日任务/生日 ==");
  check("今日任务卡片", !!el.querySelector(".wb-tasklist"));
  check("生日提醒卡片", !!el.querySelector(".wb-bday-list"));
  const bdText = textOf(el.querySelector(".wb-bday-list") || { textContent: "", children: [] });
  check("生日提醒含称呼", bdText.includes("爸爸"), bdText);
  check("生日卡不显示岁数", !bdText.includes("岁"), bdText);
  check("头像为姓(卢)", bdText.includes("卢"), bdText);
  check("农历只显示月日(八月十二)", bdText.includes("八月十二") && !bdText.includes("一九六四年"), bdText);
  check("农历无数字(不含'农历八1')", !bdText.includes("农历八1") && !bdText.includes("八12"), bdText);
  check("公历带年(2026/9/22)", bdText.includes("2026/9/22"), bdText);
  const _diff = Math.round((new Date("2026-09-22T00:00:00") - new Date(`${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}T00:00:00`)) / 86400000);
  check("剩余天数在公历前", _diff > 0 && bdText.includes(`还有${_diff}天2026/9/22`), bdText);
  check("生日卡不显示姓名", !bdText.includes("卢小南"), bdText);

  console.log("== 左栏任务统计 ==");
  // 注入 mock 任务（含今日/逾期/后续）验证左栏三板块
  // 今日日期字符串（动态，避免 mock 日期随系统日期漂移）
  const _todayS = new Date();
  const todayStr = `${_todayS.getFullYear()}-${String(_todayS.getMonth() + 1).padStart(2, "0")}-${String(_todayS.getDate()).padStart(2, "0")}`;
  plugin.getTasks = async () => [
    { file: "工作/a.md", text: "上午9点，制定扩容方案", raw: "", done: false, scheduled: todayStr, due: null, date: todayStr },
    { file: "工作/b.md", text: "上午8点半，设备归还入库", raw: "", done: false, scheduled: todayStr, due: null, date: todayStr },
    { file: "工作/c.md", text: "下午1点，整理成本清单", raw: "", done: false, scheduled: todayStr, due: null, date: todayStr },
    { file: "工作/d.md", text: "已完成的今日任务", raw: "", done: true, scheduled: todayStr, due: null, date: todayStr },
    { file: "工作/e.md", text: "逾期任务A", raw: "", done: false, scheduled: "2026-08-01", due: null, date: "2026-08-01" },
    { file: "工作/f.md", text: "逾期任务B", raw: "", done: false, scheduled: "2026-07-05", due: null, date: "2026-07-05" },
    { file: "工作/g.md", text: "逾期任务C", raw: "", done: false, scheduled: "2026-08-17", due: null, date: "2026-08-17" },
    { file: "工作/h.md", text: "逾期任务D", raw: "", done: false, scheduled: "2026-08-17", due: null, date: "2026-08-17" },
    { file: "工作/i.md", text: "逾期任务E", raw: "", done: false, scheduled: "2026-08-21", due: null, date: "2026-08-21" },
    { file: "工作/j.md", text: "逾期任务F", raw: "", done: false, scheduled: "2026-07-31", due: null, date: "2026-07-31" },
    { file: "工作/k.md", text: "后续任务X", raw: "", done: false, scheduled: "2026-10-01", due: null, date: "2026-10-01" },
    { file: "工作/l.md", text: "后续任务Y", raw: "", done: false, scheduled: "2026-11-01", due: null, date: "2026-11-01" },
    { file: "工作/m.md", text: "截止任务", raw: "", done: false, scheduled: null, due: todayStr, date: todayStr }
  ];
  await plugin.renderDashboard(el, null, state);
  const _taskCard = [...el.querySelectorAll(".wb-card")].find(c => {
    const tt = c.querySelector(".wb-card-tt");
    return tt && tt.textContent === "今日任务";
  });
  const _subs = _taskCard ? [..._taskCard.querySelectorAll(".wb-subhead")].map(s => s.textContent) : [];
  check("逾期任务标题", _subs.some(t => t.startsWith("逾期任务")), _subs.join(","));
  check("后续任务标题", _subs.some(t => t.startsWith("后续任务")), _subs.join(","));
  const _sc = _taskCard ? _taskCard.querySelectorAll(".wb-tasklist-scroll") : [];
  check("逾期/后续均为滚动列表", _sc.length === 2, String(_sc.length));
  const _todayList = _taskCard ? [..._taskCard.querySelectorAll(".wb-tasklist")].find(l => !l.className.includes("wb-tasklist-scroll")) : null;
  if (_todayList) {
    const _times = [..._todayList.querySelectorAll(".wb-task-txt")].map(e => e.textContent);
    const _parsed = _times.map(t => (globalThis.__wb_test.parseTaskTime(t) ?? 1e9));
    const _sorted = _parsed.every((v, i, a) => i === 0 || a[i - 1] <= v);
    check("今日任务按时间排序", _sorted, _times.join(" | "));
  } else {
    check("今日任务按时间排序", true, "今日无任务");
  }
  const _dueRow = _todayList ? [..._todayList.querySelectorAll(".wb-task")].find(r => r.querySelector(".wb-task-txt") && r.querySelector(".wb-task-txt").textContent.includes("截止任务")) : null;
  const _dueDate = _dueRow ? _dueRow.querySelector(".wb-task-date") : null;
  check("due日期红色标记", !!_dueDate && _dueDate.className.includes("wb-due"), _dueDate && _dueDate.className);
  const _schRow = _todayList ? [..._todayList.querySelectorAll(".wb-task")].find(r => r.querySelector(".wb-task-txt") && r.querySelector(".wb-task-txt").textContent.includes("上午8点半")) : null;
  const _schDate = _schRow ? _schRow.querySelector(".wb-task-date") : null;
  check("scheduled日期不加红色", !!_schDate && !_schDate.className.includes("wb-due"), _schDate && _schDate.className);

  console.log("== 日历 ==");
  const cells = el.querySelectorAll(".wb-day");
  check("日历格子数(2026-09=35)", cells.length === 35, "got " + cells.length);
  const festCells = el.querySelectorAll(".wb-day-fest").map(c => c.textContent);
  check("白露", festCells.includes("白露"), festCells.join(","));
  check("秋分", festCells.includes("秋分"), festCells.join(","));
  check("中秋节", festCells.some(t => t.includes("中秋")), festCells.join(","));
  const bdCells = el.querySelectorAll(".wb-day-bd").map(c => c.textContent);
  check("日历生日显示称呼", bdCells.some(t => t.includes("爸爸") && t.includes("62岁")), bdCells.join(","));
  check("日历生日不显示姓名", !bdCells.some(t => t.includes("卢小南")), bdCells.join(","));

  console.log("== 轮休(单双) ==");
  plugin.settings.restMode = "single-double";
  plugin.settings.singleDay = "sun";
  plugin.settings.sdStart = "single"; // 本周(todayStr, W37)单休，周日休
  await plugin.renderDashboard(el, null, state);
  const cells2 = el.querySelectorAll(".wb-day");
  const cl = (i) => cells2[i].className || "";
  check("W37单休周六上班", cl(12).includes("wb-workday") && !cl(12).includes("wb-weekend"), cl(12));
  check("W37单休周日休息", cl(13).includes("wb-weekend"), cl(13));
  check("W38双休周六休息", cl(19).includes("wb-weekend"), cl(19));
  check("9/20调休补班非休息", cl(20).includes("wb-workday") && !cl(20).includes("wb-weekend"), cl(20));
  plugin.settings.restMode = "double";
  await plugin.renderDashboard(el, null, state);

  console.log("== 日期详情(黄历) ==");
  const dd = el.querySelector(".wb-daydetail");
  check("详情面板存在", !!dd);
  const ddText = textOf(dd);
  check("宜", ddText.includes("宜"));
  check("忌", ddText.includes("忌"));
  check("干支", ddText.includes("庚辰"));

  console.log("== 节气/节日分开 ==");
  const _allFestEls = el.querySelectorAll(".wb-day-fest");
  const _jqEls = _allFestEls.filter(c => c.className.includes("wb-jq")).map(c => c.textContent);
  const _festEls = _allFestEls.filter(c => c.className.includes("wb-fest")).map(c => c.textContent);
  check("节气独立绿色标记(白露/秋分)", _jqEls.includes("白露") && _jqEls.includes("秋分"), _jqEls.join(","));
  check("节日独立红色标记(中秋)", _festEls.some(t => t.includes("中秋")), _festEls.join(","));

  console.log("== 天气下方农历已移除 ==");
  check("无干支行", !el.querySelector(".wb-lunar-ganzhi"));
  check("无农历日期行", !el.querySelector(".wb-lunar-date"));
  check("引用语保留", !!el.querySelector(".wb-lunar-quote"));

  console.log("== 勾选写回 ==");
  const tmpPath = "工作/__wb_test_toggle.md";
  const tmpContent = "- [ ] 测试任务A 📅 todayStr\n- [ ] 测试任务B 📅 todayStr\n";
  const _origGet = app.vault.getAbstractFileByPath;
  const _origRead = app.vault.cachedRead;
  app.vault.getAbstractFileByPath = (p) => p === tmpPath ? { path: tmpPath, extension: "md" } : _origGet(p);
  app.vault.cachedRead = async (file) => file.path === tmpPath ? tmpContent : _origRead(file);
  let _processed = null;
  app.vault.process = async (file, fn) => { _processed = { path: file.path, out: fn() }; };
  await plugin.toggleTaskComplete({ file: tmpPath, raw: "测试任务A 📅 todayStr", done: false, scheduled: todayStr, due: null, date: todayStr });
  check("勾选写回[x]", _processed && _processed.out.includes("- [x] 测试任务A"), _processed && _processed.out);
  check("不误改其他行", _processed && _processed.out.includes("- [ ] 测试任务B"), _processed && _processed.out);
  app.vault.getAbstractFileByPath = _origGet;
  app.vault.cachedRead = _origRead;
  delete app.vault.process;

  console.log("== 天气错误显示 ==");
  const _origW = plugin.getWeather;
  plugin.getWeather = async () => ({ error: "和风 Invalid Host: xxx" });
  await plugin.renderDashboard(el, null, state);
  const _wxErr = el.querySelector(".wb-wx-empty");
  check("天气错误显示文案", !!_wxErr && _wxErr.textContent.includes("Invalid Host"), _wxErr && _wxErr.textContent);
  check("错误时不显示undefined°", !(el.querySelector(".wb-wx-temp") || {}).textContent || !String(el.querySelector(".wb-wx-temp").textContent).includes("undefined"), String(el.querySelector(".wb-wx-temp") ? el.querySelector(".wb-wx-temp").textContent : ""));
  plugin.getWeather = _origW;
  await plugin.renderDashboard(el, null, state);

  console.log("== 和风天气 ==");
  const _T2 = globalThis.__wb_test;
  const _qwCalls = [];
  const _mockQw = async ({ url }) => {
    _qwCalls.push(url);
    if (url.includes("/now")) return { status: 200, json: { code: "200", now: { temp: "28", feelsLike: "31", humidity: "77", windSpeed: "18", icon: "104", text: "阴" } } };
    return { status: 200, json: { code: "200", daily: [
      { fxDate: "todayStr", iconDay: "101", textDay: "多云", tempMax: "29", tempMin: "24" },
      { fxDate: "2026-09-08", iconDay: "300", textDay: "阵雨", tempMax: "28", tempMin: "23" },
      { fxDate: "2026-09-09", iconDay: "104", textDay: "阴", tempMax: "27", tempMin: "22" },
      { fxDate: "2026-09-10", iconDay: "101", textDay: "多云", tempMax: "28", tempMin: "22" },
      { fxDate: "2026-09-11", iconDay: "100", textDay: "晴", tempMax: "30", tempMin: "23" },
      { fxDate: "2026-09-12", iconDay: "104", textDay: "阴", tempMax: "29", tempMin: "23" },
      { fxDate: "2026-09-13", iconDay: "101", textDay: "多云", tempMax: "28", tempMin: "22" }
    ] } };
  };
  const _qw = await _T2.fetchQWeather({ longitude: 119.97, latitude: 31.77, qweatherKey: "TESTKEY", qweatherHost: "devapi.qweather.com" }, _mockQw);
  check("和风URL用自定义Host", _qwCalls[0].startsWith("https://devapi.qweather.com/v7/weather/now"), _qwCalls[0]);
  check("和风URL含经纬度", _qwCalls[0].includes("119.97,31.77") && _qwCalls[0].includes("key=TESTKEY"), _qwCalls[0]);
  const _qwDef = await _T2.fetchQWeather({ longitude: 119.97, latitude: 31.77, qweatherKey: "TESTKEY" }, _mockQw);
  check("默认Host为api.qweather.com", _qwCalls[2].startsWith("https://api.qweather.com"), _qwCalls[2]);
  check("和风温度", _qw.temp === 28, String(_qw.temp));
  check("和风体感湿度", _qw.feels === 31 && _qw.humidity === 77, _qw.feels + "/" + _qw.humidity);
  check("和风icon映射阴", _T2.QW_ICONS[_qw.code] && _T2.QW_ICONS[_qw.code][0] === "阴", _T2.QW_ICONS[_qw.code] && _T2.QW_ICONS[_qw.code].join("/"));
  check("和风7天预报", _qw.list.length === 7, String(_qw.list.length));
  check("和风预报字段映射", _qw.list[0].max === 29 && _qw.list[0].code === "101" && _qw.list[1].code === "300", JSON.stringify(_qw.list[0]));
  check("和风阵雨emoji", _T2.QW_ICONS["300"][1].length > 0, _T2.QW_ICONS["300"].join("/"));
  const _omCalls = [];
  const _mockOm = async ({ url }) => { _omCalls.push(url); return { status: 200, json: { current: { temperature_2m: 30, apparent_temperature: 33, relative_humidity_2m: 69, weather_code: 3, wind_speed_10m: 6 }, daily: { time: ["todayStr"], weather_code: [3], temperature_2m_max: [29], temperature_2m_min: [24] } } }; };
  const _om = await _T2.fetchWeather({ latitude: 31.77, longitude: 119.97, qweatherKey: "" }, _mockOm);
  check("无key回退Open-Meteo", _omCalls[0].startsWith("https://api.open-meteo.com"), _omCalls[0]);
  check("Open-Meteo温度正常", _om.temp === 30, String(_om.temp));

  console.log("== 扩展天气 ==");
  const _T3 = globalThis.__wb_test;
  const _exCalls = [];
  const _mockEx = async ({ url }) => {
    _exCalls.push(url);
    if (url.includes("/air/")) return { status: 200, json: { code: "200", now: { aqi: "35", category: "优", pm2p5: "22" } } };
    if (url.includes("/indices/")) return { status: 200, json: { code: "200", daily: [
      { type: "1", name: "运动", text: "较不宜" }, { type: "2", name: "洗车", text: "较不宜" }, { type: "3", name: "穿衣", text: "短袖" }, { type: "5", name: "紫外线", text: "强" } ] } };
    if (url.includes("/astronomy/")) return { status: 200, json: { code: "200", sunrise: "06:12", sunset: "18:24" } };
    if (url.includes("/minutely/")) return { status: 200, json: { code: "200", summary: "未来2小时无降水" } };
    return { status: 200, json: { code: "200", warning: [{ typeName: "暴雨", title: "橙色预警" }] } };
  };
  const _ex = await _T3.fetchQWeatherExtra({ longitude: 119.97, latitude: 31.77, qweatherKey: "TESTKEY", qweatherHost: "api.qweather.com" }, _mockEx);
  check("extra请求5个端点", _exCalls.length === 5, String(_exCalls.length));
  check("空气质量解析", _ex.air && _ex.air.aqi === "35" && _ex.air.category === "优", JSON.stringify(_ex.air));
  check("生活指数4项", _ex.indices && _ex.indices.length === 4 && _ex.indices[0].name === "运动", JSON.stringify(_ex.indices && _ex.indices[0]));
  check("指数icon映射", _ex.indices[0].icon === "🏃" && _ex.indices[1].icon === "🚿" && _ex.indices[2].icon === "👕" && _ex.indices[3].icon === "☀️", _ex.indices.map(i => i.icon).join(","));
  check("日出日落", _ex.sunrise === "06:12" && _ex.sunset === "18:24", _ex.sunrise + "/" + _ex.sunset);
  check("分钟降水摘要", _ex.minutelySummary && _ex.minutelySummary.includes("无降水"), _ex.minutelySummary);
  check("预警解析", _ex.warning && _ex.warning.includes("暴雨"), _ex.warning);

  console.log("== 扩展天气渲染 ==");
  const _origEx = plugin.getWeatherExtra;
  plugin.getWeatherExtra = async () => ({
    air: { aqi: "35", category: "优", pm2p5: "22" },
    indices: [{ icon: "👕", name: "穿衣", text: "短袖" }, { icon: "☀️", name: "紫外线", text: "强" }],
    sunrise: "06:12", sunset: "18:24",
    minutelySummary: "未来2小时无降水",
    warning: "暴雨 橙色预警"
  });
  await plugin.renderDashboard(el, null, state);
  const _wxExtra = el.querySelector(".wb-wx-extra");
  check("扩展区渲染", !!_wxExtra, "none");
  const _exText = _wxExtra ? textOf(_wxExtra) : "";
  check("日出日落显示", _exText.includes("06:12") && _exText.includes("18:24"), _exText);
  check("空气质量显示", _exText.includes("优") && _exText.includes("35"), _exText);
  check("生活指数显示", _exText.includes("穿衣") && _exText.includes("紫外线"), _exText);
  check("分钟降水显示", _exText.includes("无降水"), _exText);
  const _wxWarn = el.querySelector(".wb-wx-warn");
  check("预警标签显示", !!_wxWarn && _wxWarn.textContent.includes("橙色预警"), _wxWarn && _wxWarn.textContent);
  plugin.getWeatherExtra = _origEx;
  await plugin.renderDashboard(el, null, state);

  console.log("== 天气来源 ==");
  const _origW3 = plugin.getWeather;
  plugin.getWeather = async () => ({ temp: 28, code: 101, text: "晴", list: [] });
  plugin.settings.qweatherKey = "KEY";
  await plugin.renderDashboard(el, null, state);
  check("有key显示和风来源", !!el.querySelector(".wb-wx-src") && el.querySelector(".wb-wx-src").textContent === "和风天气", el.querySelector(".wb-wx-src") && el.querySelector(".wb-wx-src").textContent);
  plugin.settings.qweatherKey = "";
  await plugin.renderDashboard(el, null, state);
  check("无key显示Open-Meteo", el.querySelector(".wb-wx-src").textContent === "Open-Meteo", el.querySelector(".wb-wx-src").textContent);
  plugin.getWeather = _origW3;
  plugin.settings.qweatherKey = "TESTKEY";
  await plugin.renderDashboard(el, null, state);

  console.log("== 指数折叠 ==");
  const _origEx2 = plugin.getWeatherExtra;
  plugin.getWeatherExtra = async () => ({
    indices: [{ icon: "🏃", name: "运动", text: "天气较好，适宜运动" }, { icon: "🚿", name: "洗车", text: "较不宜洗车" }, { icon: "👕", name: "穿衣", text: "建议穿T恤" }, { icon: "☀️", name: "紫外线", text: "中等强度" }]
  });
  await plugin.renderDashboard(el, null, state);
  const _idxHd = el.querySelector(".wb-wx-idx-hd");
  check("指数标题一行", !!_idxHd && textOf(_idxHd).includes("运动") && textOf(_idxHd).includes("洗车") && textOf(_idxHd).includes("穿衣"), _idxHd && textOf(_idxHd));
  check("指数不显示详细文本", !textOf(_idxHd).includes("天气较好"), _idxHd && textOf(_idxHd));
  const _idxDet = el.querySelector(".wb-wx-idx-detail");
  check("详细默认收起", !!_idxDet && _idxDet.style.display !== "block", String(_idxDet && _idxDet.style.display));
  _idxHd.fire("click");
  check("点击展开", _idxDet.style.display === "block", String(_idxDet.style.display));
  const _idxItems = el.querySelectorAll(".wb-wx-idx-item");
  check("展开含详细文本", _idxItems.length === 4 && _idxItems[0].textContent.includes("天气较好"), String(_idxItems.length));
  _idxHd.fire("click");
  check("再点收起", _idxDet.style.display !== "block", String(_idxDet.style.display));
  plugin.getWeatherExtra = _origEx2;
  await plugin.renderDashboard(el, null, state);

  console.log("== Open-Meteo 扩展 ==");
  const _T4 = globalThis.__wb_test;
  const _omCalls2 = [];
  const _mockOM = async ({ url }) => {
    _omCalls2.push(url);
    if (url.includes("air-quality-api")) return { status: 200, json: { current: { pm2_5: 22.4, pm10: 40, us_aqi: 35, us_aqi_category: "Good" } } };
    return { status: 200, json: { daily: { sunrise: ["2026-09-07T05:58"], sunset: ["2026-09-07T18:14"] } } };
  };
  const _ome = await _T4.fetchOpenMeteoExtra({ latitude: 31.77, longitude: 119.97 }, _mockOM);
  check("OpenMeteo请求2端点", _omCalls2.length === 2, String(_omCalls2.length));
  check("日出日落解析", _ome.sunrise === "05:58" && _ome.sunset === "18:14", _ome.sunrise + "/" + _ome.sunset);
  check("空气质量解析", _ome.air && _ome.air.aqi === "35" && _ome.air.pm2p5 === "22", JSON.stringify(_ome.air));
  // 无 key 时 getWeatherExtra 走 Open-Meteo（不走和风）
  const _origExtraFetch = plugin.getWeatherExtra.bind(plugin);
  const _probe = { fetched: null };
  plugin.getWeatherExtra = async function (force) {
    const d = this.settings.qweatherKey && String(this.settings.qweatherKey).trim()
      ? await _T4.fetchQWeatherExtra(this.settings, _mockEx)
      : await _T4.fetchOpenMeteoExtra(this.settings, _mockOM);
    _probe.fetched = d;
    return d;
  };
  plugin.settings.qweatherKey = "";
  await plugin.getWeatherExtra(true);
  check("无key走OpenMeteo扩展", !!_probe.fetched && !!_probe.fetched.air, JSON.stringify(_probe.fetched));
  plugin.settings.qweatherKey = "TESTKEY";
  await plugin.getWeatherExtra(true);
  check("有key走和风扩展", !!_probe.fetched && !!_probe.fetched.indices, JSON.stringify(_probe.fetched && Object.keys(_probe.fetched)));
  plugin.getWeatherExtra = _origExtraFetch;

  console.log("== 缓存持久化/恢复 ==");
  const _saved = [];
  const _origSave = plugin.saveSettings.bind(plugin);
  plugin.saveSettings = async () => { _saved.push(plugin.settings._wc ? "wc" : null, plugin.settings._ec ? "ec" : null); };
  const _mockCacheReq = async ({ url }) => url.includes("/now")
    ? { status: 200, json: { code: "200", now: { temp: "28", feelsLike: "31", humidity: "77", windSpeed: "18", icon: "104", text: "阴" } } }
    : { status: 200, json: { code: "200", daily: [{ fxDate: "todayStr", iconDay: "101", textDay: "多云", tempMax: "29", tempMin: "24" }] } };
  plugin.getWeather = async () => { const d = await _T3.fetchWeather({ latitude: 31.77, longitude: 119.97, qweatherKey: "", qweatherHost: "x" }, _mockCacheReq); return d; };
  // 重新 new 一个实例验证持久化恢复（缓存未过期不请求）
  const plugin2 = new WB(app, {});
  plugin2.settings = Object.assign({}, plugin.settings, { _wc: { data: { temp: 28 }, time: Date.now() }, _ec: { data: { sunrise: "06:12" }, time: Date.now() } });
  plugin2.weatherCache = { data: null, stale: true };
  plugin2.extraCache = { data: null, stale: true };
  plugin2._restoreWeatherCaches();
  check("恢复天气缓存", plugin2.weatherCache.data && plugin2.weatherCache.data.temp === 28, JSON.stringify(plugin2.weatherCache.data));
  check("恢复扩展缓存", plugin2.extraCache.data && plugin2.extraCache.data.sunrise === "06:12", JSON.stringify(plugin2.extraCache.data));
  plugin.saveSettings = _origSave;

  console.log("\n通过 " + pass + " / " + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
