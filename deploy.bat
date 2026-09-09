@echo off
chcp 65001 >nul
REM ============================================================
REM  个人工作台插件 - DELL-7480 使用机 一键更新
REM  v2（2026-09-09）：新增 versions.json 同步
REM  从共享文件夹复制新版本到插件安装目录（data.json 保留不覆盖）
REM ============================================================
set SHARE=Y:\99临时文件\wb-plugin
set DST=D:\Obsidian\Second Brain\.obsidian\plugins\personal-workbench
set DOCDST=D:\Obsidian\Second Brain\安排

if not exist "%SHARE%\dist\main.js" (echo [错误] 共享中没有新版本，请先在 Win10-LB 上运行 build-push.bat & pause & exit /b 1)

echo [1/3] 复制插件文件...
copy /y "%SHARE%\dist\main.js" "%DST%\" >nul
copy /y "%SHARE%\dist\styles.css" "%DST%\" >nul
copy /y "%SHARE%\dist\manifest.json" "%DST%\" >nul
if exist "%SHARE%\dist\versions.json" copy /y "%SHARE%\dist\versions.json" "%DST%\" >nul
echo      data.json 已保留（未覆盖）；已含 versions.json

echo [2/3] 同步文档副本...
if exist "%SHARE%\docs\个人工作台插件开发与发布标准操作文档.md" copy /y "%SHARE%\docs\个人工作台插件开发与发布标准操作文档.md" "%DOCDST%\" >nul

echo [3/3] 完成！
echo       请重启 Obsidian（或 Ctrl+P 输入 reload 重载插件）
pause
