/* obsidian 空桩（仅用于构建期自测） */
class Plugin {
  constructor(app, manifest) { this.app = app; this.manifest = manifest; }
  onload() {}
  onunload() {}
  loadData() { return Promise.resolve({}); }
  saveData() { return Promise.resolve(); }
}
class PluginSettingTab { constructor(app, plugin) {} display() {} }
class Setting {
  constructor(containerEl) { return this; }
  setName() { return this; } setDesc() { return this; }
  addText() { return this; } addSlider() { return this; } addToggle() { return this; }
}
class Notice { constructor() {} }
class Component { load() {} register() {} }
class ItemView {
  constructor(leaf) { this.leaf = leaf; this.app = leaf && leaf.app; this.contentEl = new FakeElForView(); }
  getViewType() { return "x"; }
  getDisplayText() { return ""; }
  getIcon() { return ""; }
  async onOpen() {}
  async onClose() {}
  register(fn) { this._unloaders = this._unloaders || []; this._unloaders.push(fn); }
  registerEvent() {}
}
class FakeElForView {
  constructor() { this.children = []; this._cls = new Set(); }
  addClass(c) { this._cls.add(c); return this; }
  empty() { this.children = []; return this; }
  createDiv(opts) { const e = new FakeElForView(); if (opts && opts.cls) e._cls.add(opts.cls); this.children.push(e); return e; }
  setAttribute() {}
}
module.exports = { Plugin, PluginSettingTab, Setting, Notice, requestUrl: async () => ({}), Component, ItemView };
