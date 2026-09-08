/* 生成插件真实渲染的快照 HTML，供浏览器截图检查视觉效果 */
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
const loaded = require(path.join(__dirname, "dist", "main.js"));
const WB = loaded.default || loaded;

/* ---- 简易 DOM（同 render-test） ---- */
class FakeEl {
  constructor(tag = "div") { this.tag = tag; this.children = []; this._cls = new Set(); this._attrs = {}; this._text = ""; this.style = {}; this.parentEl = null; this.listeners = {}; this.value = ""; }
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; }
  querySelector(sel) {
    const cls = sel.replace(/^\./, "");
    const walk = (n) => { for (const c of n.children) { if (c._cls.has(cls)) return c; const r = walk(c); if (r) return r; } return null; };
    return walk(this);
  }
  querySelectorAll(sel) {
    const cls = sel.replace(/^\./, "");
    const out = [];
    const walk = (n) => { for (const c of n.children) { if (c._cls.has(cls)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  get className() { return [...this._cls].join(" "); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  addClass(c) { String(c).split(/\s+/).filter(Boolean).forEach(x => this._cls.add(x)); return this; }
  setAttribute(k, v) { this._attrs[k] = String(v); return this; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  appendChild(c) { c.parentEl = this; this.children.push(c); return c; }
  append(c) { return this.appendChild(c); }
  empty() { this.children = []; this._text = ""; return this; }
  createEl(tag, opts = {}) { const c = new FakeEl(tag); if (opts.cls) c.addClass(opts.cls); if (opts.text != null) c.textContent = opts.text; if (opts.placeholder) c.setAttribute("placeholder", opts.placeholder); this.appendChild(c); return c; }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
}
global.document = { createElement: t => new FakeEl(t), addEventListener() {}, contains: () => true };
global.window = { clearInterval: () => {}, setTimeout: () => 1 };
global.navigator = {};

function listMd(dir, base) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.join(base || "", ent.name).replace(/\\/g, "/");
    if (ent.name === ".obsidian") continue;
    if (ent.isDirectory()) out.push(...listMd(full, rel));
    else if (ent.name.endsWith(".md")) { const st = fs.statSync(full); out.push({ path: rel, name: ent.name, extension: "md", stat: { ctime: st.ctimeMs, mtime: st.mtimeMs } }); }
  }
  return out;
}
const files = listMd(VAULT);
function listAll(dir, base) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.join(base || "", ent.name).replace(/\\/g, "/");
    if (ent.name === ".obsidian") continue;
    if (ent.isDirectory()) { out.push({ path: rel, extension: undefined }); out.push(...listAll(full, rel)); }
    else { out.push({ path: rel, extension: path.extname(ent.name).replace(".", "") || "md" }); }
  }
  return out;
}
const allFiles = listAll(VAULT);
const app = {
  vault: {
    getMarkdownFiles: () => files,
    getAllLoadedFiles: () => allFiles,
    cachedRead: async f => { try { return fs.readFileSync(path.join(VAULT, f.path), "utf8"); } catch (e) { return ""; } },
    getAbstractFileByPath: p => { const full = path.join(VAULT, p); if (fs.existsSync(full)) return { path: p.replace(/\\/g, "/"), extension: path.extname(p).replace(".", "") }; return null; }
  },
  workspace: { getLeaf: () => ({ openFile: async () => {} }) },
  metadataCache: { on: () => ({}), resolvedLinks: {}, getFileCache: () => null },
  commands: { listCommands: () => [], executeCommandById: () => {} }
};

function ser(n) {
  const cls = [...n._cls].join(" ");
  const tag = n.tag || "div";
  let attrs = "";
  if (cls) attrs += ` class="${cls}"`;
  const st = Object.entries(n.style || {}).map(([k, v]) => v ? `${k}:${v}` : "").filter(Boolean).join(";");
  if (st) attrs += ` style="${st}"`;
  let s = n._text || "";
  for (const c of n.children) s += ser(c);
  return `<${tag}${attrs}>${s}</${tag}>`;
}

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
  plugin.getWeather = async () => ({ temp: 28, feels: 31, humidity: 77, wind: 18, code: 3, list: [
    { date: "2026-09-03", code: 3, max: 29, min: 24 }, { date: "2026-09-04", code: 3, max: 30, min: 23 }, { date: "2026-09-05", code: 53, max: 29, min: 23 }, { date: "2026-09-06", code: 2, max: 29, min: 22 }, { date: "2026-09-07", code: 2, max: 28, min: 21 }, { date: "2026-09-08", code: 3, max: 28, min: 21 }] });

  const el = new FakeEl("div");
  const state = { year: 2026, month: 9, selected: "2026-09-03", loading: false };
  await plugin.renderDashboard(el, null, state);
  const css = fs.readFileSync(path.join(__dirname, "src", "styles.css"), "utf8");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=1100"><title>workbench snapshot</title><style>${css}
html,body{height:100%;margin:0;background:#0b0d13;font-family:"Microsoft YaHei",sans-serif;}
</style></head><body><div class="wb-view-container">${ser(el)}</div></body></html>`;
  fs.writeFileSync(path.join(__dirname, "workbench-snapshot.html"), html);
  console.log("snapshot written:", path.join(__dirname, "workbench-snapshot.html"), html.length, "bytes");
})();
