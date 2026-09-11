# Personal Workbench - DELL-7480 usage machine one-click updater (v4)
# bat 启动器会以 UTF-8 BOM 读取本脚本，中文路径在任何代码页下都正确
[Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding(936)
$ErrorActionPreference = "Stop"
$SHARE   = "Y:\wb-plugin"
$DST     = "D:\Obsidian\Second Brain\.obsidian\plugins\personal-workbench"
$DOCDST  = "D:\Obsidian\Second Brain\安排"

if (-not (Test-Path "$SHARE\dist\main.js")) {
    Write-Host "[ERROR] 共享目录没有新版本，请先在 Win10-LB 运行 build-push.bat" -ForegroundColor Red
    Read-Host "按回车退出"; exit 1
}

Write-Host "[1/3] 复制插件文件..."
Copy-Item "$SHARE\dist\main.js" $DST -Force
Copy-Item "$SHARE\dist\styles.css" $DST -Force
Copy-Item "$SHARE\dist\manifest.json" $DST -Force
if (Test-Path "$SHARE\dist\versions.json") { Copy-Item "$SHARE\dist\versions.json" $DST -Force }
Write-Host "      data.json 已保留；versions.json 已更新"

Write-Host "[2/3] 同步文档..."
if (Test-Path "$SHARE\docs\个人工作台插件开发与发布标准操作文档.md") {
    Copy-Item "$SHARE\docs\个人工作台插件开发与发布标准操作文档.md" $DOCDST -Force
}

Write-Host "[3/3] 完成！重启 Obsidian（或 Ctrl+P - reload app）加载新版本" -ForegroundColor Green
Read-Host "按回车退出"