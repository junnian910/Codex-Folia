@echo off
set "FOLIA_PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "FOLIA_PS=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
"%FOLIA_PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch.ps1" -SelectCodex
if errorlevel 1 pause
