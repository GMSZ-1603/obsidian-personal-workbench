@echo off
REM ============================================================
REM  Personal Workbench - DELL usage machine one-click updater
REM  v4 (2026-09-11): bat is only an ASCII launcher; all logic
REM  lives in deploy.ps1 (UTF-8 BOM) so Chinese paths never
REM  break under any cmd codepage (936/65001).
REM ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
pause
