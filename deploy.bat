@echo off
chcp 65001 >nul
REM ============================================================
REM  Personal Workbench Plugin - DELL-7480 Usage Machine One-Click Update
REM  v3 (2026-09-09): English-only (bat encoding is parsed at launch;
REM  keep ASCII/UTF-8 to avoid mojibake). Copies new version from share
REM  to plugin install dir (data.json is kept).
REM ============================================================
set SHARE=Y:\99临时文件\wb-plugin
set DST=D:\Obsidian\Second Brain\.obsidian\plugins\personal-workbench
set DOCDST=D:\Obsidian\Second Brain\安排

if not exist "%SHARE%\dist\main.js" (echo [ERROR] No new version in share. Run build-push.bat on Win10-LB first. & pause & exit /b 1)

echo [1/3] copy plugin files...
copy /y "%SHARE%\dist\main.js" "%DST%\" >nul
copy /y "%SHARE%\dist\styles.css" "%DST%\" >nul
copy /y "%SHARE%\dist\manifest.json" "%DST%\" >nul
if exist "%SHARE%\dist\versions.json" copy /y "%SHARE%\dist\versions.json" "%DST%\" >nul
echo      data.json kept; versions.json included

echo [2/3] sync doc copy...
if exist "%SHARE%\docs\个人工作台插件开发与发布标准操作文档.md" copy /y "%SHARE%\docs\个人工作台插件开发与发布标准操作文档.md" "%DOCDST%\" >nul

echo [3/3] done!
echo       Restart Obsidian (or Ctrl+P - reload app) to load the new version
pause
