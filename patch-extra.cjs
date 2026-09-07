/* 补丁：①请求次数控制（持久化缓存+扩展数据低频刷新） ②扩展天气显示（空气/指数/日出日落/降水/预警） */
const fs = require("fs");
const path = require("path");
const DIR = __dirname;
function read(f) { return fs.readFileSync(path.join(DIR, f), "utf8").replace(/\r\n/g, "\n"); }
function write(f, s) { fs.writeFileSync(path.join(DIR, f), s, "utf8"); }

/* ---------- main.js ---------- */
{
  const f = "src/main.js";
  let s = read(f);

  /* 1. DEFAULT_SETTINGS 加 extraRefreshMinutes */
  if (!s.includes("extraRefreshMinutes")) {
    s = s.replace('  qweatherHost: "api.qweather.com",', '  qweatherHost: "api.qweather.com",\n  extraRefreshMinutes: 120,');
    console.log("default extra interval added");
  }

  /* 2. fetchQWeatherExtra 函数（插在 fetchQWeather 后） */
  if (!s.includes("async function fetchQWeatherExtra")) {
    const fn = [
      "",
      "/* \u548c\u98ce\u6269\u5c55\u5929\u6c14\uff08\u7a7a\u6c14\u8d28\u91cf/\u751f\u6d3b\u6307\u6570/\u65e5\u51fa\u65e5\u843d/\u5206\u949f\u964d\u6c34/\u9884\u8b66\uff09\u00b7 \u4f4e\u9891\u5237\u65b0\u63a7\u5236\u8bf7\u6c42\u6570 */",
      "async function fetchQWeatherExtra(settings, _req) {",
      "  const req = _req || requestUrl;",
      "  const host = settings.qweatherHost || \"api.qweather.com\";",
      "  const loc = `${settings.longitude},${settings.latitude}`;",
      "  const key = String(settings.qweatherKey).trim();",
      "  const base = `https://${host}/v7/`;",
      "  const out = {};",
      "  const [airR, idxR, astR, minR, warnR] = await Promise.allSettled([",
      "    req({ url: `${base}air/now?location=${loc}&key=${key}` }),",
      "    req({ url: `${base}indices/1d?location=${loc}&key=${key}&type=1,2,3,5` }),",
      "    req({ url: `${base}astronomy/now?location=${loc}&key=${key}` }),",
      "    req({ url: `${base}minutely/5m?location=${loc}&key=${key}` }),",
      "    req({ url: `${base}warning/now?location=${loc}&key=${key}` })",
      "  ]);",
      "  const j = (r) => r.status === \"fulfilled\" && r.value && r.value.json ? r.value.json : null;",
      "  const air = j(airR);",
      "  if (air && air.now) out.air = { aqi: air.now.aqi, category: air.now.category, pm2p5: air.now.pm2p5 };",
      "  const idx = j(idxR);",
      "  if (idx && idx.daily && idx.daily.length) {",
      "    const icons = { 1: \"\ud83d\udc55\", 2: \"\u2600\ufe0f\", 3: \"\ud83e\udd27\", 5: \"\ud83c\udfc3\" };",
      "    out.indices = idx.daily.slice(0, 4).map(d => ({ icon: icons[d.type] || \"\u00b7\", name: d.name, text: d.text }));",
      "  }",
      "  const ast = j(astR);",
      "  if (ast && ast.sunrise) { out.sunrise = ast.sunrise; out.sunset = ast.sunset; }",
      "  const min = j(minR);",
      "  if (min && min.summary) out.minutelySummary = min.summary;",
      "  const warn = j(warnR);",
      "  if (warn && warn.warning && warn.warning.length) {",
      "    out.warning = warn.warning.map(w => `${w.typeName || \"\"} ${w.title}`).filter(Boolean).slice(0, 2).join(\"\uff1b\");",
      "  }",
      "  return out;",
      "}",
      ""
    ].join("\n");
    s = s.replace("\n/* ---------------- \u4e3b\u63d2\u4ef6 ---------------- */", fn + "/* ---------------- \u4e3b\u63d2\u4ef6 ---------------- */");
    console.log("fetchQWeatherExtra added");
  }

  /* 3. onload 初始化 extraCache + 恢复持久化缓存 */
  if (!s.includes("this.extraCache")) {
    s = s.replace("    this.weatherCache = { data: null, stale: true };", "    this.weatherCache = { data: null, stale: true };\n    this.extraCache = { data: null, stale: true };\n    this._restoreWeatherCaches();");
    console.log("extraCache init added");
  }

  /* 4. _restoreWeatherCaches 方法（放 loadSettings 前） */
  if (!s.includes("_restoreWeatherCaches()")) {
    const m = [
      "",
      "  /* \u6062\u590d\u6301\u4e45\u5316\u7684\u5929\u6c14\u7f13\u5b58\uff08\u91cd\u542f\u4e0d\u91cd\u590d\u8bf7\u6c42\uff09*/",
      "  _restoreWeatherCaches() {",
      "    const s = this.settings;",
      "    if (s._wc && s._wc.data && Date.now() - (s._wc.time || 0) < (s.refreshMinutes || 30) * 60000) {",
      "      this.weatherCache.data = s._wc.data;",
      "      this.weatherCache.time = s._wc.time;",
      "    }",
      "    if (s._ec && s._ec.data && Date.now() - (s._ec.time || 0) < (s.extraRefreshMinutes || 120) * 60000) {",
      "      this.extraCache.data = s._ec.data;",
      "      this.extraCache.time = s._ec.time;",
      "    }",
      "  }",
      "",
      "  async loadSettings() {"
    ].join("\n");
    s = s.replace("  async loadSettings() {", m);
    console.log("restore method added");
  }

  /* 5. getWeather 成功后持久化 */
  const oldG = [
    "      c.data = await fetchWeather(this.settings);",
    "      c.time = Date.now();",
    "      c.stale = false;"
  ].join("\n");
  const newG = [
    "      c.data = await fetchWeather(this.settings);",
    "      c.time = Date.now();",
    "      c.stale = false;",
    "      this.settings._wc = { data: c.data, time: c.time };",
    "      await this.saveSettings();"
  ].join("\n");
  if (!s.includes(oldG)) throw new Error("getWeather persist anchor not found");
  s = s.replace(oldG, newG);
  console.log("getWeather persist added");

  /* 6. getWeatherExtra 方法（放 getWeather 后） */
  if (!s.includes("async getWeatherExtra")) {
    const m = [
      "  async getWeatherExtra(force) {",
      "    if (!this.settings.qweatherKey || !String(this.settings.qweatherKey).trim()) return null;",
      "    const c = this.extraCache;",
      "    const maxAge = (this.settings.extraRefreshMinutes || 120) * 60000;",
      "    if (c.data && !c.stale && Date.now() - (c.time || 0) < maxAge && !force) return c.data;",
      "    try {",
      "      c.data = await fetchQWeatherExtra(this.settings);",
      "      c.time = Date.now();",
      "      c.stale = false;",
      "      this.settings._ec = { data: c.data, time: c.time };",
      "      await this.saveSettings();",
      "    } catch (e) {",
      '      console.warn("workbench extra failed", e);',
      "      c.stale = false;",
      "    }",
      "    return c.data || null;",
      "  }",
      "",
      "  async getBirthdays(force) {"
    ].join("\n");
    s = s.replace("  async getBirthdays(force) {", m);
    console.log("getWeatherExtra added");
  }

  /* 7. renderDashboard Promise.all 加 extra */
  const oldP = "    const [tasks, birthdays, weather] = await Promise.all([\n      this.getTasks(),\n      this.getBirthdays(),\n      this.getWeather()\n    ]);";
  const newP = "    const [tasks, birthdays, weather, extra] = await Promise.all([\n      this.getTasks(),\n      this.getBirthdays(),\n      this.getWeather(),\n      this.getWeatherExtra()\n    ]);";
  if (!s.includes(oldP)) throw new Error("promise all not found");
  s = s.replace(oldP, newP);
  console.log("promise all patched");

  /* 8. 天气卡扩展渲染（fc 预报后） */
  const oldE = [
    "        });",
    "      } else {",
    "        card.createDiv({ cls: \"wb-wx-empty\", text: \"\u5929\u6c14\u83b7\u53d6\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u8bbe\u7f6e\u4e2d\u7684\u57ce\u5e02/\u7ecf\u7eac\u5ea6\" });",
    "      }"
  ].join("\n");
  const newE = [
    "        });",
    "        // \u6269\u5c55\u5929\u6c14\uff08\u548c\u98ce\uff1a\u7a7a\u6c14\u8d28\u91cf/\u751f\u6d3b\u6307\u6570/\u65e5\u51fa\u65e5\u843d/\u5206\u949f\u964d\u6c34/\u9884\u8b66\uff09",
    "        if (extra && (extra.sunrise || extra.air || (extra.indices && extra.indices.length) || extra.minutelySummary || extra.warning)) {",
    "          if (extra.warning) card.createDiv({ cls: \"wb-wx-warn\", text: `\u26a0\ufe0f ${extra.warning}` });",
    "          const ex = card.createDiv({ cls: \"wb-wx-extra\" });",
    "          if (extra.sunrise) ex.createDiv({ cls: \"wb-wx-e\", text: `\ud83c\udf05 ${extra.sunrise} \u00b7 \ud83c\udf07 ${extra.sunset}` });",
    "          if (extra.air && extra.air.aqi != null) ex.createDiv({ cls: \"wb-wx-e\", text: `\u7a7a\u6c14\u8d28\u91cf ${extra.air.category} \u00b7 AQI ${extra.air.aqi} \u00b7 PM2.5 ${extra.air.pm2p5}` });",
    "          if (extra.indices && extra.indices.length) ex.createDiv({ cls: \"wb-wx-e\", text: extra.indices.map(i => `${i.icon} ${i.name} ${i.text}`).join(\" \u00b7 \") });",
    "          if (extra.minutelySummary) ex.createDiv({ cls: \"wb-wx-e\", text: `\ud83c\udf27 ${extra.minutelySummary}` });",
    "        }",
    "      } else {",
    "        card.createDiv({ cls: \"wb-wx-empty\", text: \"\u5929\u6c14\u83b7\u53d6\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u8bbe\u7f6e\u4e2d\u7684\u57ce\u5e02/\u7ecf\u7eac\u5ea6\" });",
    "      }"
  ].join("\n");
  if (!s.includes(oldE)) throw new Error("extra render anchor not found");
  s = s.replace(oldE, newE);
  console.log("extra render patched");

  /* 9. 设置页加扩展刷新间隔 */
  if (!s.includes("extraRefreshMinutes")) {
    const oldS = '    new Setting(containerEl).setName("\u6570\u636e\u5237\u65b0\u95f4\u9694\uff08\u5206\u949f\uff09")';
    const newS = [
      '    new Setting(containerEl).setName("\u6269\u5c55\u5929\u6c14\u5237\u65b0\u95f4\u9694\uff08\u5206\u949f\uff09").setDesc("\u7a7a\u6c14\u8d28\u91cf/\u6307\u6570/\u65e5\u51fa\u65e5\u843d\u7b49\u6570\u636e\u7684\u5237\u65b0\u95f4\u9694\uff0c\u9ed8\u8ba4 120 \u5206\u949f\u4ee5\u63a7\u5236\u8bf7\u6c42\u6570\uff08\u548c\u98ce\u514d\u8d39\u7248\u6bcf\u65e5 1000 \u6b21\uff09")',
      "      .addSlider(sl => sl.setLimits(30, 360, 30).setValue(this.plugin.settings.extraRefreshMinutes).setDynamicTooltip().onChange(async v => { this.plugin.settings.extraRefreshMinutes = v; this.plugin.extraCache.stale = true; await this.plugin.saveSettings(); }));",
      "",
      oldS
    ].join("\n");
    if (!s.includes(oldS)) throw new Error("settings slider anchor not found");
    s = s.replace(oldS, newS);
    console.log("extra slider added");
  }

  write(f, s);
}

/* ---------- styles.css ---------- */
{
  const f = "src/styles.css";
  let s = read(f);
  const anchor = ".wb-wx-empty";
  if (!s.includes(anchor)) throw new Error("wx empty anchor not found");
  const css = [
    ".wb-wx-extra { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--wb-line); }",
    ".wb-wx-e { font-size: 10.5px; color: #b9bfd2; line-height: 1.5; }",
    ".wb-wx-warn { margin-top: 8px; font-size: 11px; color: var(--wb-warn); background: color-mix(in srgb, var(--wb-warn) 14%, transparent); border-radius: 6px; padding: 3px 8px; }",
    ""
  ].join("\n");
  s = s.replace(anchor, css + anchor);
  write(f, s);
  console.log("styles patched");
}

console.log("ALL PATCHED");
