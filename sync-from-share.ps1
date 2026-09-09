# sync-from-share.ps1 — 从共享源码包 zip 同步 DELL 热修到开发目录
# 用法: powershell -NoProfile -ExecutionPolicy Bypass -File sync-from-share.ps1 <zip路径> <开发目录> <共享根> <本地文档路径>
# v2.2：用 tar.exe 解压 zip（PS 的 System.IO.Compression 读 Y:\ 网络盘 zip 会挂起，已废弃）
param(
  [string]$Zip,
  [string]$Dev,
  [string]$Share,
  [string]$Doc
)
$ErrorActionPreference = "Stop"

Write-Host "[0/6] 从共享同步最新源码与文档 ..."

# 1) 未提交改动检查（提示但不阻断；git 可找回历史，覆盖仅影响未提交内容）
#    注意 core.autocrlf=true 时 git 会输出 LF->CRLF 转换警告，-c 覆盖并静默
Push-Location $Dev
$dirty = git -c core.autocrlf=false diff --stat -- manifest.json versions.json dist/main.js 2>$null
if ($dirty) {
  Write-Host "  [警告] 以下文件有未提交改动，将被共享版覆盖（git 历史可找回已提交版本）："
  $dirty | ForEach-Object { Write-Host "    $_" }
}
Pop-Location

# 2) 用 tar.exe 从 zip 提取 v1.5.2 变更文件（只同步 dist 产物与版本文件，绝不整体覆盖）
#    注意：不提取 zip 内的 src/main.js —— 该文件曾在打包时残缺（缺 heatmapSection，
#    导致 build 产物旧版 491KB），源码以 Win10-LB git 仓库为准，热修需手动改 src。
if (-not (Test-Path $Zip)) { Write-Host "  [错误] 找不到源码包: $Zip" ; exit 1 }
$items = @(
  "dist/main.js","dist/styles.css","dist/manifest.json","dist/versions.json",
  "manifest.json","versions.json","main.js","styles.css"
)
foreach ($it in $items) {
  # 用 cmd /c 包裹，stderr 重定向 nul，避免 tar 报错触发 $ErrorActionPreference=Stop 终止
  cmd /c ("tar -xf `"{0}`" -C `"{1}`" {2} 2>nul" -f $Zip, $Dev, $it)
  if ($LASTEXITCODE -eq 0) {
    $lp = Join-Path $Dev ($it -replace "/", "\")
    Write-Host ("    同步 " + $it + " (" + (Get-Item $lp).Length + "B)")
  } else {
    Write-Host ("    [跳过] zip 中无 " + $it)
  }
}
Write-Host "  zip 同步完成，共 $($items.Count) 个条目"

# 3) 从共享 docs 拉最新开发文档到本地（防止本地旧文档在 build-push 时覆盖共享新版）
$shareDoc = Join-Path $Share "docs\个人工作台插件开发与发布标准操作文档.md"
if (Test-Path $shareDoc) {
  Copy-Item $shareDoc $Doc -Force
  Write-Host "  文档已同步: $Doc ($((Get-Item $Doc).Length)B)"
} else {
  Write-Host "  [警告] 共享 docs 不存在: $shareDoc"
}

# 4) 校验关键产物已更新（dist 为权威；src 修复状态仅提示，不阻断）
$distMain = Join-Path $Dev "dist\main.js"
$d = [System.IO.File]::ReadAllText($distMain, [System.Text.UTF8Encoding]::new($false))
$hasFix1 = $d.Contains("c.data.length && !c.stale")
$hasFix2 = $d.Contains("([^\r\n]*)")
Write-Host ("  校验 dist/main.js: 缓存修复=" + $hasFix1 + " CRLF修复=" + $hasFix2)
if (-not ($hasFix1 -and $hasFix2)) { Write-Host "  [错误] dist/main.js 缺少修复标记，请检查共享源码包" ; exit 1 }
$srcMain = Join-Path $Dev "src\main.js"
$s = [System.IO.File]::ReadAllText($srcMain, [System.Text.UTF8Encoding]::new($false))
Write-Host ("  提示 src/main.js: 缓存修复=" + $s.Contains("c.data.length && !c.stale") + " CRLF修复=" + $s.Contains("([^\r\n]*)"))
$ver = (Get-Content (Join-Path $Dev "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json).version
Write-Host "  当前版本: $ver"
Write-Host "[0/6] 同步完成"
