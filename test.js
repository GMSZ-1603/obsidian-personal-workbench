/* 自测：验证农历换算与解析逻辑 */
const path = require("path");
const Module = require("module");

// 拦截 require('obsidian')，用空桩避免加载真实 obsidian
const stub = path.join(__dirname, "obsidian-stub.js");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "obsidian") return stub;
  return origResolve.call(this, request, ...args);
};

require(path.join(__dirname, "dist", "main.js"));
const T = globalThis.__wb_test;
let pass = 0, fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, "got", g, "want", w); }
}

console.log("== 农历日期 ==");
const s = T.lunarLib.Solar.fromYmd(2026, 9, 3).getLunar();
eq("2026-09-03 农历月", s.getMonth(), 7);
eq("2026-09-03 农历日", s.getDayInChinese(), "廿二");
eq("2026-09-03 干支年", s.getYearInGanZhi(), "丙午");
eq("2026-09-03 生肖", s.getShengxiao(), "马");
eq("2026-09-03 节日含财神节", (s.getOtherFestivals() || []).join(",").includes("财神节"), true);

const bai = T.lunarLib.Solar.fromYmd(2026, 9, 7).getLunar();
eq("2026-09-07 节气", bai.getJieQi(), "白露");
const qf = T.lunarLib.Solar.fromYmd(2026, 9, 23).getLunar();
eq("2026-09-23 节气", qf.getJieQi(), "秋分");
const mid = T.lunarLib.Solar.fromYmd(2026, 9, 25).getLunar();
eq("2026-09-25 农历节日含中秋", (mid.getFestivals() || []).join(",").includes("中秋节"), true);

console.log("== 生日解析 ==");
eq("八月十二", T.parseBirthdayDate("八月十二"), { type: "lunar", month: 8, day: 12 });
eq("一九六四年八月十二", T.parseBirthdayDate("一九六四年八月十二"), { type: "lunar", month: 8, day: 12, lunarYear: 1964 });
eq("1964年八月十二", T.parseBirthdayDate("1964年八月十二"), { type: "lunar", month: 8, day: 12, lunarYear: 1964 });
eq("带前缀yi'jiu冬月廿二", T.parseBirthdayDate("yi'jiu冬月廿二"), { type: "lunar", month: 11, day: 22 });
eq("九月十六", T.parseBirthdayDate("九月十六"), { type: "lunar", month: 9, day: 16 });
eq("冬月十一", T.parseBirthdayDate("冬月十一"), { type: "lunar", month: 11, day: 11 });
eq("冬月三十", T.parseBirthdayDate("冬月三十"), { type: "lunar", month: 11, day: 30 });
eq("十二月廿二", T.parseBirthdayDate("十二月廿二"), { type: "lunar", month: 12, day: 22 });
eq("公历9月16日", T.parseBirthdayDate("9月16日"), { type: "solar", month: 9, day: 16 });
eq("农历岁数(1964->2026)", T.lunarBirthdayAge(1964, 2026), 62);
{
  const q = "愿你三冬暖，愿你春不寒，愿你天黑有灯，下雨有伞。";
  const sp = T.splitQuote(q);
  eq("splitQuote 两行", sp.length, 2);
  eq("splitQuote 拼回原文", sp.join(""), q);
  eq("splitQuote 行数相近", Math.abs(sp[0].length - sp[1].length) <= 3, true);
}

console.log("== 元属性判断（正文 hash）==");
eq("bodyText 无frontmatter原样", T.bodyText("hello\nworld"), "hello\nworld");
eq("bodyText 去掉frontmatter", T.bodyText("---\ntags: a\ndate: 2026\n---\n正文内容"), "正文内容");
eq("bodyText 正文含---不误切", T.bodyText("---\ntags: a\n---\n正文\n---\n尾部"), "正文\n---\n尾部");
eq("仅frontmatter变化hash不变", T.bodyHash(T.bodyText("---\ntags: a\n---\n正文")) === T.bodyHash(T.bodyText("---\ntags: b\n---\n正文")), true);
eq("正文变化hash变", T.bodyHash(T.bodyText("---\ntags: a\n---\n正文A")) !== T.bodyHash(T.bodyText("---\ntags: a\n---\n正文B")), true);

console.log("== 农历生日 -> 今年公历 ==");
eq("卢小南 八月十二 -> 2026-09-22", T.lunarBirthdaySolar(2026, 8, 12), { y: 2026, m: 9, d: 22 });
eq("庄可凤 九月十六 -> 2026-10-25", T.lunarBirthdaySolar(2026, 9, 16), { y: 2026, m: 10, d: 25 });
eq("外婆 冬月十一 -> 2026-12-19", T.lunarBirthdaySolar(2026, 11, 11), { y: 2026, m: 12, d: 19 });
const d30 = T.lunarBirthdaySolar(2026, 11, 30);
console.log("  冬月三十 2026 是否存在:", d30 !== null ? JSON.stringify(d30) : "(该年冬月无三十)");

console.log("== 年度进度 ==");
const d = new Date(2026, 8, 3);
eq("2026-09-03 dayOfYear", T.dayOfYear(d), 246);
eq("2026 daysInYear", T.daysInYear(2026), 365);

console.log("== 热力图记录笔记 ==");
{
  const sec = T.heatmapSection("2026-09-09", ["工作/安靠.md", "安排/文档.md"]);
  eq("section 标题", sec.split("\n")[0], "## 2026-09-09 · 编辑 2 篇");
  eq("section 链接行数", sec.split("\n").length, 3);
  eq("section 首链接", sec.split("\n")[1], "- [[工作/安靠.md]]");
  const sec0 = T.heatmapSection("2026-09-08", []);
  eq("section 空列表", sec0, "## 2026-09-08 · 编辑 0 篇");
}
{
  const df = { "2026-09-09": ["a"], "2026-09-07": ["b"], "2026-09-10": [] };
  eq("pending 无已写", T.heatmapPendingDates(df, []), ["2026-09-07", "2026-09-09"]);
  eq("pending 过滤已写", T.heatmapPendingDates(df, ["2026-09-09"]), ["2026-09-07"]);
  eq("pending 全已写", T.heatmapPendingDates(df, ["2026-09-07", "2026-09-09"]), null);
  eq("笔记路径", T.HEATMAP_LOG_PATH, "统计/热力图编辑记录.md");
}

console.log("== 活动解析(设置版) ==");
{
  const d = T.expandActivityDates;
  eq("新格式单日", JSON.stringify(d("20261001")), JSON.stringify(["2026-10-01"]));
  eq("新格式范围-", JSON.stringify(d("20261002-20261005")), JSON.stringify(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]));
  eq("旧格式单日", JSON.stringify(d("2026-10-01")), JSON.stringify(["2026-10-01"]));
  eq("旧格式范围~", JSON.stringify(d("2026-10-02~2026-10-05")), JSON.stringify(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]));
  eq("旧格式范围至", JSON.stringify(d("2026-10-02至2026-10-04")), JSON.stringify(["2026-10-02", "2026-10-03", "2026-10-04"]));
  eq("新格式跨年", JSON.stringify(d("20261230-20270102")), JSON.stringify(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]));
  eq("旧格式跨年", JSON.stringify(d("2026-12-30~2027-01-02")), JSON.stringify(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]));
  eq("非法返回空", JSON.stringify(d("abc")), "[]");
  eq("空输入返回空", JSON.stringify(d("")), "[]");
  const acts = [
    { date: "20261001", name: "回家", color: "#34d399" },
    { date: "20261002-20261003", name: "旅行", color: "#22d3ee" }
  ];
  const m = T.buildActivityMap(acts);
  eq("map 新格式单日", JSON.stringify((m.get("2026-10-01") || []).map(a => a.name)), JSON.stringify(["回家"]));
  eq("map 新格式范围", JSON.stringify((m.get("2026-10-03") || []).map(a => a.name)), JSON.stringify(["旅行"]));
  eq("map 颜色保留", (m.get("2026-10-01") || [])[0].color, "#34d399");
  eq("map 空名跳过", T.buildActivityMap([{ date: "20261001", name: "  " }]).size, 0);
  eq("map 非法色默认", (T.buildActivityMap([{ date: "20261001", name: "x", color: "red" }]).get("2026-10-01") || [])[0].color, T.ACTIVITY_DEFAULT_COLOR);
}

console.log("== 数据解析(笔记版) ==");
{
  const d = T.expandLifeDates;
  eq("生活缩位范围", JSON.stringify(d("20261002-07", 2026)), JSON.stringify(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]));
  eq("生活多段级联", JSON.stringify(d("20261007、14、21、28", 2026)), JSON.stringify(["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]));
  eq("生活单日", JSON.stringify(d("20261001", 2026)), JSON.stringify(["2026-10-01"]));
  eq("生活跨年范围", JSON.stringify(d("20261230-20270102", 2026)), JSON.stringify(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]));
  eq("生活空输入", JSON.stringify(d("", 2026)), "[]");
  const sample = "## 生日日期\n卢小南，爸爸，一九六四年八月十二\n张玉轩，轩轩，\n\n## 单双休安排\n### 2026年\n\n| 周期  |    日期     |  休息日  |\n| :-: | :-------: | :---: |\n| 41  | 1010-1011 |  周日   |\n| 42  | 1017-1018 | 周六、周日 |\n\n## 生活安排\n### 2026年\n\n| 日期                | 生活   |\n| ----------------- | ---- |\n| 20261002-07       | 回盱眙  |\n| 20261007、14、21、28 | 老爸休息 |";
  const df = T.parseDataFile(sample);
  eq("生日农历年解析", df.birthdays[0].type + ":" + df.birthdays[0].month + ":" + df.birthdays[0].day + ":" + df.birthdays[0].lunarYear + ":" + df.birthdays[0].nickname, "lunar:8:12:1964:爸爸");
  eq("生日无日期跳过", df.birthdays.length, 1);
  eq("单双休 41 单休", df.weekRest["2026"]["41"], "sun");
  eq("单双休 42 双休", df.weekRest["2026"]["42"], "double");
  const lm = df.lifeMap;
  eq("生活范围首日", JSON.stringify((lm.get("2026-10-02") || []).map(a => a.name)), JSON.stringify(["回盱眙"]));
  eq("生活范围末日+多段首日", JSON.stringify((lm.get("2026-10-07") || []).map(a => a.name)), JSON.stringify(["回盱眙", "老爸休息"]));
  eq("生活多段集", JSON.stringify((lm.get("2026-10-21") || []).map(a => a.name)), JSON.stringify(["老爸休息"]));
  const rt = T.restFromTable;
  eq("休息表 41周六单休上班", rt(df.weekRest, 2026, 10, 10, 6), false);
  eq("休息表 41周日单休休息", rt(df.weekRest, 2026, 10, 11, 0), true);
  eq("休息表 42周六双休休息", rt(df.weekRest, 2026, 10, 17, 6), true);
  eq("休息表 单休周六上班", rt({ "2026": { "41": "sun" } }, 2026, 10, 10, 6), false);
  eq("休息表 双休周周日", rt({ "2026": { "42": "double" } }, 2026, 10, 18, 0), true);
  eq("休息表 缺省双休", rt(null, 2026, 10, 17, 6), true);
}

console.log(`\n通过 ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
