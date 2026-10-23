// 完整加载模拟：onload + WorkbenchView onOpen + renderDashboard
const fs = require("fs");
const path = require("path");
const Module = require("module");

const VAULT = "D:\\Obsidian\\Second Brain";
const base = "C:\\Users\\admin\\Doubao\\chats\\2026-09-03\\new-chat-1\\workbench-plugin";
const stub = path.join(base, "obsidian-stub.js");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "obsidian") return stub;
  return origResolve.call(this, request, ...args);
};
const loaded = require(path.join(base, "dist", "main.js"));
const WB = loaded.default || loaded;

class FakeEl {
  constructor(tag = "div") {
    this.tag = tag; this.children = []; this._cls = new Set(); this._attrs = {};
    this._text = ""; this._html = ""; this.style = {}; this.listeners = {};
    this.parentEl = null; this.value = "";
  }
  addClass(c) { String(c).split(/\s+/).filter(Boolean).forEach(x => this._cls.add(x)); return this; }
  removeClass(c) { this._cls.delete(c); return this; }
  toggleClass(c, on) { if (on === undefined) { if (this._cls.has(c)) this._cls.delete(c); else this._cls.add(c); } else if (on) this._cls.add(c); else this._cls.delete(c); return this; }
  hasClass(c) { return this._cls.has(c); }
  setAttribute(k, v) { this._attrs[k] = String(v); return this; }
  getAttribute(k) { return this._attrs[k]; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); this._html = ""; }
  appendChild(c) { c.parentEl = this; this.children.push(c); return c; }
  append(c) { return this.appendChild(c); }
  empty() { this.children = []; this._text = ""; return this; }
  remove() { if (this.parentEl) { const i = this.parentEl.children.indexOf(this); if (i >= 0) this.parentEl.children.splice(i, 1); } }
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; }
  fire(ev, e) { (this.listeners[ev] || []).forEach(fn => fn(e || {})); }
  createEl(tag, opts = {}) { const c = new FakeEl(tag); if (opts.cls) c.addClass(opts.cls); if (opts.text != null) c.textContent = opts.text; this.appendChild(c); return c; }
  createDiv(opts) { return this.createEl("div", opts); }
  createSpan(opts) { return this.createEl("span", opts); }
  createEl_placeholder(p) { this._attrs["placeholder"] = p; return this; }
  querySelector(sel) { const cls = sel.replace(/^\./, ""); const walk = (n) => { for (const c of n.children) { if (c._cls.has(cls)) return c; const r = walk(c); if (r) return r; } return null; }; return walk(this); }
  querySelectorAll(sel) { const cls = sel.replace(/^\./, ""); const out = []; const walk = (n) => { for (const c of n.children) { if (c._cls.has(cls)) out.push(c); walk(c); } }; walk(this); return out; }
}
global.document = { createElement: (t) => new FakeEl(t), addEventListener() {}, contains: () => true, body: new FakeEl("body") };
global.window = { setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, requestAnimationFrame: (fn) => fn && fn() };
global.navigator = {};
global.ResizeObserver = class { observe() {} disconnect() {} };

function listMd(dir, basep) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.join(basep || "", ent.name).replace(/\\/g, "/");
    if (ent.name === ".obsidian") continue;
    if (ent.isDirectory()) out.push(...listMd(full, rel));
    else if (ent.name.endsWith(".md")) {
      const st = fs.statSync(full);
      out.push({ path: rel, basename: ent.name.replace(/\.md$/, ""), name: ent.name, extension: "md", stat: { ctime: st.birthtimeMs || st.ctimeMs, mtime: st.mtimeMs } });
    }
  }
  return out;
}
function listAll(dir, basep) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    const rel = path.join(basep || "", ent.name).replace(/\\/g, "/");
    if (ent.name === ".obsidian") continue;
    if (ent.isDirectory()) { out.push({ path: rel, extension: undefined }); out.push(...listAll(full, rel)); }
    else { const st = fs.statSync(full); out.push({ path: rel, extension: path.extname(ent.name).replace(".", "") || "md", stat: { ctime: st.ctimeMs, mtime: st.mtimeMs } }); }
  }
  return out;
}
const files = listMd(VAULT);
const allFiles = listAll(VAULT);
const app = {
  vault: {
    getMarkdownFiles: () => files,
    getAllLoadedFiles: () => allFiles,
    cachedRead: async (f) => { try { return fs.readFileSync(path.join(VAULT, f.path), "utf8"); } catch (e) { return ""; } },
    modify: async () => {},
    on: () => ({ ref: () => {} }),
    getAbstractFileByPath: (p) => {
      const full = path.join(VAULT, p);
      if (fs.existsSync(full)) return { path: p.replace(/\\/g, "/"), extension: path.extname(p).replace(".", "") };
      return null;
    }
  },
  workspace: {
    getLeaf: () => ({ openFile: async () => {} }),
    onLayoutReady: (fn) => fn(),
    getLeavesOfType: () => [],
    revealLeaf: () => null,
    getActiveViewOfType: () => null,
    on: () => ({ ref: () => {} })
  },
  metadataCache: { on: () => ({ ref: () => {} }), resolvedLinks: {}, getFileCache: () => null },
  commands: { listCommands: () => [], executeCommandById: () => {} }
};

(async () => {
  const plugin = new WB(app, { id: "personal-workbench", version: "1.5.15" });
  // 补齐 stub Plugin 方法（模拟真实 Obsidian）
  plugin.registerView = (t, f) => { plugin._viewType = t; plugin._viewCtor = f; };
  plugin.addRibbonIcon = () => ({ addClass() {}, onClick() {} });
  plugin.addCommand = () => {};
  plugin.addSettingTab = () => {};
  plugin.registerEvent = () => {};
  plugin.registerMarkdownCodeBlockProcessor = () => {};
  plugin.register = () => {};
  plugin.unregister = () => {};
  plugin.openWorkbenchView = () => {};
  plugin.getWeather = async () => ({ temp: 20, feels: 20, humidity: 60, wind: 3, code: 1, list: [] });
  plugin.getWeatherExtra = async () => ({});
  console.log("stub ready");
  try {
    await plugin.onload();
    console.log("onload OK");
  } catch (e) {
    console.log("ONLOAD FAIL:", e.stack || e.message);
    process.exit(1);
  }
  try {
    const views = [];
    const savedReg = plugin.registerView;
    // 视图构造由 onload 注册，我们直接实例化视图类（从全局找）
    const T = globalThis.__wb_test;
    // 通过 __wb_test 找不到视图类，尝试用 plugin 上的注册函数
    // 直接调用视图渲染（模拟视图 onOpen）：
    const el = new FakeEl("div");
    el.addClass("wb-view-container");
    const state = { year: 2026, month: 10, selected: "2026-10-23", loading: false };
    await plugin.renderDashboard(el, null, state);
    console.log("renderDashboard OK");
    const cal = el.querySelector(".wb-calcard");
    const restCells = el.querySelectorAll(".wb-restday");
    console.log("restday cells:", restCells.length);
    const legendAct = el.querySelectorAll(".wb-lg-act");
    console.log("legend:", legendAct.map(c => c.textContent).join(","));
  } catch (e) {
    console.log("RENDER FAIL:", e.stack || e.message);
    process.exit(1);
  }
  console.log("ALL OK");
})();
