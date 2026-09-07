/* 部署到本地 Obsidian 安装目录
 * 关键：只覆盖代码文件（manifest.json/main.js/styles.css），
 * data.json（用户设置：API Key/Host/刷新间隔等）仅在不存在时创建默认值，绝不覆盖。
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "dist");
const DST = "D:\\Obsidian\\Second Brain\\.obsidian\\plugins\\personal-workbench";

for (const f of ["manifest.json", "main.js", "styles.css"]) {
  fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
  console.log("copied:", f);
}

const cfg = path.join(DST, "data.json");
if (!fs.existsSync(cfg)) {
  fs.copyFileSync(path.join(SRC, "data.json"), cfg);
  console.log("copied: data.json (首次安装默认配置)");
} else {
  console.log("kept: data.json (用户配置已保留)");
}
