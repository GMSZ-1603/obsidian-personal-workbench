/* =====================================================================
 * 个人工作台 Personal Workbench
 * 以笔记内代码块 (```workbench) 渲染的个人工作台：
 *   顶部横幅 / 查询栏 / 天气+当天农历 / 年度进度 / 今日任务 / 生日提醒 / 农历万年历
 * 依赖：上方已拼接的 lunar-javascript（captured as lunarLib）
 * ===================================================================== */
const lunarLib = module.exports; // captured from lunar-javascript UMD bundle
const { Plugin, PluginSettingTab, Setting, Notice, requestUrl, Component, ItemView, setIcon } = require("obsidian");

const VIEW_TYPE_WORKBENCH = "personal-workbench-view";
const DEFAULT_HEAT_COLS = 24; // 热力图默认列数（无测量宽度时）

/* 法定节假日（来源：国务院办公厅《关于2026年部分节假日安排的通知》国办发明电〔2025〕7号）
 * 值 = 假日名（放假）；null = 调休上班日（周末补班）。2027 年起需按新年度通知更新。 */
const HOLIDAYS = {
  "2026": {
    "2026-01-01": "元旦", "2026-01-02": "元旦", "2026-01-03": "元旦", "2026-01-04": null,
    "2026-02-14": null,
    "2026-02-15": "春节", "2026-02-16": "春节", "2026-02-17": "春节", "2026-02-18": "春节",
    "2026-02-19": "春节", "2026-02-20": "春节", "2026-02-21": "春节", "2026-02-22": "春节", "2026-02-23": "春节",
    "2026-02-28": null,
    "2026-04-04": "清明", "2026-04-05": "清明", "2026-04-06": "清明",
    "2026-05-01": "劳动节", "2026-05-02": "劳动节", "2026-05-03": "劳动节", "2026-05-04": "劳动节", "2026-05-05": "劳动节",
    "2026-05-09": null,
    "2026-06-19": "端午", "2026-06-20": "端午", "2026-06-21": "端午",
    "2026-09-20": null,
    "2026-09-25": "中秋", "2026-09-26": "中秋", "2026-09-27": "中秋",
    "2026-10-01": "国庆", "2026-10-02": "国庆", "2026-10-03": "国庆", "2026-10-04": "国庆",
    "2026-10-05": "国庆", "2026-10-06": "国庆", "2026-10-07": "国庆",
    "2026-10-10": null
  }
  // 每年 11 月国务院公布次年安排后，在此新增一年数据："2027": { ... }
};

/* ---------------- 常量 ---------------- */
const LUNAR_MONTHS = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 冬: 11, 腊: 12 };
const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];
const WMO = {
  0: ["晴", "☀️"], 1: ["大致晴朗", "🌤️"], 2: ["局部多云", "⛅"], 3: ["阴", "☁️"],
  45: ["雾", "🌫️"], 48: ["冻雾", "🌫️"], 51: ["小毛毛雨", "🌦️"], 53: ["毛毛雨", "🌦️"], 55: ["大毛毛雨", "🌦️"],
  56: ["冻毛毛雨", "🌧️"], 57: ["强冻毛毛雨", "🌧️"], 61: ["小雨", "🌧️"], 63: ["中雨", "🌧️"], 65: ["大雨", "🌧️"],
  66: ["冻雨", "🌧️"], 67: ["强冻雨", "🌧️"], 71: ["小雪", "🌨️"], 73: ["中雪", "🌨️"], 75: ["大雪", "🌨️"], 77: ["雪粒", "🌨️"],
  80: ["小阵雨", "🌦️"], 81: ["阵雨", "🌦️"], 82: ["强阵雨", "🌧️"], 85: ["小阵雪", "🌨️"], 86: ["大阵雪", "🌨️"],
  95: ["雷阵雨", "⛈️"], 96: ["雷阵雨伴冰雹", "⛈️"], 99: ["强雷暴伴冰雹", "⛈️"]
};

/* 和风天气 icon 映射（填写 qweatherKey 时使用） */
const QW_ICONS = {
  "100": ["晴", "☀️"], "101": ["多云", "⛅"], "102": ["少云", "🌤️"], "103": ["晴间多云", "🌤️"], "104": ["阴", "☁️"],
  "150": ["晴(夜)", "🌙"], "151": ["多云(夜)", "☁️"], "152": ["少云(夜)", "☁️"], "153": ["晴间多云(夜)", "☁️"],
  "300": ["阵雨", "🌦️"], "301": ["强阵雨", "🌧️"], "302": ["雷阵雨", "⛈️"], "303": ["雷阵雨伴冰雹", "⛈️"],
  "304": ["小雨转雷阵雨", "⛈️"], "305": ["中雨转雷阵雨", "⛈️"], "306": ["大雨转雷阵雨", "⛈️"], "307": ["冻雨", "🌧️"],
  "308": ["小到中雨", "🌧️"], "309": ["中到大雨", "🌧️"], "310": ["大到暴雨", "🌧️"], "311": ["暴雨", "🌧️"],
  "312": ["大暴雨", "🌧️"], "313": ["特大暴雨", "🌧️"], "314": ["强降雨", "🌧️"], "315": ["毛毛雨", "🌦️"],
  "400": ["小雪", "❄️"], "401": ["中雪", "❄️"], "402": ["大雪", "❄️"], "403": ["暴雪", "❄️"], "404": ["雨夹雪", "🌨️"],
  "405": ["雨雪天气", "🌨️"], "406": ["阵雨夹雪", "🌨️"], "407": ["阵雪", "❄️"], "408": ["小到中雪", "❄️"],
  "409": ["中到大雪", "❄️"], "410": ["大到暴雪", "❄️"], "411": ["冻雪", "❄️"],
  "500": ["薄雾", "🌫️"], "501": ["雾", "🌫️"], "502": ["霾", "😷🏻"], "503": ["扬沙", "💨"], "504": ["浮尘", "💨"],
  "507": ["沙尘暴", "💨"], "508": ["强沙尘暴", "💨"], "509": ["浓雾", "🌫️"], "510": ["强浓雾", "🌫️"],
  "511": ["中度霾", "😷🏻"], "512": ["重度霾", "😷🏻"], "513": ["严重霾", "😷🏻"], "514": ["大雾", "🌫️"], "515": ["特强浓雾", "🌫️"],
  "900": ["热", "🥵"], "901": ["冷", "🥶"], "999": ["未知", "🌡️"]
};
const DEFAULT_SETTINGS = {
  city: "常州",
  latitude: 31.77,
  longitude: 119.97,
  birthdayFile: "生活/生日日期.md",
  excludeFolders: ["图片", "Templates", "OneNote", "smart-note-agent", ".smartnotes", "微信公众号文章", "统计"],
  refreshMinutes: 10,
  qweatherKey: "",
  qweatherHost: "api.qweather.com",
  extraRefreshMinutes: 30,
  openOnStartup: true,
  bannerEnabled: true,
  queryEnabled: true,
  weatherEnabled: true,
  yearProgressEnabled: true,
  todayTasksEnabled: true,
  birthdaysEnabled: true,
  calendarEnabled: true,
  restMode: "double",
  singleDay: "sun",
  sdStart: "double",
  manualWeeks: {},
  heatmapLogWritten: [],
  editLog: {}
};

/* ---------------- 通用工具 ---------------- */
function fmtDate(y, m, d) { return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function todayStr() { const n = new Date(); return fmtDate(n.getFullYear(), n.getMonth() + 1, n.getDate()); }
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function dayOfYear(d) { const s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 86400000); }
function daysInYear(y) { return isLeap(y) ? 366 : 365; }

function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/* ISO 周号（周一为一周开始） */
function isoWeek(y, m, d) {
  const dt = new Date(y, m - 1, d);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day + 3);
  const firstThu = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
}

/* 某年全部周末：{ ISO周号: [周六Date, 周日Date] } */
function yearWeekends(year) {
  const map = {};
  const d = new Date(year, 0, 1);
  for (; d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const wk = isoWeek(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const dow = d.getDay();
    if (dow === 6 || dow === 0) (map[wk] = map[wk] || []).push(new Date(d));
  }
  return map;
}

/* 周末是否休息（支持单双轮休 / 手动逐周覆盖）dow: 0=周日 6=周六 */
function weekendRest(settings, y, m, d, dow) {
  const mode = (settings && settings.restMode) || "double";
  if (mode === "double") return true;
  const wk = String(isoWeek(y, m, d));
  const ov = ((settings.manualWeeks || {})[String(y)] || {})[wk];
  if (mode === "manual") {
    if (ov === "double") return true;
    if (ov === "sat") return dow === 6;
    if (ov === "sun") return dow === 0;
    return true;
  }
  // 单双轮休：手动覆盖优先，未覆盖按奇偶周交替
  if (ov === "double") return true;
  if (ov === "sat") return dow === 6;
  if (ov === "sun") return dow === 0;
  const n = new Date();
  const wk0 = isoWeek(n.getFullYear(), n.getMonth() + 1, n.getDate());
  const single = (settings.sdStart === "single") === ((isoWeek(y, m, d) % 2) === (wk0 % 2));
  if (single) return dow === (settings.singleDay === "sat" ? 6 : 0);
  return true;
}

/* ============ 热力图记录笔记（生成/追加，永久保留） ============ */
const HEATMAP_LOG_PATH = "统计/热力图编辑记录.md";
const HEATMAP_LOG_HEADER = "# 热力图编辑记录\n\n> 由 personal-workbench 插件自动生成 · 记录每日编辑明细 · 已有内容永久保留\n\n";

/* 单个日期的 block 文本：## 日期 · 编辑 N 篇 + wiki 链接列表 */
function heatmapSection(ymd, paths) {
  const list = paths && paths.length ? paths : [];
  const lines = [`## ${ymd} · 编辑 ${list.length} 篇`];
  for (const p of list) lines.push(`- [[${p}]]`);
  return lines.join("\n");
}

/* 计算待追加日期（未写入过的，升序）；返回 null 表示无新增 */
function heatmapPendingDates(dayFiles, written) {
  const w = new Set(written || []);
  const keys = Object.keys(dayFiles).filter(k => (dayFiles[k] || []).length > 0);
  const pending = keys.filter(k => !w.has(k)).sort();
  return pending.length ? pending : null;
}

/* 解析任务文本中的时间描述（如 上午9点 / 下午1点半 / 14:00）→ 当日分钟数；无法解析返回 null */
function parseTaskTime(text) {
  if (!text) return null;
  let m = text.match(/(\d{1,2}):(\d{1,2})/);
  if (m) return (+m[1]) * 60 + (+m[2]);
  m = text.match(/(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里|半夜)?\s*(\d{1,2})\s*[点时]\s*(\d{1,2})?\s*分?\s*(半)?/);
  if (!m) return null;
  let h = +m[2];
  const min = m[3] ? +m[3] : (m[4] ? 30 : 0);
  const p = m[1] || '';
  if ((p === '下午' || p === '傍晚' || p === '晚上' || p === '夜里' || p === '半夜') && h < 12) h += 12;
  if (p === '中午' && h < 11) h += 12;
  return h * 60 + min;
}
/* 农历中文日 -> 数字（初一..三十） */
function parseCnDay(s) {
  if (!s) return null;
  if (s === "三十") return 30;
  if (s === "二十") return 20;
  if (s.startsWith("廿")) {
    const v = CN_NUM[s[1]];
    return v ? 20 + v : 20;
  }
  if (s.startsWith("十")) {
    if (s === "十") return 10;
    const v = CN_NUM[s[1]];
    return v ? 10 + v : null;
  }
  if (s.length === 1) return CN_NUM[s] || null;
  if (s.length === 2) {
    const a = CN_NUM[s[0]], b = CN_NUM[s[1]];
    if (a && b) return a * 10 + b;
  }
  return null;
}

/* 农历年中文/阿拉伯数字 -> 数字（如"一九六四年"->1964，"1964年"->1964） */
function cnYearToNum(s) {
  if (!s) return null;
  s = String(s).replace(/年/g, "").trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n >= 1900 && n <= 2100 ? n : null;
  }
  const map = { "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  let n = 0;
  for (const ch of s) {
    if (map[ch] === undefined) return null;
    n = n * 10 + map[ch];
  }
  return n >= 1900 && n <= 2100 ? n : null;
}

/* 解析生日日期字符串：优先农历（可带前置农历年，如"一九六四年八月十二"），其次公历（9月16日） */
function parseBirthdayDate(s) {
  // 农历：可选前置农历年 + 月日（支持"十一/十二月"）
  let m = s.match(/([\d〇零一二三四五六七八九]+年)?(正|十一|十二|一|二|三|四|五|六|七|八|九|十|冬|腊)月([一二三四五六七八九十廿]+)/);
  if (m) {
    const month = LUNAR_MONTHS[m[2]];
    const day = parseCnDay(m[3]);
    if (month && day) {
      const lunarYear = cnYearToNum(m[1] || "");
      const r = { type: "lunar", month, day };
      if (lunarYear) r.lunarYear = lunarYear;
      return r;
    }
  }
  m = s.match(/^(\d{1,2})月(\d{1,2})日?$/);
  if (m) {
    const month = parseInt(m[1], 10), day = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { type: "solar", month, day };
  }
  return null;
}

/* 农历某年某月是否存在该日 */
function lunarHasDay(y, month, day) {
  try {
    const lm = lunarLib.LunarMonth.fromYm(y, month);
    return !!lm && day <= lm.getDayCount();
  } catch (e) { return false; }
}

/* 农历生日 -> 该农历年的公历日期 */
function lunarBirthdaySolar(lunarYear, month, day) {
  if (!lunarHasDay(lunarYear, month, day)) return null;
  try {
    const solar = lunarLib.Lunar.fromYmd(lunarYear, month, day).getSolar();
    return { y: solar.getYear(), m: solar.getMonth(), d: solar.getDay() };
  } catch (e) { return null; }
}

/* 农历出生年 -> 某农历年生日时该周岁 */
function lunarBirthdayAge(birthLunarYear, eventLunarYear) {
  return eventLunarYear - birthLunarYear;
}

function lunarMonthCn(m) {
  const map = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  return map[m] || String(m);
}

/* 农历 (月, 日) -> 中文写法，如 (8,12) -> "八月十二" */
function lunarCnDate(month, day) {
  const cnDay = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  return lunarMonthCn(month) + "月" + (cnDay[day] || String(day));
}

/* 每日一签（参考 apex-dashboard）：现代优美语句库，按日期确定性取一条，每天不同 */
const DAILY_QUOTES = [
  "生活明朗，万物可爱，人间值得，未来可期。",
  "慢慢来，谁不是翻山越岭去相爱。",
  "你若盛开，蝴蝶自来；你若精彩，天自安排。",
  "所有的美好，都值得等待。",
  "世界那么大，总有人翻山越岭为你而来。",
  "愿你眼里有光，心中有海，目之所及皆是美好。",
  "把日子过成诗，把生活酿成酒。",
  "心之所向，素履以往；生如逆旅，一苇以航。",
  "每个不曾起舞的日子，都是对生命的辜负。",
  "生活不是为了赶路，而是为了感受路。",
  "慢慢变好，才是给自己最好的礼物。",
  "万物皆有裂痕，那是光照进来的地方。",
  "你若温柔，世界便温柔以待。",
  "把期待降低，把依赖变少，你会过得很好。",
  "好好生活，慢慢相遇，不卑不亢，清澈善良。",
  "愿所有的等待，都不被辜负。",
  "温柔的人，就像星星，自己发光也照亮别人。",
  "别慌，月亮也正在大海某处迷茫。",
  "生活虽苦，但你要甜。",
  "做自己喜欢的事，是这世界最奢侈的自由。",
  "你未必光芒万丈，但始终温暖有光。",
  "只要朝着阳光努力向上，日子就会变得单纯而美好。",
  "梦想不是用来实现的，而是用来一步一步靠近的。",
  "所有的相遇，都是久别重逢。",
  "生活的最佳状态，是冷冷清清的风风火火。",
  "愿你走出半生，归来仍是少年。",
  "有趣的灵魂，终会相遇。",
  "该来的都在路上，你要做的就是做好自己。",
  "不要急，最好的总会在最不经意的时候出现。",
  "越努力，越幸运；越善良，越美好。",
  "日子常新，未来不远，慢慢来，比较快。",
  "心存善意，途遇天使。",
  "所有的苦，都会化作未来的糖。",
  "把心安顿好，人生即是坦途。",
  "岁月静好，现世安稳，愿你我都被温柔以待。",
  "你眼中的世界，就是你内心的投影。",
  "生活不是选择，而是热爱。",
  "不念过往，不畏将来，如此安好。",
  "愿你三冬暖，愿你春不寒，愿你天黑有灯，下雨有伞。",
  "心中若有桃花源，何处不是水云间。",
  "简单点，糊涂点，开心点，风雨里做个大人，阳光下做个孩子。",
  "你的善良，必须带点锋芒。",
  "与其互为人间，不如自成宇宙。",
  "愿你被这个世界温柔以待，即使生命总以刻薄荒芜相欺。",
  "每一个普通的改变，都将改变普通。",
  "心宽一寸，路宽一丈；若不是心宽似海，哪有人生风平浪静。",
  "熬过无人问津的日子，才能拥抱诗和远方。",
  "幸福不是拥有得多，而是计较得少。",
  "所有的坚持，都源于热爱；所有的热爱，都值得奔赴。",
  "愿你历尽千帆，归来仍是少年。"
];

/* 按日期确定性取一条引用：与 apex 相同的日期哈希 */
function dailyQuote(y, m, d) {
  const idx = ((y * 10000 + m * 100 + d) * 2654435761 >>> 0) % DAILY_QUOTES.length;
  return DAILY_QUOTES[idx];
}

/* 正文提取：去掉开头 frontmatter YAML 块（---...---），用于"仅元属性修改不计入编辑"判断 */
function bodyText(t) {
  if (typeof t !== "string") return t || "";
  if (t.startsWith("---")) {
    const nl = t.indexOf("\n", 3);
    if (nl > 0) {
      const close = t.indexOf("\n---", nl + 1);
      if (close > 0) return t.slice(close + 5);
    }
  }
  return t;
}
/* FNV-1a 32 位正文 hash */
function bodyHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* 将一句引用按标点/中点分成两行，使两行字数相近、不挤在一行 */
function splitQuote(s) {
  if (!s) return ["", ""];
  const mid = Math.ceil(s.length / 2);
  let best = -1, bestDist = s.length;
  for (let i = 1; i < s.length - 1; i++) {
    if ("，。、；：,.;!?！？ ".includes(s[i])) {
      const pos = i + 1;
      const d = Math.abs(pos - mid);
      if (d < bestDist) { bestDist = d; best = pos; }
    }
  }
  if (best < 0) return [s.slice(0, mid).trim(), s.slice(mid).trim()];
  return [s.slice(0, best).trim(), s.slice(best).trim()];
}

/* 时间戳 -> YYYY-MM-DD */
function ymdOf(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/* 连续活跃天数：从今天（或昨天）往前连续有编辑记录的天数 */
function calcStreak(dateSet) {
  const p = n => String(n).padStart(2, "0");
  const key = d => d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  let cur = new Date();
  if (!dateSet.has(key(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (dateSet.has(key(cur))) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}

/* ---------------- 数据扫描 ---------------- */
async function scanTasks(app, settings) {
  const files = app.vault.getMarkdownFiles();
  const excl = (settings.excludeFolders || [])
    .map(f => String(f).replace(/\\/g, "/").replace(/\/+$/, ""))
    .filter(Boolean);
  const tasks = [];
  for (const file of files) {
    const path = file.path;
    if (excl.some(f => path === f || path.startsWith(f + "/"))) continue;
    let content;
    try { content = await app.vault.cachedRead(file); } catch (e) { continue; }
    const lines = content.split("\n");
    for (const line of lines) {
      const m = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
      if (!m) continue;
      const done = m[1] !== " ";
      const raw = m[2];
      const scheduled = (raw.match(/⏳\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
      const due = (raw.match(/📅\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
      const date = scheduled || due; // 优先 scheduled，无则 due
      if (!date) continue;
      const clean = raw
        .replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "")
        .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "")
        .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "")
        .replace(/🔁.*/g, "")
        .replace(/#task\b/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      tasks.push({ file: path, text: clean, raw, done, scheduled, due, date });
    }
  }
  return tasks;
}

async function scanBirthdays(app, settings) {
  const f = app.vault.getAbstractFileByPath(settings.birthdayFile);
  if (!f || f.extension !== "md") return [];
  let content;
  try { content = await app.vault.cachedRead(f); } catch (e) { return []; }
  const list = [];
  for (const raw of content.split("\n")) {
    let line = raw.trim().replace(/^[-*+]\s+/, "");
    if (!line || line.startsWith("#") || line.startsWith("---")) continue;
    const parts = line.split(/[，,]/);
    if (parts.length < 2) continue;
    const name = parts[0].trim();
    let nickname = null;
    let dateStr;
    if (parts.length >= 3) {
      nickname = parts[1].trim();
      dateStr = parts.slice(2).join("，").trim();
    } else {
      dateStr = parts.slice(1).join("，").trim();
    }
    const parsed = parseBirthdayDate(dateStr);
    if (!parsed || !name) continue;
    list.push({ name, nickname: nickname || name, ...parsed, dateRaw: dateStr });
  }
  return list;
}

async function fetchWeather(settings, _req) {
  const req = _req || requestUrl;
  if (settings.qweatherKey && String(settings.qweatherKey).trim()) {
    return await fetchQWeather(settings, _req);
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${settings.latitude}&longitude=${settings.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=7`;
  const res = await req({ url });
  if (res.status !== 200) throw new Error("weather status " + res.status);
  const j = res.json;
  const cur = j.current;
  const daily = j.daily;
  const list = (daily.time || []).map((t, i) => ({
    date: t,
    code: daily.weather_code[i],
    max: Math.round(daily.temperature_2m_max[i]),
    min: Math.round(daily.temperature_2m_min[i])
  }));
  return {
    temp: Math.round(cur.temperature_2m),
    feels: Math.round(cur.apparent_temperature),
    humidity: Math.round(cur.relative_humidity_2m),
    wind: cur.wind_speed_10m ? Math.round(cur.wind_speed_10m) : 0,
    code: cur.weather_code,
    list
  };
}

/* 和风天气（填写 qweatherKey 时使用，免费版 1000 次/日）*/
async function fetchQWeather(settings, _req) {
  const req = _req || requestUrl;
  const loc = `${settings.longitude},${settings.latitude}`;
  const key = String(settings.qweatherKey).trim();
  const base = `https://${settings.qweatherHost || "api.qweather.com"}/v7/weather/`;
  const [nowR, dailyR] = await Promise.all([
    req({ url: `${base}now?location=${loc}&key=${key}` }),
    req({ url: `${base}7d?location=${loc}&key=${key}` })
  ]);
  if (!nowR.json || !nowR.json.now) {
    const er = nowR.json && nowR.json.error;
    throw new Error("和风 " + (er ? (er.title || er.status) : "请求失败 HTTP " + nowR.status) + (er && er.detail ? ": " + er.detail : ""));
  }
  const now = nowR.json.now;
  const daily = (dailyR.json && dailyR.json.daily) || [];
  return {
    temp: Math.round(Number(now.temp)),
    feels: Math.round(Number(now.feelsLike)),
    humidity: Math.round(Number(now.humidity)),
    wind: Math.round(Number(now.windSpeed)),
    code: String(now.icon || ""),
    text: now.text || "",
    list: daily.slice(0, 7).map(d => ({
      date: d.fxDate,
      code: String(d.iconDay || ""),
      max: Math.round(Number(d.tempMax)),
      min: Math.round(Number(d.tempMin))
    }))
  };
}
/* 和风扩展天气（空气质量/生活指数/日出日落/分钟降水/预警）· 低频刷新控制请求数 */
async function fetchQWeatherExtra(settings, _req) {
  const req = _req || requestUrl;
  const host = settings.qweatherHost || "api.qweather.com";
  const loc = `${settings.longitude},${settings.latitude}`;
  const key = String(settings.qweatherKey).trim();
  const base = `https://${host}/v7/`;
  const out = {};
  const [airR, idxR, astR, minR, warnR] = await Promise.allSettled([
    req({ url: `${base}air/now?location=${loc}&key=${key}` }),
    req({ url: `${base}indices/1d?location=${loc}&key=${key}&type=1,2,3,5` }),
    req({ url: `${base}astronomy/now?location=${loc}&key=${key}` }),
    req({ url: `${base}minutely/5m?location=${loc}&key=${key}` }),
    req({ url: `${base}warning/now?location=${loc}&key=${key}` })
  ]);
  const j = (r) => r.status === "fulfilled" && r.value && r.value.json ? r.value.json : null;
  const air = j(airR);
  if (air && air.now) out.air = { aqi: air.now.aqi, category: air.now.category, pm2p5: air.now.pm2p5 };
  const idx = j(idxR);
  if (idx && idx.daily && idx.daily.length) {
    const icons = { 1: "🏃", 2: "🚿", 3: "👕", 4: "🎣", 5: "☀️", 8: "😊" };
    out.indices = idx.daily.slice(0, 4).map(d => ({ icon: icons[d.type] || "·", name: d.name, text: d.text }));
  }
  const ast = j(astR);
  if (ast && ast.sunrise) { out.sunrise = ast.sunrise; out.sunset = ast.sunset; }
  const min = j(minR);
  if (min && min.summary) out.minutelySummary = min.summary;
  const warn = j(warnR);
  if (warn && warn.warning && warn.warning.length) {
    out.warning = warn.warning.map(w => `${w.typeName || ""} ${w.title}`).filter(Boolean).slice(0, 2).join("；");
  }
  return out;
}
/* Open-Meteo 扩展天气（空气质量/日出日落）· 无 key 模式 */
async function fetchOpenMeteoExtra(settings, _req) {
  const req = _req || requestUrl;
  const lat = settings.latitude;
  const lon = settings.longitude;
  const out = {};
  const [fR, aR] = await Promise.allSettled([
    req({ url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&forecast_days=1` }),
    req({ url: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi,us_aqi_category` })
  ]);
  const j = (r) => r.status === "fulfilled" && r.value && r.value.json ? r.value.json : null;
  const f = j(fR);
  if (f && f.daily && f.daily.sunrise && f.daily.sunrise[0]) {
    out.sunrise = f.daily.sunrise[0].slice(11, 16);
    out.sunset = f.daily.sunset[0].slice(11, 16);
  }
  const a = j(aR);
  if (a && a.current && a.current.us_aqi != null) {
    const u = a.current.us_aqi;
    const cat = a.current.us_aqi_category || (u <= 50 ? "优" : u <= 100 ? "良" : u <= 150 ? "轻度污染" : "中度污染");
    out.air = { aqi: String(u), category: cat, pm2p5: a.current.pm2_5 != null ? String(Math.round(a.current.pm2_5)) : null };
  }
  return out;
}
/* ---------------- 主插件 ---------------- */
class WorkbenchPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    // 轮休表旧数据迁移：旧格式 { 周号: 值 } -> { 年份: { 周号: 值 } }
    {
      const _mw0 = this.settings.manualWeeks || {};
      const _k0 = Object.keys(_mw0)[0];
      if (_k0 && !/^\d{4}$/.test(_k0)) {
        this.settings.manualWeeks = { [String(new Date().getFullYear())]: _mw0 };
        await this.saveSettings();
      }
    }
    this.tasksCache = { data: null, stale: true, scanning: false };
    this.birthdayCache = { data: null, stale: true };
    this.weatherCache = { data: null, stale: true };
    this.extraCache = { data: null, stale: true };
    this._restoreWeatherCaches();

    // 独立视图（个人工作台页签）
    this.registerView(VIEW_TYPE_WORKBENCH, (leaf) => new WorkbenchView(leaf, this));

    // 启动时自动打开工作台视图
    if (this.settings.openOnStartup) {
      this.app.workspace.onLayoutReady(() => {
        window.setTimeout(() => this.openWorkbenchView(), 400);
      });
    }

    this.registerMarkdownCodeBlockProcessor("workbench", (src, el, ctx) => {
      const state = { year: 0, month: 0, selected: todayStr(), loading: false };
      const render = () => this.renderDashboard(el, ctx, state);
      render();
      const lifecycle = new Component();
      lifecycle.load();
      ctx.addChild(lifecycle);
      const timer = window.setInterval(() => {
        if (document.contains(el)) render();
      }, 60000);
      lifecycle.register(() => window.clearInterval(timer));
      this.registerEvent(this.app.metadataCache.on("changed", () => {
        this.tasksCache.stale = true;
        this.birthdayCache.stale = true;
        if (document.contains(el)) render();
      }));
    });

    // 编辑日志：只把"修改正文"的保存计入编辑篇数（移动/改属性/启动误报的正文均未变 → 天然不计入）
    // 移动/重命名：Obsidian 会触发 modify 但正文不变，正文 hash 比较即可排除；
    // 需在 rename 时把 hash 基线从旧路径迁移到新路径，否则新路径无基线会被误计为编辑。
    // movedLog 仍写入：用于"插件未运行的历史日期"（mtime 基线阶段）排除移动产生的 mtime 变化。
    this._pendingRename = new Set();
    this._renameTimers = {};
    this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
      if (!f || f.extension !== "md") return;
      this._pendingRename.add(f.path);
      // 正文 hash 基线随路径迁移
      if (this._bodyHashes) {
        if (oldPath && this._bodyHashes.has(oldPath)) {
          this._bodyHashes.set(f.path, this._bodyHashes.get(oldPath));
          this._bodyHashes.delete(oldPath);
        } else if (this._bodyHashes.has(f.path)) {
          this._bodyHashes.delete(f.path);
        }
      }
      const _k = todayStr();
      try {
        this.settings.movedLog = this.settings.movedLog || {};
        const _ml = this.settings.movedLog;
        const arr = _ml[_k] || (_ml[_k] = []);
        if (!arr.includes(f.path)) arr.push(f.path);
        for (const dk of Object.keys(_ml)) if (new Date(dk + "T00:00:00").getTime() < Date.now() - 400 * 86400000) delete _ml[dk];
        this.saveSettings();
      } catch (e) { /* 静默 */ }
      clearTimeout(this._renameTimers[f.path]);
      this._renameTimers[f.path] = setTimeout(() => {
        this._pendingRename.delete(f.path);
        delete this._renameTimers[f.path];
      }, 3000);
    }));
    this.registerEvent(this.app.vault.on("modify", (f) => this.trackEdit(f)));
    this.registerEvent(this.app.vault.on("create", (f) => { this.trackEdit(f); this._impEnqueue(f); }));
    this.registerEvent(this.app.vault.on("delete", (f) => this.untrackEdit(f)));
    this.addCommand({
      id: "open-workbench",
      name: "打开个人工作台",
      callback: () => this.openWorkbenchView()
    });
    this.addCommand({
      id: "update-heatmap-log",
      name: "生成/更新热力图记录",
      callback: () => { this._lastHeatLog = 0; this.updateHeatmapLog(); }
    });
    this.addRibbonIcon("layout-dashboard", "打开个人工作台", () => this.openWorkbenchView());

    this.addSettingTab(new WorkbenchSettingTab(this.app, this));

    // 导入识别：启动时回溯今天批量导入（同目录同小时>=50篇），排除其编辑计数
    this._backfillImport();
    // 元属性判断基线：异步预扫全库正文 hash（仅改 frontmatter 的保存不计入编辑）
    this._initBodyHashes();
    // 热力图记录笔记：启动后生成/追加（只增不改）
    this.app.workspace.onLayoutReady(() => {
      window.setTimeout(() => { this._lastHeatLog = 0; this.updateHeatmapLog(); }, 1500);
    });
  }

  /* 恢复持久化的天气缓存（重启不重复请求）*/
  _restoreWeatherCaches() {
    const s = this.settings;
    if (s._wc && s._wc.data && Date.now() - (s._wc.time || 0) < (s.refreshMinutes || 30) * 60000) {
      this.weatherCache.data = s._wc.data;
      this.weatherCache.time = s._wc.time;
    }
    if (s._ec && s._ec.data && Object.keys(s._ec.data).length && Date.now() - (s._ec.time || 0) < (s.extraRefreshMinutes || 30) * 60000) {
      this.extraCache.data = s._ec.data;
      this.extraCache.time = s._ec.time;
    }
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }

  async openWorkbenchView() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKBENCH);
    if (leaves.length) {
      await workspace.revealLeaf(leaves[0]);
      return;
    }
    const leaf = workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_WORKBENCH, active: true });
    workspace.revealLeaf(leaf);
  }

  /* ---- 数据获取（带缓存） ---- */
  async getTasks(force) {
    const c = this.tasksCache;
    if (c.data && !c.stale && !force) return c.data;
    if (c.scanning) return c.data || [];
    c.scanning = true;
    try { c.data = await scanTasks(this.app, this.settings); }
    catch (e) { console.error("workbench scanTasks", e); }
    c.scanning = false;
    c.stale = false;
    return c.data || [];
  }

  async getWeatherExtra(force) {
    if (!this.extraCache) this.extraCache = { data: null, stale: true };
    const c = this.extraCache;
    const maxAge = (this.settings.extraRefreshMinutes || 30) * 60000;
    if (c.data && !c.stale && Date.now() - (c.time || 0) < maxAge && !force) return c.data;
    try {
      const d = this.settings.qweatherKey && String(this.settings.qweatherKey).trim()
        ? await fetchQWeatherExtra(this.settings)
        : await fetchOpenMeteoExtra(this.settings);
      if (d && Object.keys(d).length) {
        c.data = d;
        c.time = Date.now();
        c.stale = false;
        this.settings._ec = { data: d, time: c.time };
        await this.saveSettings();
      } else {
        c.stale = true;
      }
    } catch (e) {
      console.warn("workbench extra failed", e);
      c.stale = true;
    }
    return c.data || null;
  }
  async getBirthdays(force) {
    const c = this.birthdayCache;
    if (c.data && !c.stale && !force) return c.data;
    try { c.data = await scanBirthdays(this.app, this.settings); }
    catch (e) { console.error("workbench scanBirthdays", e); }
    c.stale = false;
    return c.data || [];
  }

  async getWeather(force) {
    const c = this.weatherCache;
    const maxAge = (this.settings.refreshMinutes || 30) * 60000;
    if (c.data && !c.stale && Date.now() - (c.time || 0) < maxAge && !force) return c.data;
    try {
      c.data = await fetchWeather(this.settings);
      c.time = Date.now();
      c.stale = false;
      this.settings._wc = { data: c.data, time: c.time };
      await this.saveSettings();
    } catch (e) {
      console.warn("workbench weather failed", e);
      c.data = { error: e && e.message ? String(e.message) : "天气获取失败" };
      c.stale = false;
    }
    return c.data;
  }

  /* ---- 横幅统计（参考 apex-dashboard）---- */
  /* 编辑日志：按"当天编辑过的笔记数"计数（同篇多次编辑只算 1 篇，创建也算；附件非 md 排除），防抖保存 */
  /* ---- 导入识别：外部批量导入的笔记不计入编辑计数 ---- */
  _impEnqueue(file) {
    if (!file || file.extension !== "md") return;
    // 启动误报防护：Obsidian 启动/重载会对存量旧文件误触发 create（mtime 为过去时间），
    // 仅 mtime 距今 2 分钟内的"真新建/真复制入库"才纳入批量导入识别。
    const mt = file.stat && file.stat.mtime;
    if (mt && Date.now() - mt > 2 * 60 * 1000) return;
    this._impQueue = this._impQueue || [];
    this._impQueue.push({ p: file.path, d: (file.path.split("/")[0] || "~"), t: Date.now() });
    if (this._impQueue.length > 5000) this._impQueue = this._impQueue.slice(-2000);
    if (this._impTimer) clearTimeout(this._impTimer);
    this._impTimer = setTimeout(() => this._sweepImport(), 15000);
  }
  /* 滑动清点：同目录 10 分钟窗口内 create >= 30 判定为批量导入 */
  _sweepImport() {
    this._impTimer = null;
    const q = this._impQueue || [];
    const cutoff = Date.now() - 10 * 60000;
    const cnt = {};
    for (const e of q) if (e.t >= cutoff) cnt[e.d] = (cnt[e.d] || 0) + 1;
    let marked = false;
    for (const [dir, n] of Object.entries(cnt)) {
      if (n >= 30) for (const e of q) if (e.t >= cutoff && e.d === dir && !e.done) { e.done = true; this._markImport(e.p); marked = true; }
    }
    this._impQueue = q.filter(e => e.t >= cutoff && !e.done);
    if (marked) { this.saveSettings(); this.saveEditLog(); }
  }
  /* 标记导入文件：记入 importLog（供统计排除）并从当天编辑集合回滚 */
  _markImport(p, k) {
    k = k || todayStr();
    this.settings.importLog = this.settings.importLog || {};
    const arr = this.settings.importLog[k] || (this.settings.importLog[k] = []);
    if (!arr.includes(p)) arr.push(p);
    if (this._editFiles && this._editFiles[k]) this._editFiles[k].delete(p);
  }
  /* 启动时异步预扫全库正文 hash 基线：之后仅修改 frontmatter 元属性的保存不计入编辑 */
  async _initBodyHashes() {
    try {
      this._bodyHashes = new Map();
      const files = this.app.vault.getMarkdownFiles();
      const CHUNK = 50;
      for (let i = 0; i < files.length; i += CHUNK) {
        const slice = files.slice(i, i + CHUNK);
        await Promise.all(slice.map(async (f) => {
          try { this._bodyHashes.set(f.path, bodyHash(bodyText(await this.app.vault.cachedRead(f)))); } catch (e) { /* 忽略 */ }
        }));
        await new Promise((r) => setTimeout(r, 0));
      }
    } catch (e) { /* 静默 */ }
  }

  /* 启动回溯：对所有历史日期检测批量导入（含今天，覆盖历史已计入）
     三种判定：①「目录|小时」≥30 篇；②「全库|分钟」≥30 篇（整库同步 mtime 往往同一分钟）；
     ③「同日 10 分钟滑动窗口」≥15 篇（连续几分钟内旧文件被批量改写，如小批量同步/批量脚本） */
  async _backfillImport() {
    try {
      const aggH = {}, byKeyH = {}, aggM = {}, byKeyM = {}, dayArr = {};
      for (const f of this.app.vault.getMarkdownFiles()) {
        const d = new Date(f.stat.mtime);
        const ymd = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        const h = d.getHours(), mi = d.getMinutes();
        const dir = f.path.split("/")[0] || "~";
        const kh = ymd + "|" + dir + "|" + h, km = ymd + "|" + mi;
        aggH[kh] = (aggH[kh] || 0) + 1; (byKeyH[kh] = byKeyH[kh] || []).push({ p: f.path, ymd });
        aggM[km] = (aggM[km] || 0) + 1; (byKeyM[km] = byKeyM[km] || []).push({ p: f.path, ymd });
        (dayArr[ymd] = dayArr[ymd] || []).push({ p: f.path, m: f.stat.mtime, ymd });
      }
      const ymdOf = (key) => key.split("|")[0];
      const all = [];
      for (const [key, n] of Object.entries(aggH)) if (n >= 30) for (const e of byKeyH[key]) all.push(e);
      for (const [key, n] of Object.entries(aggM)) if (n >= 30) for (const e of byKeyM[key]) all.push(e);
      // ③ 同日 10 分钟滑动窗口 ≥15（按 mtime 排序后滑窗，窗口内任一文件被标记）
      const wset = new Map();
      for (const [ymd, arr] of Object.entries(dayArr)) {
        if (arr.length < 15) continue;
        arr.sort((a, b) => a.m - b.m);
        for (let i = 0; i < arr.length; i++) {
          let j = i;
          while (j + 1 < arr.length && arr[j + 1].m - arr[i].m <= 10 * 60000) j++;
          if (j - i + 1 >= 15) for (let k = i; k <= j; k++) wset.set(arr[k].p, ymd);
        }
      }
      for (const [p, ymd] of wset) all.push({ p, ymd });
      const uniq = new Map();
      for (const e of all) uniq.set(e.p, e.ymd);
      let marked = false;
      for (const [p, ymd] of uniq) this._markImport(p, ymd);
      if (uniq.size) {
        const el = this.settings.editLog || {};
        const ymdSet = new Set([...Object.keys(aggH).map(ymdOf), ...Object.keys(aggM).map(ymdOf), ...wset.values()]);
        for (const ymd of ymdSet) {
          if (Array.isArray(el[ymd])) {
            const il = this.settings.importLog[ymd] || [];
            const nv = el[ymd].filter(p => !il.includes(p));
            if (nv.length !== el[ymd].length) el[ymd] = nv;
          }
        }
        marked = true;
      }
      if (marked) { await this.saveSettings(); this.saveEditLog(); }
    } catch (e) { /* 静默 */ }
  }

  trackEdit(file) {
    return this._trackEditAsync(file);
  }

  /* 正文提取：去掉开头 frontmatter YAML 块（---...---），用于"仅元属性修改不计入"判断 */
  async _trackEditAsync(file) {
    try {
      if (!file || file.extension !== "md") return;
      if (this._pendingRename && this._pendingRename.has(file.path)) return;
      // 排除目录（与统计口径一致）：统计/ 下自动生成的记录笔记等不计入编辑
      if ((this.settings.excludeFolders || []).some(z => z && (file.path === z || String(file.path).toLowerCase().startsWith(String(z).toLowerCase() + "/")))) return;
      // 时效校验：Obsidian 启动/重载会对存量旧文件误触发 modify/create（mtime 为过去时间），
      // 真实编辑保存后 mtime ≈ 当前时间。mtime 距今超过 2 分钟的事件一律忽略。
      const mt = file.stat && file.stat.mtime;
      if (mt && Date.now() - mt > 2 * 60 * 1000) return;
      // 唯一编辑判定：正文 hash 未变（移动/仅改属性/启动伪事件均未改正文）→ 不计入
      const bh = this._bodyHashes;
      if (bh && bh.has(file.path)) {
        try {
          const text = await this.app.vault.cachedRead(file);
          const h = bodyHash(bodyText(text));
          if (h === bh.get(file.path)) return;
          bh.set(file.path, h);
        } catch (e) { /* 读取失败按真实编辑计入 */ }
      }
      const k = todayStr();
      if (!this._editFiles) this._editFiles = {};
      if (!this._editFiles[k]) this._editFiles[k] = new Set();
      this._editFiles[k].add(file.path);
      if (this._editLogTimer) clearTimeout(this._editLogTimer);
      this._editLogTimer = setTimeout(() => this.saveEditLog(), 2000);
    } catch (e) { /* 静默：不影响编辑 */ }
  }

  /* 把按文件去重的集合落盘：统一存文件路径列表（历史也保留明细，供热力图记录笔记永久查看） */
  saveEditLog() {
    this._editLogTimer = null;
    if (!this._editFiles) return;
    this.settings.editLog = this.settings.editLog || {};
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    for (const [k, set] of Object.entries(this._editFiles)) {
      if (!set || set.size === 0) continue;
      const ms = new Date(k + "T00:00:00").getTime();
      if (ms >= mStart) this.settings.editLog[k] = [...set]; // 本月：文件路径列表（去重统计用）
      else this.settings.editLog[k] = [...set];              // 历史：也保留路径列表（v1.5.0 起不再压缩成数字）
      if (k < todayStr()) delete this._editFiles[k]; // 非今天集合落盘后释放内存
    }
    if (this.app && this.app.vault && this.app.vault.adapter) this.saveSettings();
  }

  /* 文件删除：若在当天集合中，则从当天计数移除 */
  untrackEdit(file) {
    try {
      if (!file || file.extension !== "md") return;
      const k = todayStr();
      if (this._editFiles && this._editFiles[k] && this._editFiles[k].has(file.path)) {
        this._editFiles[k].delete(file.path);
        if (this._editLogTimer) clearTimeout(this._editLogTimer);
        this._editLogTimer = setTimeout(() => this.saveEditLog(), 2000);
      }
    } catch (e) { /* 静默：不影响编辑 */ }
  }

  /* 清理编辑日志定时器 */
  flushEditLog() {
    if (this._editLogTimer) {
      clearTimeout(this._editLogTimer);
      this._editLogTimer = null;
      this.saveEditLog();
    }
  }

  computeStats() {
    const vault = this.app.vault;
    const ex = (this.settings.excludeFolders || []).map(f => f.trim().toLowerCase()).filter(f => f && f !== "/");
    const isEx = p => {
      if (!ex.length) return false;
      const q = p.toLowerCase();
      return ex.some(z => q === z || q.startsWith(z + "/"));
    };
    const files = vault.getMarkdownFiles().filter(f => !isEx(f.path) && !f.path.startsWith("."));
    /* 附件/文件夹：Hearth Vault 卡片口径（非 md = 附件，非根目录 = 文件夹） */
    let attachmentsCount = 0, foldersCount = 0;
    const allFiles = typeof vault.getAllLoadedFiles === "function" ? vault.getAllLoadedFiles() : null;
    if (allFiles) {
      for (const f0 of allFiles) {
        if (!f0 || !f0.path) continue;
        if (f0.path === ".obsidian" || f0.path.startsWith(".obsidian/")) continue; // 全库口径（同 Hearth），仅排除系统目录
        if (f0.extension === undefined || f0.extension === null || f0.extension === "") {
          if (f0.path !== "/") foldersCount++;
        } else if (String(f0.extension).toLowerCase() !== "md") {
          attachmentsCount++;
        }
      }
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const weekStart = dayStart - 6 * 86400000;
    // 统计策略：先按全部 md 笔记的最后编辑时间(mtime)建立基线，再用编辑日志按天覆盖

    let total = 0, newMonth = 0, newWeek = 0, newQuarter = 0, newYear = 0, orphan = 0;
    const dayHist = new Map();
    const dayFiles = new Map(); // ymd -> [文件路径...]（热力图记录笔记用）
    const _elog = this.settings.editLog || {};
    const _mlog = this.settings.movedLog || {};
    const _ilog = this.settings.importLog || {};
    // 从未编辑（导入/空笔记）：创建时间与最后编辑时间一致（<=3s）的文件不计入编辑统计（Obsidian stat.ctime=创建时间）
    const neverEdited = new Set(files.filter(f => Math.abs((f.stat.mtime || 0) - (f.stat.ctime || 0)) <= 3000).map(f => f.path));
    const propKeys = new Set();
    const activeDates = new Set();
    const tags = new Map();
    const RL = this.app.metadataCache.resolvedLinks || {};
    const hasOut = new Set(), isTarget = new Set();
    let totalLinks = 0;
    for (const [src, targets] of Object.entries(RL)) {
      if (isEx(src)) continue;
      let out = 0;
      for (const [tgt, cnt] of Object.entries(targets)) {
        if (!isEx(tgt)) { isTarget.add(tgt); totalLinks += cnt; out++; }
      }
      if (out > 0) hasOut.add(src);
    }
    let totalTasks = 0, doneTasks = 0;
    for (const file of files) {
      total++;
      const mt = file.stat.mtime;
      {
        const _hymd = ymdOf(mt);
        if (!(_mlog[_hymd] || []).includes(file.path) && !(_ilog[_hymd] || []).includes(file.path) && !neverEdited.has(file.path)) {
          dayHist.set(_hymd, (dayHist.get(_hymd) || 0) + 1);
          if (!dayFiles.has(_hymd)) dayFiles.set(_hymd, []);
          dayFiles.get(_hymd).push(file.path);
          activeDates.add(_hymd);
        }
      }
      if (!hasOut.has(file.path) && !isTarget.has(file.path)) orphan++;
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache && cache.frontmatter) for (const k of Object.keys(cache.frontmatter)) propKeys.add(String(k).trim());
      if (!cache) continue;
      const addTags = list => {
        if (!list) return;
        for (const t of list) {
          const tag = String(t).replace(/^#/, "").trim();
          if (tag) tags.set(tag, (tags.get(tag) || 0) + 1);
        }
      };
      addTags(cache.frontmatter && cache.frontmatter.tags);
      if (cache.tags) for (const t of cache.tags) { const tag = String(t.tag || "").replace(/^#/, "").trim(); if (tag) tags.set(tag, (tags.get(tag) || 0) + 1); }
      if (cache.listItems) for (const li of cache.listItems) {
        if (li.task !== undefined) { totalTasks++; if (li.task === "x" || li.task === "X") doneTasks++; }
      }
    }
    // 编辑日志有记录的日期，以逐次编辑计数覆盖 mtime 基线（值可能是数字=篇数，或数组=文件列表）
    for (const [k, v] of Object.entries(_elog)) {
      if (v == null) continue;
      const n = Array.isArray(v) ? v.length : (typeof v === "number" ? v : 0);
      if (n > 0) { dayHist.set(k, n); activeDates.add(k); }
      // 数组=真编辑明细（v1.5.0 起历史也存数组）；数字=旧版压缩（无明细），保留基线列表作回填
      if (Array.isArray(v) && v.length) dayFiles.set(k, [...v]);
    }
    // 本周/本月编辑数：按"期间内编辑过的不同笔记数"（文件级去重：mtime 最后编辑 + 编辑日志文件列表）
    newMonth = 0; newWeek = 0;
    {
      const _wkF = new Set(), _mF = new Set(), _qF = new Set(), _yF = new Set();
      for (const file of files) {
        const _mt = file.stat.mtime;
        if ((_mlog[ymdOf(_mt)] || []).includes(file.path) || (_ilog[ymdOf(_mt)] || []).includes(file.path) || neverEdited.has(file.path)) continue;
        if (_mt >= yearStart) _yF.add(file.path);
        if (_mt >= quarterStart) _qF.add(file.path);
        if (_mt >= monthStart) _mF.add(file.path);
        if (_mt >= weekStart) _wkF.add(file.path);
      }
      for (const [k, v] of Object.entries(_elog)) {
        if (!Array.isArray(v) || !v.length) continue;
        const _ms = new Date(k + "T00:00:00").getTime();
        const _mv = [...(_mlog[k] || []), ...(_ilog[k] || [])];
        if (_ms >= yearStart) for (const p of v) if (!_mv.includes(p) && !neverEdited.has(p)) _yF.add(p);
        if (_ms >= quarterStart) for (const p of v) if (!_mv.includes(p) && !neverEdited.has(p)) _qF.add(p);
        if (_ms >= monthStart) for (const p of v) if (!_mv.includes(p) && !neverEdited.has(p)) _mF.add(p);
        if (_ms >= weekStart) for (const p of v) if (!_mv.includes(p) && !neverEdited.has(p)) _wkF.add(p);
      }
      newMonth = _mF.size; newWeek = _wkF.size;
      newQuarter = _qF.size; newYear = _yF.size;
    }
    return {
      totalNotes: total,
      noteList: files.filter(f => !(_mlog[ymdOf(f.stat.mtime)] || []).includes(f.path) && !(_ilog[ymdOf(f.stat.mtime)] || []).includes(f.path) && !neverEdited.has(f.path)).map(f => ({ p: f.path, m: f.stat.mtime })),
      dayFiles, // ymd -> [路径]（热力图记录笔记明细）
      dayHist,
      newThisMonth: newMonth,
      newThisWeek: newWeek,
      newThisQuarter: newQuarter,
      newThisYear: newYear,
      tagsCount: tags.size,
      attachmentsCount,
      foldersCount,
      propsCount: propKeys.size,
      totalLinks,
      streak: calcStreak(activeDates),
      activeDays: activeDates.size,
      orphanRate: total ? Math.round(orphan / total * 100) : 0,
      avgLinksPerNote: total ? totalLinks / total : 0,
      connectivity: total ? Math.round((total - orphan) / total * 100) : 0,
      totalTasks, doneTasks, pendingTasks: totalTasks - doneTasks,
      taskCompletion: totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0
    };
  }

  /* 生成/更新「统计/热力图编辑记录.md」：只增不改，已有内容永久保留
     首次（笔记不存在）：全量写入所有有明细的日期（含历史回填），倒序；
     之后：仅把未写入过的日期 block 追加到文件末尾 */
  async updateHeatmapLog() {
    try {
      if (!this.app || !this.app.vault) return;
      const stats = this.computeStats();
      const dayFiles = stats.dayFiles;
      if (!dayFiles || !dayFiles.size) return;
      const vault = this.app.vault;
      // 确保目录存在（vault.create 不会自动建目录）
      const dir = HEATMAP_LOG_PATH.split("/").slice(0, -1).join("/");
      if (dir && !vault.getAbstractFileByPath(dir)) {
        try { await vault.createFolder(dir); } catch (e) { /* 已存在则忽略 */ }
      }
      const exFile = vault.getAbstractFileByPath(HEATMAP_LOG_PATH);
      const exists = !!(exFile && exFile.extension === "md");
      const written = new Set(this.settings.heatmapLogWritten || []);
      const keys = [...dayFiles.keys()].filter(k => (dayFiles.get(k) || []).length > 0);
      let blocks = "", newWritten = [];
      if (!exists) {
        // 全量重建：全部日期（倒序），写入后全部标记已写
        blocks = [...keys].sort().reverse().map(k => heatmapSection(k, dayFiles.get(k))).join("\n\n");
        newWritten = keys;
      } else {
        const pending = heatmapPendingDates(Object.fromEntries(dayFiles), [...written]);
        if (!pending) return;
        blocks = pending.map(k => heatmapSection(k, dayFiles.get(k))).join("\n\n");
        newWritten = pending;
      }
      if (!blocks) return;
      if (!exists) {
        await vault.create(HEATMAP_LOG_PATH, HEATMAP_LOG_HEADER + blocks + "\n");
      } else {
        const cur = await vault.cachedRead(exFile);
        const sep = cur.endsWith("\n") ? "" : "\n";
        await vault.modify(exFile, cur + sep + blocks + "\n");
      }
      for (const k of newWritten) written.add(k);
      this.settings.heatmapLogWritten = [...written];
      await this.saveSettings();
    } catch (e) { console.error("workbench updateHeatmapLog", e); }
  }

  /* ---- 工作台渲染 ---- */
  async renderDashboard(el, ctx, state) {
    if (state.loading) return;
    state.loading = true;
    this._wbEl = el;
    this._wbState = state;
    const now = new Date();
    if (!state.year || !state.month) { state.year = now.getFullYear(); state.month = now.getMonth() + 1; }
    const solarToday = lunarLib.Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const lToday = solarToday.getLunar();

    el.empty();
    const root = el.createDiv({ cls: "wb-dashboard" });

    const [tasks, birthdays, weather, extra] = await Promise.all([
      this.getTasks(),
      this.getBirthdays(),
      this.getWeather(),
      this.getWeatherExtra()
    ]);

    // 任务按日期索引（日历徽标/左栏今日任务只统计未完成任务；当天详情右侧显示全部含已完成）
    const activeTasks = tasks.filter(t => !t.done);
    const tasksByDate = {};
    const allTasksByDate = {};
    for (const t of tasks) {
      (allTasksByDate[t.date] = allTasksByDate[t.date] || []).push(t);
      if (!t.done) (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t);
    }
    const doneCount = tasks.filter(t => t.done).length;

    // 生日：每人只取最近一次（含明年），换算为公历日期；显示用称呼+岁数
    const birthdayEvents = []; // { name, nickname, type, solar:{y,m,d}, label(按笔记原文), age? }
    const ty = now.getFullYear();
    const today = todayStr();
    for (const b of birthdays) {
      const label = b.dateRaw || lunarCnDate(b.month, b.day); // 完全按笔记中的写法
      if (b.type === "lunar") {
        let best = null;
        for (const ly of [ty - 1, ty, ty + 1]) {
          const s = lunarBirthdaySolar(ly, b.month, b.day);
          if (s && fmtDate(s.y, s.m, s.d) >= today && (!best || fmtDate(s.y, s.m, s.d) < fmtDate(best.s.y, best.s.m, best.s.d))) best = { s, ly };
        }
        if (best) birthdayEvents.push({
          name: b.name, nickname: b.nickname || b.name, month: b.month, day: b.day,
          solar: best.s, label, type: "lunar",
          age: b.lunarYear != null ? lunarBirthdayAge(b.lunarYear, best.ly) : null
        });
      } else {
        for (const y of [ty - 1, ty]) {
          const s = { y, m: b.month, d: b.day };
          if (fmtDate(s.y, s.m, s.d) >= today) { birthdayEvents.push({ name: b.name, nickname: b.nickname || b.name, month: b.month, day: b.day, solar: s, label, type: "solar", age: null }); break; }
        }
      }
    }
    const upcoming = birthdayEvents
      .sort((a, b) => fmtDate(a.solar.y, a.solar.m, a.solar.d).localeCompare(fmtDate(b.solar.y, b.solar.m, b.solar.d)))
      .slice(0, 6);

    /* ===== 横幅：统计（移植 apex-dashboard 的 dashboard-banner-stats） ===== */
    if (this.settings.bannerEnabled) {
      const stats = this.computeStats();
      const banner = root.createDiv({ cls: "wb-banner" });
      const bs = banner.createDiv({ cls: "dashboard-banner-stats" });
      const L_ICONS = { totalNotes: "file-text", tagsCount: "hash", totalLinks: "link", newThisMonth: "calendar-plus", newThisWeek: "calendar-check", totalTasks: "list-checks", doneTasks: "check-check", pendingTasks: "circle-dashed" };
      const R_ICONS = { taskCompletion: "list-checks", connectivity: "network", orphanRate: "circle-slash", avgLinksPerNote: "link" };
      const R_LABELS = { taskCompletion: "任务完成率", connectivity: "连通度", orphanRate: "孤立率", avgLinksPerNote: "链接/篇" };
      const _setIcon = (el, name) => { try { setIcon(el, name); } catch (_e) {} };

      /* 左栏：图标 + 大数字 + 底部三行小指标 */
      const left = bs.createDiv({ cls: "dashboard-banner-stat-col dashboard-banner-stat-col--left" });
      const topL = left.createDiv({ cls: "dashboard-banner-stat-top" });
      const heroL = topL.createDiv({ cls: "dashboard-banner-stat-hero" });
      const iconL = heroL.createDiv({ cls: "dashboard-banner-stat-icon" });
      _setIcon(iconL, L_ICONS.totalNotes);
      heroL.createEl("span", { cls: "dashboard-banner-stat-num", text: String(stats.totalNotes) });
      heroL.createDiv({ cls: "dashboard-banner-stat-label dashboard-banner-stat-label--inline", text: "总笔记" });
      const stripL = left.createDiv({ cls: "dashboard-banner-stat-strip" });
      const mkStrip = (icon, num, label) => {
        const it = stripL.createDiv({ cls: "dashboard-banner-stat-strip-item" });
        const ic = it.createDiv({ cls: "dashboard-banner-stat-strip-icon" });
        _setIcon(ic, icon);
        it.createEl("b", { cls: "dashboard-banner-stat-strip-num", text: String(num) });
        it.createSpan({ cls: "dashboard-banner-stat-strip-txt", text: label });
      };
      mkStrip("paperclip", stats.attachmentsCount, "附件");
      mkStrip("folder", stats.foldersCount, "文件夹");
      mkStrip("tag", stats.tagsCount, "标签");
      mkStrip("braces", stats.propsCount, "属性");

      /* 中栏：图标 + 活跃天数 + 副标题 + 热力图（auto-fill 自动换行成 3 行） */
      const mid = bs.createDiv({ cls: "dashboard-banner-stat-col dashboard-banner-stat-col--center" });
      const topM = mid.createDiv({ cls: "dashboard-banner-stat-top" });
      const heroM = topM.createDiv({ cls: "dashboard-banner-stat-hero" });
      const iconM = heroM.createDiv({ cls: "dashboard-banner-stat-icon" });
      _setIcon(iconM, "flame");
      heroM.createEl("span", { cls: "dashboard-banner-stat-num", text: `${stats.activeDays}天` });
      heroM.createDiv({ cls: "dashboard-banner-stat-label dashboard-banner-stat-label--inline", text: "活跃天数" });
            const sub = mid.createDiv({ cls: "dashboard-banner-stat-sub" });
      {
        const _wd = (this._heatCols || DEFAULT_HEAT_COLS) * 3;
        const _wStart = new Date();
        _wStart.setHours(0, 0, 0, 0);
        const _hsK = ymdOf(_wStart.getTime() - (_wd - 1) * 86400000);
        let _heatN = 0;
        const _wMs = _wStart.getTime() - (_wd - 1) * 86400000;
        if (stats.noteList && stats.noteList.length) {
          const _set = new Set();
          for (const f of stats.noteList) if (f.m >= _wMs) _set.add(f.p);
          const _el2 = this.settings.editLog || {};
          for (const [k, v] of Object.entries(_el2)) {
            if (!Array.isArray(v) || !v.length) continue;
            if (new Date(k + "T00:00:00").getTime() >= _wMs) for (const p of v) _set.add(p);
          }
          _heatN = _set.size;
        } else if (stats.dayHist) {
          for (const [k, v] of stats.dayHist.entries()) if (k >= _hsK) _heatN += v;
        }
        [["本周", stats.newThisWeek], ["本月", stats.newThisMonth], ["本季", stats.newThisQuarter], ["本年", stats.newThisYear], ["近" + _wd + "天", _heatN]]
          .forEach(([l, n]) => sub.createSpan({ cls: "dashboard-banner-stat-sub-item", text: `${l}${n}篇` }));
      }
      const chart = mid.createDiv({ cls: "dashboard-banner-stat-chart" });
      const hm = chart.createDiv({ cls: "dashboard-banner-heatmap" });
      this._lastStats = stats;
      this.renderHeatmap(hm, stats.dayHist);
      this.scheduleHeatmapMeasure(el);
      // 热力图记录笔记：节流自动追加（每 5 分钟最多一次；当天新编辑会在下次刷新时补录）
      if (!this._lastHeatLog || Date.now() - this._lastHeatLog > 5 * 60 * 1000) {
        this._lastHeatLog = Date.now();
        this.updateHeatmapLog();
      }

      /* 右栏：4 个进度指标（名称+值+进度条） */
      const right = bs.createDiv({ cls: "dashboard-banner-stat-col dashboard-banner-stat-col--right" });
      const R_ROWS = [
        ["taskCompletion", `${stats.taskCompletion}%`, stats.taskCompletion],
        ["connectivity", `${stats.connectivity}%`, stats.connectivity],
        ["orphanRate", `${stats.orphanRate}%`, stats.orphanRate],
        ["avgLinksPerNote", stats.avgLinksPerNote.toFixed(1), Math.min(100, Math.round(stats.avgLinksPerNote / 3 * 100))]
      ];
      R_ROWS.forEach(([key, val, pct]) => {
        const pr = right.createDiv({ cls: "dashboard-banner-stat-prog" });
        const head = pr.createDiv({ cls: "dashboard-banner-stat-prog-head" });
        const title = head.createDiv({ cls: "dashboard-banner-stat-prog-title" });
        const ic = title.createDiv({ cls: "dashboard-banner-stat-prog-icon" });
        _setIcon(ic, R_ICONS[key]);
        title.createSpan({ text: R_LABELS[key] });
        head.createDiv({ cls: "dashboard-banner-stat-prog-val", text: val });
        const track = pr.createDiv({ cls: "dashboard-banner-stat-prog-track" });
        track.createDiv({ cls: "dashboard-banner-stat-prog-fill" }).style.width = `${pct}%`;
      });
    }

        /* ===== 查询栏 ===== */
    if (this.settings.queryEnabled) {
      this.renderQueryBar(root);
    }

    /* ===== 主网格 ===== */
    const grid = root.createDiv({ cls: "wb-grid" });
    const left = grid.createDiv({ cls: "wb-left" });

    /* 天气 + 当天农历 */
    if (this.settings.weatherEnabled) {
      const card = left.createDiv({ cls: "wb-card" });
      const hd = card.createDiv({ cls: "wb-card-hd" });
      hd.createDiv({ cls: "wb-card-tt", text: `天气 · ${this.settings.city}` });
      const _wxSrc = this.settings.qweatherKey && String(this.settings.qweatherKey).trim() ? "和风天气" : "Open-Meteo";
      hd.createSpan({ cls: "wb-wx-src", text: _wxSrc });
      if (weather && weather.error) {
        card.createDiv({ cls: "wb-wx-empty", text: `天气获取失败：${weather.error}` });
      } else if (weather) {
        const w = WMO[weather.code] || QW_ICONS[weather.code] || [weather.text || "未知", "🌡️"];
        const wx = card.createDiv({ cls: "wb-weather" });
        const icon = wx.createDiv({ cls: "wb-wx-icon", text: w[1] });
        const temp = wx.createDiv({ cls: "wb-wx-temp" });
        temp.textContent = `${weather.temp}°`;
        temp.createSpan({ cls: "wb-wx-unit", text: "C" });
        const meta = wx.createDiv({ cls: "wb-wx-meta" });
        meta.createDiv({ cls: "wb-wx-cond", text: w[0] });
        meta.createDiv({ text: `体感 ${weather.feels}°C · 湿度 ${weather.humidity}%` });
        meta.createDiv({ text: `风 ${weather.wind} km/h` });
        // 6 天预报
        const fc = card.createDiv({ cls: "wb-wx-forecast" });
        const wnames = ["周五", "周六", "周日", "周一", "周二", "周三", "周四"];
        weather.list.slice(0, 6).forEach((item, i) => {
          const f = fc.createDiv({ cls: "wb-wx-f" });
          f.createSpan({ cls: "wb-wx-fday", text: i === 0 ? "今天" : wnames[(now.getDay() - 5 + i + 7) % 7] });
          const c = WMO[item.code] || QW_ICONS[item.code] || ["", ""];
          f.createSpan({ cls: "wb-wx-ic", text: c[1] });
          f.createEl("b", { text: `${item.max}°` });
          f.createSpan({ cls: "wb-wx-flow", text: `${item.min}°` });
        });
        // 扩展天气（和风：空气质量/生活指数/日出日落/分钟降水/预警）
        if (extra && (extra.sunrise || extra.air || (extra.indices && extra.indices.length) || extra.minutelySummary || extra.warning)) {
          if (extra.warning) card.createDiv({ cls: "wb-wx-warn", text: `⚠️ ${extra.warning}` });
          const ex = card.createDiv({ cls: "wb-wx-extra" });
          if (extra.sunrise) ex.createDiv({ cls: "wb-wx-e", text: `🌅 ${extra.sunrise} · 🌇 ${extra.sunset}` });
          if (extra.air && extra.air.aqi != null) ex.createDiv({ cls: "wb-wx-e", text: `空气质量 ${extra.air.category} · AQI ${extra.air.aqi} · PM2.5 ${extra.air.pm2p5}` });
          if (extra.indices && extra.indices.length) {
            const row = ex.createDiv({ cls: "wb-wx-idx" });
            const head = row.createDiv({ cls: "wb-wx-idx-hd" });
            const arrow = head.createSpan({ cls: "wb-wx-idx-arrow", text: "▸" });
            head.createSpan({ cls: "wb-wx-idx-names", text: "指数 " + extra.indices.map(i => i.name).join("·") });
            const detail = row.createDiv({ cls: "wb-wx-idx-detail" });
            extra.indices.forEach(i => detail.createDiv({ cls: "wb-wx-idx-item", text: `${i.icon} ${i.name}：${i.text}` }));
            head.addEventListener("click", () => {
              const open = detail.style.display === "block";
              detail.style.display = open ? "none" : "block";
              arrow.textContent = open ? "▸" : "▾";
            });
          }
          if (extra.minutelySummary) ex.createDiv({ cls: "wb-wx-e", text: `🌧 ${extra.minutelySummary}` });
        }
      } else {
        card.createDiv({ cls: "wb-wx-empty", text: "天气获取失败，请检查网络或设置中的城市/经纬度" });
      }
      // 每日一签（参考 apex-dashboard：按日期确定性取，每天不同；分两行展示）
      const lw = card.createDiv({ cls: "wb-wx-lunar" });
      const lq = lw.createDiv({ cls: "wb-lunar-quote" });
      splitQuote(dailyQuote(now.getFullYear(), now.getMonth() + 1, now.getDate())).forEach(seg => lq.createDiv({ cls: "wb-lunar-verse", text: seg }));
    }

    /* 年度进度 */
    if (this.settings.yearProgressEnabled) {
      const card = left.createDiv({ cls: "wb-card" });
      card.createDiv({ cls: "wb-card-hd" }).createDiv({ cls: "wb-card-tt", text: "年度进度" });
      const pct = Math.round((dayOfYear(now) / daysInYear(now.getFullYear())) * 1000) / 10;
      const p = card.createDiv({ cls: "wb-progress" });
      const pv = p.createDiv({ cls: "wb-progress-pct" });
      pv.textContent = pct + "%";
      pv.createSpan({ cls: "wb-progress-year", text: String(now.getFullYear()) + "年" });
      const bar = p.createDiv({ cls: "wb-progress-bar" });
      const fill = bar.createDiv({ cls: "wb-progress-fill" });
      fill.style.width = Math.min(100, pct) + "%";
      const row = p.createDiv({ cls: "wb-progress-row" });
      row.createSpan({ text: `已过 ${dayOfYear(now)} 天` });
      row.createSpan({ text: `剩余 ${daysInYear(now.getFullYear()) - dayOfYear(now)} 天` });
    }

    /* 今日任务 + 逾期任务 + 后续任务 */
    if (this.settings.todayTasksEnabled) {
      const sortByTime = (a, b) => (parseTaskTime(a.text) ?? 1e9) - (parseTaskTime(b.text) ?? 1e9);
      const card = left.createDiv({ cls: "wb-card" });
      card.createDiv({ cls: "wb-card-hd" }).createDiv({ cls: "wb-card-tt", text: "今日任务" });
      const todayTasks = (tasksByDate[today] || []).filter(t => !t.done).sort(sortByTime);
      const tl = card.createDiv({ cls: "wb-tasklist" });
      if (!todayTasks.length) {
        tl.createDiv({ cls: "wb-empty", text: "今天没有安排任务 ✨" });
      } else {
        todayTasks.slice(0, 5).forEach(t => tl.appendChild(this.renderTaskItem(this, t, now)));
      }
      const overdue = activeTasks.filter(t => t.date < today).sort((a, b) => a.date.localeCompare(b.date));
      if (overdue.length) {
        const sep = card.createDiv({ cls: "wb-divider" });
        const sh = card.createDiv({ cls: "wb-subhead", text: `逾期任务（${overdue.length}）` });
        const tl2 = card.createDiv({ cls: "wb-tasklist wb-tasklist-scroll" });
        overdue.forEach(t => tl2.appendChild(this.renderTaskItem(this, t, now, true)));
        this.attachWheelGuard(tl2);
      }
      const later = activeTasks.filter(t => t.date > today).sort((a, b) => a.date.localeCompare(b.date));
      if (later.length) {
        const sep2 = card.createDiv({ cls: "wb-divider" });
        const sh2 = card.createDiv({ cls: "wb-subhead", text: `后续任务（${later.length}）` });
        const tl3 = card.createDiv({ cls: "wb-tasklist wb-tasklist-scroll" });
        later.forEach(t => tl3.appendChild(this.renderTaskItem(this, t, now)));
        this.attachWheelGuard(tl3);
      }
    }

    /* 生日提醒 */
    if (this.settings.birthdaysEnabled) {
      const card = left.createDiv({ cls: "wb-card" });
      card.createDiv({ cls: "wb-card-hd" }).createDiv({ cls: "wb-card-tt", text: "生日提醒" });
      const bl = card.createDiv({ cls: "wb-bday-list" });
      if (!upcoming.length) {
        bl.createDiv({ cls: "wb-empty", text: "暂无生日安排" });
      } else {
        upcoming.forEach(e => {
          const row = bl.createDiv({ cls: "wb-bday-item" });
          const av = row.createDiv({ cls: "wb-bday-avatar", text: (e.name || e.nickname).charAt(0) });
          row.createSpan({ text: e.nickname || e.name });
          const tag = row.createSpan({ cls: "wb-bday-tag", text: lunarCnDate(e.month, e.day) });
          const s = fmtDate(e.solar.y, e.solar.m, e.solar.d);
          const diff = Math.round((new Date(s + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
          // 剩余天数放在公历日期前面；公历日期带年份
          if (diff === 0) row.createSpan({ cls: "wb-bday-soon", text: "今天" });
          else if (diff > 0 && diff <= 30) row.createSpan({ cls: "wb-bday-soon", text: `还有${diff}天` });
          row.createSpan({ cls: "wb-bday-solar", text: `${e.solar.y}/${e.solar.m}/${e.solar.d}` });
        });
      }
    }

    /* ===== 日历 ===== */
    if (this.settings.calendarEnabled) {
      const calCard = grid.createDiv({ cls: "wb-card wb-calcard" });
      this.renderCalendar(calCard, state, tasksByDate, birthdayEvents, allTasksByDate);
    }

    el.setAttribute("data-wb-rendered", "1");
    state.loading = false;
  }

  /* 热力图：3 行 × 列数（每点 12px、间隔 4px；列数由中栏宽度自适应，默认 24） */
  renderHeatmap(hm, dayHist) {
    const cols = this._heatCols || DEFAULT_HEAT_COLS;
    const days = cols * 3;
    const arr = new Array(days).fill(0);
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const ymdArr = new Array(days);
    for (let d = 0; d < days; d++) {
      const ymd = ymdOf(base.getTime() - (days - 1 - d) * 86400000);
      ymdArr[d] = ymd;
      arr[d] = (dayHist && dayHist.get(ymd)) || 0;
    }
    if (typeof hm.style.setProperty === "function") hm.style.setProperty("--heat-cols", String(cols)); else hm.style["--heat-cols"] = String(cols);
    const _max = Math.max(1, ...arr);
    const _WD = "日一二三四五六";
    let tip = null;
    const _hideTip = () => { if (tip) { tip.detach(); tip = null; } };
    for (let a = 0; a < arr.length; a++) {
      const cell = hm.createDiv({ cls: "dashboard-banner-heatmap-cell" });
      const r = arr[a] / _max;
      cell.addClass("dashboard-banner-heatmap-cell--l" + (arr[a] <= 0 ? 0 : r <= 0.25 ? 1 : r <= 0.5 ? 2 : r <= 0.75 ? 3 : 4));
      if (a === arr.length - 1) cell.addClass("dashboard-banner-heatmap-cell--today");
      const ymd = ymdArr[a];
      const v = arr[a];
      cell.setAttribute("data-ymd", ymd);
      cell.setAttribute("data-n", String(v));
      cell.addEventListener("mousemove", (ev) => {
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "wb-heat-tip";
          (document.body || hm).appendChild(tip);
        }
        const _d = new Date(ymd + "T00:00:00");
        tip.textContent = `${_d.getFullYear()}年${_d.getMonth() + 1}月${_d.getDate()}日 周${_WD[_d.getDay()]} · 编辑 ${v} 篇`;
        const _w = tip.offsetWidth || 150;
        const _h = tip.offsetHeight || 30;
        const _vw = (window.innerWidth || 1280), _vh = (window.innerHeight || 800);
        let _l = ev.clientX + 14, _t = ev.clientY + 16;
        if (_l + _w > _vw) _l = ev.clientX - _w - 14;
        if (_t + _h > _vh) _t = ev.clientY - _h - 14;
        tip.style.left = Math.max(4, _l) + "px";
        tip.style.top = Math.max(4, _t) + "px";
      });
      cell.addEventListener("mouseleave", _hideTip);
    }
  }

  /* 挂载后测量中栏宽度 -> 换算列数 -> 变化时重绘热力图 */
  scheduleHeatmapMeasure(root) {
    const chart = root && root.querySelector(".dashboard-banner-stat-chart");
    if (!chart) return;
    if (!this._heatRO && typeof ResizeObserver !== "undefined") {
      this._heatRO = new ResizeObserver(() => this.measureHeatmap(chart));
      this._heatRO.observe(chart);
    }
    setTimeout(() => this.measureHeatmap(chart), 50);
  }

  measureHeatmap(chart) {
    const w = chart.clientWidth;
    const cols = w > 0 ? Math.max(6, Math.floor((w + 4) / 16)) : DEFAULT_HEAT_COLS;
    if (cols === (this._heatCols || DEFAULT_HEAT_COLS)) return;
    this._heatCols = cols;
    const hm = chart.querySelector(".dashboard-banner-heatmap");
    if (hm) {
      hm.empty();
      this.renderHeatmap(hm, this._lastStats ? this._lastStats.dayHist : null);
    }
  }

  renderTaskItem(plugin, t, now, isOverdue) {
    const row = h("div", "wb-task");
    if (t.done) row.addClass("wb-done");
    if (isOverdue || (t.date < todayStr() && !t.done)) row.addClass("wb-overdue");
    const box = row.createDiv({ cls: "wb-task-box" });
    if (t.done) box.textContent = "✓";
    box.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.toggleTaskComplete(t);
    });
    const txt = row.createDiv({ cls: "wb-task-txt" + (t.due ? " wb-task-txt--due" : ""), text: t.text });
    txt.title = t.file;
    const date = row.createDiv({ cls: "wb-task-date" });
    date.createSpan({ cls: "wb-task-flag", text: t.scheduled ? "⏳" : "📅", title: t.scheduled ? "计划开始" : "截止" });
    date.createSpan({ text: t.date.slice(5) });
    row.addEventListener("click", () => {
      const f = plugin.app.vault.getAbstractFileByPath(t.file);
      if (f) plugin.app.workspace.getLeaf(false).openFile(f);
    });
    return row;
  }

  /* 勾选任务：写回笔记并刷新 */
  async toggleTaskComplete(t) {
    if (!this.app || !t.file) return;
    const f = this.app.vault.getAbstractFileByPath(t.file);
    if (!f || f.extension !== "md") return;
    let content;
    try { content = await this.app.vault.cachedRead(f); } catch (e) { return; }
    const lines = content.split("\n");
    const target = t.raw.trim();
    const idx = lines.findIndex(line => {
      const m = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
      return m && m[2].trim() === target;
    });
    if (idx < 0) return;
    lines[idx] = t.done
      ? lines[idx].replace(/\[(x|X)\]/, "[ ]")
      : lines[idx].replace(/\[( |x|X)\]/, "[x]");
    try {
      await this.app.vault.process(f, () => lines.join("\n"));
    } catch (e) { console.warn("workbench toggle fail", e); return; }
    this.tasksCache.stale = true;
    this.birthdayCache.stale = false;
    await this.renderDashboard(this._wbEl || this.containerEl, null, this._wbState || { year: 0, month: 0, selected: todayStr(), loading: false });
  }

  /* 滚动隔离：子列表可滚动时拦截 wheel 不传给父级 */
  attachWheelGuard(list) {
    list.addEventListener("wheel", (ev) => {
      const canUp = list.scrollTop > 0;
      const canDown = list.scrollTop + list.clientHeight < list.scrollHeight;
      if ((ev.deltaY < 0 && canUp) || (ev.deltaY > 0 && canDown)) ev.stopPropagation();
    }, { passive: true });
  }

  /* 查询栏（参考 hearth） */
  renderQueryBar(root) {
    const bar = root.createDiv({ cls: "wb-querybar" });
    const icon = bar.createDiv({ cls: "wb-qb-icon", text: "⌕" });
    const input = bar.createEl("input", { type: "text", placeholder: "搜索笔记、任务或输入命令…" });
    input.setAttribute("spellcheck", "false");
    const hint = bar.createDiv({ cls: "wb-qb-hint" });
    hint.innerHTML = "↵ 打开 &nbsp;↑↓ 选择 &nbsp;Esc 关闭";
    const dd = bar.createDiv({ cls: "wb-qb-drop" });

    let items = [];
    let sel = -1;

    const close = () => { dd.removeClass("wb-show"); sel = -1; };
    const run = (item) => {
      close();
      if (item.kind === "note") {
        const f = this.app.vault.getAbstractFileByPath(item.path);
        if (f) this.app.workspace.getLeaf(false).openFile(f);
      } else if (item.kind === "command") {
        this.app.commands.executeCommandById(item.id);
      }
    };

    const doSearch = () => {
      const q = input.value.trim().toLowerCase();
      dd.empty();
      if (!q) { close(); return; }
      items = [];
      // 笔记
      const notes = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.toLowerCase().includes(q))
        .slice(0, 6)
        .map(f => ({ kind: "note", label: f.basename, sub: f.path, path: f.path }));
      // 命令
      const cmds = this.app.commands.listCommands()
        .filter(c => (c.name || "").toLowerCase().includes(q))
        .slice(0, 6)
        .map(c => ({ kind: "command", label: c.name, sub: c.id, id: c.id }));
      items = [...notes, ...cmds];
      if (!items.length) {
        dd.createDiv({ cls: "wb-qb-empty", text: "没有匹配结果" });
      } else {
        items.forEach((it, i) => {
          const row = dd.createDiv({ cls: "wb-qb-item" });
          const tag = row.createSpan({ cls: "wb-qb-tag", text: it.kind === "note" ? "笔记" : "命令" });
          row.createSpan({ text: it.label });
          row.createSpan({ cls: "wb-qb-sub", text: it.sub });
          row.addEventListener("mousedown", (ev) => { ev.preventDefault(); run(it); });
          row.addEventListener("mouseenter", () => { sel = i; paint(); });
        });
      }
      sel = -1;
      paint();
      dd.addClass("wb-show");
    };
    const paint = () => {
      Array.from(dd.children).forEach((c, i) => c.toggleClass("wb-sel", i === sel));
    };

    input.addEventListener("input", doSearch);
    input.addEventListener("focus", doSearch);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") { ev.preventDefault(); sel = Math.min(items.length - 1, sel + 1); paint(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
      else if (ev.key === "Enter") { if (sel >= 0 && items[sel]) run(items[sel]); else if (items.length) run(items[0]); }
      else if (ev.key === "Escape") { close(); input.blur(); }
    });
    document.addEventListener("mousedown", (ev) => {
      if (!bar.contains(ev.target)) close();
    });
  }

  /* 日历 + 黄历详情 */
  renderCalendar(card, state, tasksByDate, birthdayEvents, allTasksByDate) {
    // 头部
    const head = card.createDiv({ cls: "wb-cal-head" });
    const t1 = lunarLib.Solar.fromYmd(state.year, state.month, 1).getLunar();
    const title = head.createDiv({ cls: "wb-cal-title" });
    title.textContent = `${state.year}年${state.month}月`;
    title.createSpan({ cls: "wb-cal-subtitle", text: `农历 ${t1.getYearInGanZhi()}年 · ${lunarMonthCn(t1.getMonth())}月` });
    /* 中间：当前时间（时:分），每分钟刷新 */
    const clock = head.createDiv({ cls: "wb-cal-clock" });
    const _pad2 = n => String(n).padStart(2, "0");
    const _tick = () => { const _d = new Date(); clock.textContent = `${_pad2(_d.getHours())}:${_pad2(_d.getMinutes())}`; };
    _tick();
    if (typeof window !== "undefined" && typeof window.setInterval === "function") {
      try { const _tid = setInterval(_tick, 60000); if (typeof this.registerInterval === "function") this.registerInterval(_tid); else if (typeof this.register === "function") this.register(() => clearInterval(_tid)); } catch (_e) {}
    }
    const nav = head.createDiv({ cls: "wb-cal-nav" });
    const mkBtn = (txt, fn) => {
      const b = nav.createEl("button", { text: txt });
      b.addEventListener("click", () => { fn(); this.rerenderCalendar(card, state, tasksByDate, birthdayEvents, allTasksByDate); });
      return b;
    };
    mkBtn("‹", () => { state.month--; if (state.month < 1) { state.month = 12; state.year--; } });
    mkBtn("今天", () => { const n = new Date(); state.year = n.getFullYear(); state.month = n.getMonth() + 1; state.selected = todayStr(); });
    mkBtn("›", () => { state.month++; if (state.month > 12) { state.month = 1; state.year++; } });

    // 图例
    const legend = card.createDiv({ cls: "wb-cal-legend" });
    legend.createSpan({ text: "● 任务", cls: "wb-lg-task" });
    legend.createSpan({ text: "● 生日", cls: "wb-lg-bday" });
    legend.createSpan({ text: "● 节日", cls: "wb-lg-fest" });
    legend.createSpan({ text: "● 节气", cls: "wb-lg-term" });
    legend.createSpan({ text: "● 假期", cls: "wb-lg-holiday" });

    // 网格
    const grid = card.createDiv({ cls: "wb-cal-grid" });
    ["一", "二", "三", "四", "五", "六", "日"].forEach((w, i) => {
      grid.createDiv({ cls: i >= 5 ? "wb-dow wb-weekend" : "wb-dow", text: w });
    });

    const first = new Date(state.year, state.month - 1, 1);
    const startPad = (first.getDay() + 6) % 7;
    const dim = new Date(state.year, state.month, 0).getDate();
    const prevDim = new Date(state.year, state.month - 1, 0).getDate();
    const ty = new Date().getFullYear(), tm = new Date().getMonth() + 1, td = new Date().getDate();

    const cells = [];
    for (let i = 0; i < startPad; i++) {
      const d = prevDim - startPad + 1 + i;
      cells.push({ y: state.month === 1 ? state.year - 1 : state.year, m: state.month === 1 ? 12 : state.month - 1, d, other: true });
    }
    for (let d = 1; d <= dim; d++) cells.push({ y: state.year, m: state.month, d });
    let next = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ y: state.month === 12 ? state.year + 1 : state.year, m: state.month === 12 ? 1 : state.month + 1, d: next++, other: true });
    }

    const birthdayByKey = {};
    for (const e of birthdayEvents) {
      const key = fmtDate(e.solar.y, e.solar.m, e.solar.d);
      (birthdayByKey[key] = birthdayByKey[key] || []).push(e);
    }

    for (const c of cells) {
      const key = fmtDate(c.y, c.m, c.d);
      const cell = grid.createDiv({ cls: "wb-day" });
      if (c.other) cell.addClass("wb-other");
      const isToday = c.y === ty && c.m === tm && c.d === td;
      if (isToday) cell.addClass("wb-today");
      if (state.selected === key) cell.addClass("wb-sel");
      const dow = new Date(c.y, c.m - 1, c.d).getDay();

      const solar = lunarLib.Solar.fromYmd(c.y, c.m, c.d);
      const lunar = solar.getLunar();
      const jq = lunar.getJieQi();
      const lfest = lunar.getFestivals() || [];
      const sfest = solar.getFestivals() || [];
      const oFest = lunar.getOtherFestivals() || [];
      const hol = (HOLIDAYS[String(c.y)] || {})[key];
      if (hol !== undefined && hol !== null) cell.addClass("wb-holiday");
      else if (hol === null) cell.addClass("wb-workday");
      else if (dow === 0 || dow === 6) {
        if (weekendRest(this.settings, c.y, c.m, c.d, dow)) cell.addClass("wb-weekend");
        else cell.addClass("wb-workday");
      }

      const num = cell.createDiv({ cls: "wb-day-num", text: String(c.d) });
      const festParts = [];
      if (hol || lfest.length || sfest.length) festParts.push({ t: hol || lfest[0] || sfest[0], k: "wb-fest" });
      if (jq) festParts.push({ t: jq, k: "wb-jq" });
      if (festParts.length) {
        festParts.forEach(p => cell.createDiv({ cls: "wb-day-fest " + p.k, text: p.t }));
      } else {
        cell.createDiv({ cls: "wb-day-lunar", text: lunar.getDayInChinese() });
      }
      const badges = cell.createDiv({ cls: "wb-day-badges" });
      if (hol !== undefined && hol !== null) badges.createSpan({ cls: "wb-badge wb-bg-holiday", title: hol });
      if (jq) badges.createSpan({ cls: "wb-badge wb-bg-term", title: "节气" });
      if (lfest.length || sfest.length) badges.createSpan({ cls: "wb-badge wb-bg-fest", title: "节日" });
      const tasks = tasksByDate[key];
      if (tasks && tasks.length) {
        badges.createSpan({ cls: "wb-badge wb-bg-task", title: `${tasks.length} 个任务` });
        const cnt = cell.createDiv({ cls: "wb-day-tcnt", text: String(tasks.length) });
        const hasOverdue = tasks.some(t => t.date < todayStr());
        if (hasOverdue) cnt.addClass("wb-overdue");
      }
      const bd = birthdayByKey[key];
      if (bd && bd.length) {
        cell.createDiv({ cls: "wb-day-bd", text: "🎂 " + bd.map(e => (e.nickname || e.name) + (e.age != null ? e.age + "岁" : "")).join(",") });
      }

      cell.addEventListener("click", () => {
        state.selected = key;
        this.renderDayDetail(card, state, tasksByDate, birthdayByKey, key, allTasksByDate);
        card.querySelectorAll(".wb-day").forEach(el2 => el2.toggleClass("wb-sel", el2 === cell));
      });
    }

    this.renderDayDetail(card, state, tasksByDate, birthdayByKey, state.selected, allTasksByDate);
  }

  rerenderCalendar(card, state, tasksByDate, birthdayEvents, allTasksByDate) {
    card.empty();
    this.renderCalendar(card, state, tasksByDate, birthdayEvents, allTasksByDate);
  }

  renderDayDetail(card, state, tasksByDate, birthdayByKey, key, allTasksByDate) {
    const old = card.querySelector(".wb-daydetail");
    if (old) old.remove();
    const [y, m, d] = key.split("-").map(Number);
    const detail = card.createDiv({ cls: "wb-daydetail" });
    const left = detail.createDiv({ cls: "wb-dd-left" });
    const solar = lunarLib.Solar.fromYmd(y, m, d);
    const lunar = solar.getLunar();
    const now = new Date();

    const d1 = left.createDiv({ cls: "wb-dd-date" });
    const wk = new Date(y, m - 1, d).getDay();
    d1.textContent = `${m}月${d}日 · 星期${WEEK_CN[wk]}`;
    if (key === todayStr()) d1.addClass("wb-dd-today");
    left.createDiv({ cls: "wb-dd-lunar", text: `农历 ${lunar.getYearInGanZhi()}年 ${lunarMonthCn(lunar.getMonth())}月${lunar.getDayInChinese()}` });
    left.createDiv({ cls: "wb-dd-ganzhi", text: `${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日 · ${lunar.getShengxiao()}` });
    const jq = lunar.getJieQi();
    if (jq) left.createDiv({ cls: "wb-dd-jieqi", text: `⚡ ${jq}` });
    const festAll = [...(lunar.getFestivals() || []), ...(solar.getFestivals() || []), ...(lunar.getOtherFestivals() || [])];
    if (festAll.length) left.createDiv({ cls: "wb-dd-fest", text: "🎉 " + festAll.slice(0, 3).join(" · ") });
    const bd = birthdayByKey[key];
    if (bd && bd.length) left.createDiv({ cls: "wb-dd-bd", text: "🎂 " + bd.map(e => (e.nickname || e.name) + (e.age != null ? " " + e.age + "岁" : "") + "（" + e.label + "）").join("，") });

    const yi = lunar.getDayYi() || [];
    const ji = lunar.getDayJi() || [];
    const yiji = left.createDiv({ cls: "wb-dd-yiji" });
    yiji.createDiv({ cls: "wb-yi", text: "宜：" + (yi.slice(0, 8).join(" ") || "—") });
    yiji.createDiv({ cls: "wb-ji", text: "忌：" + (ji.slice(0, 8).join(" ") || "—") });

    const right = detail.createDiv({ cls: "wb-dd-right" });
    const tasks = [...(allTasksByDate[key] || [])].sort((a, b) => {
      const ta = parseTaskTime(a.text);
      const tb = parseTaskTime(b.text);
      return (ta == null ? 1e9 : ta) - (tb == null ? 1e9 : tb);
    });
    const overdueN = tasks.filter(t => !t.done && t.date < todayStr()).length;
    right.createDiv({ cls: "wb-dd-tt", text: tasks.length ? `当天任务（${overdueN} 项逾期）` : "当天没有任务安排" });
    if (tasks.length) {
      const tl = right.createDiv({ cls: "wb-tasklist" });
      tasks.forEach(t => {
        const row = this.renderTaskItem(this, t, now);
        const src = row.createDiv({ cls: "wb-task-src", text: t.file });
        tl.appendChild(row);
      });
    } else {
      right.createDiv({ cls: "wb-empty", text: "✨ 清闲的一天" });
    }
  }
}

/* ---------------- 独立视图：个人工作台页签 ---------------- */
class WorkbenchView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.state = { year: 0, month: 0, selected: todayStr(), loading: false };
  }
  getViewType() { return VIEW_TYPE_WORKBENCH; }
  getDisplayText() { return "个人工作台"; }
  getIcon() { return "layout-dashboard"; }

  async onOpen() {
    this.contentEl.addClass("wb-view-container");
    await this.render();
    this.register(window.setInterval(() => { if (this.contentEl) this.render(); }, 60000));
    this.registerEvent(this.app.metadataCache.on("changed", () => {
      this.plugin.tasksCache.stale = true;
      this.plugin.birthdayCache.stale = true;
      if (this.contentEl) this.render();
    }));
  }

  async onClose() {
    this.flushEditLog();
    if (this._heatRO) { this._heatRO.disconnect(); this._heatRO = null; }}

  async render() {
    if (this.state.loading || !this.contentEl) return;
    await this.plugin.renderDashboard(this.contentEl, null, this.state);
  }
}

/* ---------------- 设置页 ---------------- */
class WorkbenchSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "个人工作台" });

    new Setting(containerEl).setName("城市").setDesc("天气卡片显示的城市名（仅展示用）")
      .addText(t => t.setValue(this.plugin.settings.city).onChange(async v => { this.plugin.settings.city = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("和风天气 API Host").setDesc("以控制台（创建 API Key 时）显示的 Host 为准，默认 api.qweather.com；旧平台 key 可用 devapi.qweather.com")
      .addText(t => t.setPlaceholder("api.qweather.com").setValue(this.plugin.settings.qweatherHost).onChange(async v => {
        const h = v.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
        if (h) { this.plugin.settings.qweatherHost = h; this.plugin.weatherCache.stale = true; await this.plugin.saveSettings(); }
      }));

    new Setting(containerEl).setName("和风天气 API Key").setDesc("填写后使用和风（更精准，实况 15 分钟更新）；留空则回退 Open-Meteo。登录 dev.qweather.com 获取，免费版每日 1000 次")
      .addText(t => t.setPlaceholder("QWeather API Key").setValue(this.plugin.settings.qweatherKey).onChange(async v => {
        this.plugin.settings.qweatherKey = v.trim();
        this.plugin.weatherCache.stale = true;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl).setName("纬度 / 经度").setDesc("天气数据使用（Open-Meteo，免费无需 key）。常州默认 31.77 / 119.97")
      .addText(t => t.setPlaceholder("纬度").setValue(String(this.plugin.settings.latitude)).onChange(async v => {
        const n = parseFloat(v); if (!isNaN(n)) { this.plugin.settings.latitude = n; this.plugin.weatherCache.stale = true; await this.plugin.saveSettings(); }
      }))
      .addText(t => t.setPlaceholder("经度").setValue(String(this.plugin.settings.longitude)).onChange(async v => {
        const n = parseFloat(v); if (!isNaN(n)) { this.plugin.settings.longitude = n; this.plugin.weatherCache.stale = true; await this.plugin.saveSettings(); }
      }));

    new Setting(containerEl).setName("生日文件").setDesc("存放「姓名，农历月日」的笔记路径（相对库根目录）")
      .addText(t => t.setValue(this.plugin.settings.birthdayFile).onChange(async v => { this.plugin.settings.birthdayFile = v; this.plugin.birthdayCache.stale = true; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("任务排除文件夹").setDesc("扫描任务时排除的文件夹，逗号分隔")
      .addText(t => t.setValue(this.plugin.settings.excludeFolders.join(",")).onChange(async v => {
        this.plugin.settings.excludeFolders = v.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        this.plugin.tasksCache.stale = true;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl).setName("数据刷新间隔（分钟）").setDesc("主天气（实时+7天预报）的刷新间隔，默认 10 分钟")
      .addSlider(s => s.setLimits(5, 180, 5).setValue(this.plugin.settings.refreshMinutes).setDynamicTooltip().onChange(async v => { this.plugin.settings.refreshMinutes = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("扩展天气刷新间隔（分钟）").setDesc("空气质量/指数/日出日落等数据的刷新间隔，默认 30 分钟；主 10 分钟 + 扩展 30 分钟，和风模式约 528 次/天（免费版 1000 次）")
      .addSlider(s => s.setLimits(10, 360, 10).setValue(this.plugin.settings.extraRefreshMinutes).setDynamicTooltip().onChange(async v => { this.plugin.settings.extraRefreshMinutes = v; this.plugin.extraCache.stale = true; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("启动时自动打开工作台").setDesc("打开 Obsidian 时自动打开「个人工作台」视图页签")
      .addToggle(t => t.setValue(this.plugin.settings.openOnStartup).onChange(async v => { this.plugin.settings.openOnStartup = v; await this.plugin.saveSettings(); }));

    containerEl.createEl("h3", { text: "轮休设置" });
    new Setting(containerEl).setName("周末休息模式").setDesc("单双轮休：单休周只休一天，按奇偶周交替；手动：逐个周末指定")
      .addDropdown(dd => dd.addOption("double", "每周双休").addOption("single-double", "单双轮休").addOption("manual", "手动逐周")
        .setValue(this.plugin.settings.restMode)
        .onChange(async v => { this.plugin.settings.restMode = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("单休周休息日").setDesc("单休周休哪一天（另一天上班）")
      .addDropdown(dd => dd.addOption("sat", "休周六").addOption("sun", "休周日")
        .setValue(this.plugin.settings.singleDay)
        .onChange(async v => { this.plugin.settings.singleDay = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("当前周状态").setDesc("本周是单休还是双休，轮休按此顺序往下交替")
      .addDropdown(dd => dd.addOption("single", "本周单休").addOption("double", "本周双休")
        .setValue(this.plugin.settings.sdStart)
        .onChange(async v => { this.plugin.settings.sdStart = v; await this.plugin.saveSettings(); }));
    // 手动轮休表：折叠 + 年份切换 + 全年周列表
    const _det = containerEl.createEl("details", { cls: "wb-rest-details" });
    _det.createEl("summary", { text: "手动轮休表（全年逐周，点击展开）", cls: "wb-rest-summary" });
    const _curYear = new Date().getFullYear();
    let _selYear = _curYear;
    const _mw = this.plugin.settings.manualWeeks || (this.plugin.settings.manualWeeks = {});
    const _renderWeeks = () => {
      _det.querySelectorAll(".wb-rest-week").forEach(e => e.remove());
      const mwYear = _mw[String(_selYear)] || (_mw[String(_selYear)] = {});
      const wends = yearWeekends(_selYear);
      Object.keys(wends).sort((a, b) => +a - +b).forEach(wk => {
        const [sat, sun] = wends[wk];
        const _label = (sat.getMonth() + 1) + "/" + sat.getDate() + " - " + (sun.getMonth() + 1) + "/" + sun.getDate() + "（第" + wk + "周）";
        new Setting(_det).setName(_label).setClass("wb-rest-week")
          .addDropdown(dd => dd.addOption("double", "双休").addOption("sat", "只休周六").addOption("sun", "只休周日")
            .setValue(mwYear[String(wk)] || "double")
            .onChange(async v => { mwYear[String(wk)] = v; await this.plugin.saveSettings(); }));
      });
    };
    new Setting(_det).setName("年份").setDesc("切换年份查看/配置该年轮休表（每年独立保存）")
      .addDropdown(dd => {
        for (let y = _curYear - 1; y <= _curYear + 2; y++) dd.addOption(String(y), String(y) + "年");
        return dd.setValue(String(_selYear)).onChange(async v => { _selYear = +v; _renderWeeks(); });
      })
      .addButton(b => b.setButtonText("复制上一年").onClick(async () => {
        const src = _mw[String(_selYear - 1)] || {};
        _mw[String(_selYear)] = JSON.parse(JSON.stringify(src));
        await this.plugin.saveSettings(); _renderWeeks();
      }))
      .addButton(b => b.setButtonText("清空全年").onClick(async () => {
        _mw[String(_selYear)] = {};
        await this.plugin.saveSettings(); _renderWeeks();
      }));
    _renderWeeks();

    containerEl.createEl("h3", { text: "模块开关" });
    ["bannerEnabled", "queryEnabled", "weatherEnabled", "yearProgressEnabled", "todayTasksEnabled", "birthdaysEnabled", "calendarEnabled"].forEach(k => {
      const label = { bannerEnabled: "统计横幅", queryEnabled: "查询栏", weatherEnabled: "天气+当天农历", yearProgressEnabled: "年度进度", todayTasksEnabled: "今日任务", birthdaysEnabled: "生日提醒", calendarEnabled: "农历万年历" }[k];
      new Setting(containerEl).setName(label)
        .addToggle(t => t.setValue(this.plugin.settings[k]).onChange(async v => { this.plugin.settings[k] = v; await this.plugin.saveSettings(); }));
    });
  }
}

/* 测试钩子（仅用于构建期自测） */
if (typeof globalThis !== "undefined") {
  globalThis.__wb_test = { parseBirthdayDate, parseCnDay, lunarHasDay, lunarBirthdaySolar, lunarBirthdayAge, lunarMonthCn, fmtDate, dayOfYear, daysInYear, dailyQuote, splitQuote, bodyText, bodyHash, parseTaskTime, isoWeek, weekendRest, yearWeekends, heatmapSection, heatmapPendingDates, HEATMAP_LOG_PATH, lunarLib, fetchWeather, fetchQWeather, fetchQWeatherExtra, fetchOpenMeteoExtra, QW_ICONS };
}

module.exports = WorkbenchPlugin;
