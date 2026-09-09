/* 构建脚本：拼接 lunar.js + main.js -> dist/main.js，并复制 manifest/styles/data */
const fs = require("fs");
const path = require("path");

const SRC = __dirname;
const DIST = path.join(SRC, "dist");

function build() {
  const lunar = fs.readFileSync(path.join(SRC, "src", "lunar.js"), "utf8");
  const code = fs.readFileSync(path.join(SRC, "src", "main.js"), "utf8");
  // lunar.js 的 UMD 会把 module.exports 设为农历库工厂结果；
  // main.js 第一行 const lunarLib = module.exports 捕获它，随后再覆盖 module.exports = WorkbenchPlugin
  const out = lunar + "\n\n/* ========== 个人工作台 Personal Workbench ========== */\n" + code;
  fs.writeFileSync(path.join(DIST, "main.js"), out.replace(/\r/g, "")); // LF化: 统一产物换行，避免 CRLF 混入（2026-09-09 v1.5.2 经验）

  for (const f of ["manifest.json", "styles.css", "data.json"]) {
    fs.copyFileSync(path.join(SRC, "src", f), path.join(DIST, f));
  }
  console.log("build ok ->", path.join(DIST, "main.js"), (out.length / 1024).toFixed(0) + "KB");
}

build();
