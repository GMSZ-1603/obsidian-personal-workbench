/* 补丁：①和风 API Host 可配置+错误提示 ②搜索框白色 ③横幅增高25% */
const fs = require("fs");
const path = require("path");
const DIR = __dirname;
function read(f) { return fs.readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n"); }
function write(f, s) { fs.writeFileSync(path.join(DIR, f), s, "utf8"); }

/* ---------- main.js ---------- */
{
  const f = "src/main.js";
  let s = read(f);

  /* 1. 默认设置 qweatherHost */
  if (!s.includes('qweatherHost: "api.qweather.com"')) {
    s = s.replace('  qweatherKey: "",', '  qweatherKey: "",\n  qweatherHost: "api.qweather.com",');
    console.log("default host added");
  }

  /* 2. fetchQWeather 用 host + 错误详情 */
  s = s.replace('  const base = "https://devapi.qweather.com/v7/weather/";', '  const base = `https://${settings.qweatherHost || "api.qweather.com"}/v7/weather/`;');
  s = s.replace('  if (!nowR.json || !nowR.json.now) throw new Error("qweather now failed: " + (nowR.json && nowR.json.code));', [
    "  if (!nowR.json || !nowR.json.now) {",
    "    const er = nowR.json && nowR.json.error;",
    '    throw new Error("\u548c\u98ce " + (er ? (er.title || er.status) : "\u8bf7\u6c42\u5931\u8d25 HTTP " + nowR.status) + (er && er.detail ? ": " + er.detail : ""));',
    "  }"
  ].join("\n"));
  console.log("host + error detail patched");

  /* 3. getWeather 失败时保留错误信息供界面显示 */
  const oldG = [
    "    } catch (e) {",
    '      console.warn("workbench weather failed", e);',
    "      c.stale = false;",
    "    }"
  ].join("\n");
  const newG = [
    "    } catch (e) {",
    '      console.warn("workbench weather failed", e);',
    '      c.data = { error: e && e.message ? String(e.message) : "\u5929\u6c14\u83b7\u53d6\u5931\u8d25" };',
    "      c.stale = false;",
    "    }"
  ].join("\n");
  if (!s.includes(oldG)) throw new Error("getWeather catch not found");
  s = s.replace(oldG, newG);
  console.log("weather error stored");

  /* 4. 渲染失败分支显示具体错误 */
  const oldE = '        const e = card.createDiv({ cls: "wb-wx-empty", text: "\u5929\u6c14\u83b7\u53d6\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u8bbe\u7f6e\u4e2d\u7684\u57ce\u5e02/\u7ecf\u7eac\u5ea6" });';
  const newE = '        const e = card.createDiv({ cls: "wb-wx-empty", text: weather && weather.error ? `\u5929\u6c14\u83b7\u53d6\u5931\u8d25\uff1a${weather.error}` : "\u5929\u6c14\u83b7\u53d6\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u8bbe\u7f6e\u4e2d\u7684\u57ce\u5e02/\u7ecf\u7eac\u5ea6" });';
  if (!s.includes(oldE)) throw new Error("empty text not found");
  s = s.replace(oldE, newE);
  console.log("error display patched");

  /* 5. 设置页加 API Host 输入 */
  if (!s.includes("QWeather API Host")) {
    const oldH = '    new Setting(containerEl).setName("\u548c\u98ce\u5929\u6c14 API Key")';
    const newH = [
      '    new Setting(containerEl).setName("\u548c\u98ce\u5929\u6c14 API Host").setDesc("\u4ee5\u63a7\u5236\u53f0\uff08\u521b\u5efa API Key \u65f6\uff09\u663e\u793a\u7684 Host \u4e3a\u51c6\uff0c\u9ed8\u8ba4 api.qweather.com\uff1b\u65e7\u5e73\u53f0 key \u53ef\u7528 devapi.qweather.com")',
      '      .addText(t => t.setPlaceholder("api.qweather.com").setValue(this.plugin.settings.qweatherHost).onChange(async v => {',
      "        const h = v.trim().replace(/^https?:\\/\\//, \"\").replace(/\\/+$/, \"\");",
      "        if (h) { this.plugin.settings.qweatherHost = h; this.plugin.weatherCache.stale = true; await this.plugin.saveSettings(); }",
      "      }));",
      "",
      oldH
    ].join("\n");
    if (!s.includes(oldH)) throw new Error("key setting anchor not found");
    s = s.replace(oldH, newH);
    console.log("host setting added");
  }

  write(f, s);
}

/* ---------- styles.css ---------- */
{
  const f = "src/styles.css";
  let s = read(f);

  /* 搜索框白色显眼 */
  const oldQ = [
    ".wb-querybar input {",
    "  flex: 1; background: transparent; border: none; outline: none;",
    "  color: var(--wb-text); font-size: 13px; box-shadow: none !important;",
    "}"
  ].join("\n");
  const newQ = [
    ".wb-querybar input {",
    "  flex: 1; background: #ffffff; border: none; outline: none; border-radius: 8px;",
    "  color: #14161f; font-size: 13px; box-shadow: none !important; padding: 8px 12px;",
    "}"
  ].join("\n");
  if (!s.includes(oldQ)) throw new Error("querybar not found");
  s = s.replace(oldQ, newQ);

  /* placeholder 深灰 */
  const oldP = ".wb-querybar input::placeholder { color: var(--wb-muted); opacity: .7; }";
  if (!s.includes(oldP)) throw new Error("placeholder not found");
  s = s.replace(oldP, ".wb-querybar input::placeholder { color: #7a7f95; opacity: .9; }");

  /* 横幅高度 +25%：min-height 125px（原内容约100px），padding 加高 */
  const oldB = "  padding: 6px 12px;";
  const newB = "  padding: 10px 14px;\n  min-height: 125px;";
  if (!s.includes(oldB)) throw new Error("banner padding not found");
  s = s.replace(oldB, newB);

  write(f, s);
  console.log("styles patched");
}

console.log("ALL PATCHED");
