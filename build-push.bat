@echo off
chcp 65001 >nul
setlocal
REM ============================================================
REM  Personal Workbench Plugin - Win10-LB Dev Machine One-Click Build+Push
REM  v4.0 (2026-09-09)
REM  [0] tar sync DELL hotfix from shared zip + doc sync + findstr verify
REM      (no powershell: powershell hangs reading Y:\ zip under cmd env)
REM  [1] build (build.js does LF-normalize) + versions to dist + fc compare
REM      + test + render-test
REM  [2] deploy to local install dir (keep data.json, add versions.json)
REM  [3] copy build output + doc to share
REM  [4] git push
REM  [5] optional GitHub Release (set RELEASE_TOKEN below)
REM  NOTE: keep this file ASCII/UTF-8-only. cmd parses the whole .bat with
REM  the code page active at launch; in-file chcp does not re-decode it.
REM ============================================================
set DEV=C:\Users\admin\Doubao\chats\2026-09-03\new-chat-1\workbench-plugin
REM doc path auto-detect: Win10-LB uses "项目", DELL-7480 uses "安排"
if exist "D:\Obsidian\Second Brain\项目\个人工作台插件开发与发布标准操作文档.md" (set DOC=D:\Obsidian\Second Brain\项目\个人工作台插件开发与发布标准操作文档.md) else (set DOC=D:\Obsidian\Second Brain\安排\个人工作台插件开发与发布标准操作文档.md)
set SHARE=Y:\wb-plugin
set LOCAL=D:\Obsidian\Second Brain\.obsidian\plugins\personal-workbench
set ZIP=%SHARE%\personal-workbench-开发源码包-2026-09-09.zip
REM GitHub Release token (https://github.com/settings/tokens, repo scope)
REM empty = skip Release, git push only
set RELEASE_TOKEN=

if not exist "%DEV%\build.js" (echo [ERROR] DEV dir not found, fix DEV at top & pause & exit /b 1)
cd /d "%DEV%"

echo [0/6] sync from share ...
if not exist "%ZIP%" (echo [ERROR] zip not found: %ZIP% & goto err)
tar -xf "%ZIP%" -C "%DEV%" dist/main.js dist/styles.css dist/manifest.json manifest.json versions.json main.js styles.css 2>nul
echo      synced dist + version files (dist/versions.json absent in zip is OK)
if exist "%SHARE%\docs\个人工作台插件开发与发布标准操作文档.md" (copy /y "%SHARE%\docs\个人工作台插件开发与发布标准操作文档.md" "%DOC%" >nul & echo      doc synced) else (echo [WARN] share docs missing)
findstr /c:"c.data.length" "dist\main.js" >nul || (echo [ERROR] dist/main.js lacks cache fix, check share package & goto err)
echo      dist/main.js verified

echo [1/6] build + test ...
call node build.js || goto err
copy /y "versions.json" "dist\versions.json" >nul
fc /b "dist\main.js" "%SHARE%\dist\main.js" >nul && (echo  [OK] build output byte-identical to share dist) || (echo  [WARN] build output differs from share dist! src may lag behind DELL hotfix)
call node test.js || goto err
call node render-test.js || goto err

echo [2/6] deploy to local install dir ...
copy /y "dist\main.js" "%LOCAL%\" >nul
copy /y "dist\styles.css" "%LOCAL%\" >nul
copy /y "manifest.json" "%LOCAL%\" >nul
copy /y "versions.json" "%LOCAL%\" >nul
echo      data.json kept; versions.json included

echo [3/6] copy to share ...
if not exist "%SHARE%\dist" mkdir "%SHARE%\dist"
copy /y "dist\main.js" "%SHARE%\dist\" >nul
copy /y "dist\styles.css" "%SHARE%\dist\" >nul
copy /y "manifest.json" "%SHARE%\dist\" >nul
copy /y "versions.json" "%SHARE%\dist\" >nul
if exist "%DOC%" (copy /y "%DOC%" "%SHARE%\docs\" >nul) else (echo [WARN] DOC not found, fix DOC var)

echo [4/6] push GitHub ...
git add -A
git commit -m "workbench v1.5.2: CRLF task scan fix + empty-array cache fix (DELL hotfix sync)"
git push
if errorlevel 1 (echo [WARN] git push failed, check credentials/network & goto end)

echo [5/6] GitHub Release (optional) ...
if defined RELEASE_TOKEN (
  echo     RELEASE_TOKEN set, publishing via PowerShell (if it hangs, run the command from the doc manually)
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$t='%RELEASE_TOKEN%'; $ver=(Get-Content manifest.json -Raw -Encoding UTF8|ConvertFrom-Json).version; $repo='GMSZ-1603/obsidian-personal-workbench'; $h=@{Authorization='token '+$t;Accept='application/vnd.github+json'}; $tag='v'+$ver; try{ Invoke-RestMethod -Uri ('https://api.github.com/repos/'+$repo+'/releases/tags/'+$tag) -Headers $h | Out-Null; Write-Host ('Release '+$tag+' already exists, skip') }catch{ $body=@{tag_name=$tag;name=$tag;body='v'+$ver;draft=$false;prerelease=$false}|ConvertTo-Json; $rel=Invoke-RestMethod -Method Post -Uri ('https://api.github.com/repos/'+$repo+'/releases') -Headers $h -Body $body; foreach($a in @('main.js','manifest.json','styles.css')){ Invoke-RestMethod -Method Post -Uri ('https://uploads.github.com/repos/'+$repo+'/releases/'+$rel.id+'/assets?name='+$a) -Headers $h -ContentType 'application/octet-stream' -InFile $a | Out-Null }; Write-Host ('Release v'+$ver+' done: '+$rel.html_url) }"
) else (
  echo     RELEASE_TOKEN empty, skip Release (code already pushed)
)

echo ============================================================
echo  ALL DONE! On DELL-7480 double-click deploy.bat to update
echo ============================================================
goto end
:err
echo ***** sync/build/test FAILED, nothing deployed or pushed *****
:end
if /i not "%1"=="nopause" pause
