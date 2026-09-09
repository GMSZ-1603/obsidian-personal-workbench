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

console.log(`\n通过 ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
