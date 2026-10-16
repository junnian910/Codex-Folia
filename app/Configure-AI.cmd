@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch.ps1" -InitializeOnly
if errorlevel 1 exit /b 1
start "" notepad.exe "%LOCALAPPDATA%\CodexFolia\settings.json"
