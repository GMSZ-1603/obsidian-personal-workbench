// 用真实笔记验证 parseDataFile
const path = require("path");
const Module = require("module");
const base = "C:\\Users\\admin\\Doubao\\chats\\2026-09-03\\new-chat-1\\workbench-plugin";
const stub = path.join(base, "obsidian-stub.js");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "obsidian") return stub;
  return origResolve.call(this, request, ...args);
};
require(path.join(base, "dist", "main.js"));
const loaded = require(path.join(base, "dist", "main.js"));
const T = globalThis.__wb_test;
const fs = require("fs");
const content = fs.readFileSync("D:\\Obsidian\\Second Brain\\生活\\个人工作台数据.md", "utf8");
console.log("--- content head ---");
console.log(content.slice(0, 300));
const df = T.parseDataFile(content);
console.log("--- birthdays ---");
console.log("count:", df.birthdays.length);
df.birthdays.forEach(b => console.log(b.name, "|", b.nickname, "|", b.type, b.month, b.day, "lunarYear:", b.lunarYear || "-"));
console.log("--- weekRest keys ---");
const yr = df.weekRest["2026"] || {};
const wks = Object.keys(yr);
console.log("weeks:", wks.length, "first:", wks[0], "last:", wks[wks.length - 1]);
console.log("wk41:", yr["41"], "wk42:", yr["42"], "wk1:", yr["1"]);
console.log("--- lifeMap ---");
let n = 0;
for (const [k, v] of df.lifeMap) { console.log(k, "->", v.map(a => a.name).join(",")); if (++n > 12) break; }
