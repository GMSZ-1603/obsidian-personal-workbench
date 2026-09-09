@echo off
chcp 65001 >nul
REM ============================================================
REM  个人工作台插件 - Win10-LB 开发机 一键构建+同步+推送
REM  首次使用：修改下面 DEV(开发目录) 和 DOC(文档路径)，保存
REM ============================================================
set DEV=C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin
REM 文档路径双机自适应：Win10-LB 在「项目」，DELL-7480 在「安排」
if exist "D:\Obsidian\Second Brain\项目\个人工作台插件开发与发布标准操作文档.md" (set DOC=D:\Obsidian\Second Brain\项目\个人工作台插件开发与发布标准操作文档.md) else (set DOC=D:\Obsidian\Second Brain\安排\个人工作台插件开发与发布标准操作文档.md)
set SHARE=Y:\99临时文件\wb-plugin
set LOCAL=D:\Obsidian\Second Brain\.obsidian\plugins\personal-workbench

if not exist "%DEV%\build.js" (echo [错误] 开发目录不存在，请修改本文件开头的 DEV 变量 & pause & exit /b 1)
cd /d "%DEV%"

echo [1/5] 构建与测试...
call node build.js || goto err
call node test.js || goto err
call node render-test.js || goto err

echo [2/5] 部署到 Win10-LB 本机安装目录...
copy /y "dist\main.js" "%LOCAL%\" >nul
copy /y "dist\styles.css" "%LOCAL%\" >nul
copy /y "manifest.json" "%LOCAL%\" >nul
echo      data.json 已保留（未覆盖）

echo [3/5] 复制构建产物到共享...
if not exist "%SHARE%\dist" mkdir "%SHARE%\dist"
copy /y "dist\main.js" "%SHARE%\dist\" >nul
copy /y "dist\styles.css" "%SHARE%\dist\" >nul
copy /y "manifest.json" "%SHARE%\dist\" >nul
echo      已复制 main.js / styles.css / manifest.json

echo [4/5] 复制开发文档到共享...
if not exist "%SHARE%\docs" mkdir "%SHARE%\docs"
if exist "%DOC%" (copy /y "%DOC%" "%SHARE%\docs\" >nul) else (echo [警告] 未找到文档，请修改 DOC 变量)

echo [5/5] 推送 GitHub...
git add -A
git commit -m "workbench update"
git push
if errorlevel 1 (echo [警告] git push 失败，请检查凭据与网络 & goto end)

echo ============================================================
echo  全部完成！DELL-7480 上双击 deploy.bat 即可更新插件
echo ============================================================
goto end
:err
echo ***** 构建/测试失败，未同步、未推送 *****
:end
if /i not "%1"=="nopause" pause
