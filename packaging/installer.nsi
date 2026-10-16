Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"
!ifndef PAYLOAD
  !error "Pass /DPAYLOAD=<app directory>"
!endif
!ifndef OUTPUT
  !error "Pass /DOUTPUT=<installer path>"
!endif
!define PRODUCT_VERSION "0.1.16"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexFolia"
Name "Codex Folia"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\Codex Folia"
InstallDirRegKey HKCU "${UNINSTALL_KEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
VIProductVersion "0.1.16.0"
VIAddVersionKey "ProductName" "Codex Folia"
VIAddVersionKey "FileDescription" "Codex Folia Setup"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "LegalCopyright" "Folia contributors; third-party licenses included"
BrandingText "Codex Folia · Folia for Codex"
Var TestInstall

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "安装 Codex Folia"
!define MUI_WELCOMEPAGE_TEXT "将 Folia 播放器和歌词效果嵌入 Codex。$\r$\n$\r$\n适用于 Windows 10/11 64 位，需已安装官方 Codex。程序自带运行环境，安装时无需下载依赖。$\r$\n$\r$\n首次使用请登录自己的 Codex 和音乐账号。AI 主题为可选功能，接口和密钥默认留空。$\r$\n$\r$\n本项目为独立社区接入，未修改官方 Codex 安装包。"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${PAYLOAD}\LICENSE-Folia"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchFolia
!define MUI_FINISHPAGE_RUN_TEXT "打开 Codex Folia"
!define MUI_FINISHPAGE_RUN_NOTCHECKED
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "Codex Folia 需要 64 位 Windows。"
    Abort
  ${EndIf}
  SetShellVarContext current
  SetRegView 64
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/TEST" $1
  ${IfNot} ${Errors}
    StrCpy $TestInstall "1"
  ${EndIf}
  ${If} $INSTDIR == "$LOCALAPPDATA\Programs\Codex Folia"
    IfFileExists "E:\*.*" 0 +2
      StrCpy $INSTDIR "E:\Program Files\Codex Folia"
  ${EndIf}
FunctionEnd

Function LaunchFolia
  ${DisableX64FSRedirection}
  Exec '"$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\launch.ps1"'
  ${EnableX64FSRedirection}
FunctionEnd

Section "Codex Folia" MainSection
  SetOutPath "$INSTDIR"
  SetOverwrite on
  ClearErrors
  File /r "${PAYLOAD}\*.*"
  ${If} ${Errors}
    MessageBox MB_OK|MB_ICONSTOP "程序文件未能完整写入安装目录。请选择当前用户可写入的文件夹后重试。"
    SetErrorLevel 1
    Abort
  ${EndIf}
  FileOpen $0 "$INSTDIR\codex-folia.install" w
  FileWrite $0 "Codex Folia ${PRODUCT_VERSION}$\r$\n"
  FileClose $0
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  ${If} $TestInstall != "1"
    ${DisableX64FSRedirection}
    nsExec::ExecToStack '"$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\Repair-Shortcuts.ps1" -NoUI'
    ${EnableX64FSRedirection}
    Pop $0
    Pop $1
    DetailPrint "$1"
    ${If} $0 != "0"
      MessageBox MB_OK|MB_ICONEXCLAMATION "程序已复制，但桌面或开始菜单快捷方式创建失败。请在安装目录运行 Repair-Shortcuts.cmd。$\r$\n$1"
      SetErrorLevel 1
    ${EndIf}
    WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "Codex Folia"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
    WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
    WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  ${EndIf}
SectionEnd

Function un.onInit
  SetShellVarContext current
  SetRegView 64
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/TEST" $1
  ${IfNot} ${Errors}
    StrCpy $TestInstall "1"
  ${EndIf}
  IfFileExists "$INSTDIR\codex-folia.install" +3
    MessageBox MB_OK|MB_ICONSTOP "未找到本项目的安装标记，已取消卸载。"
    Abort
FunctionEnd

Section "Uninstall"
  ${If} $TestInstall != "1"
    ${DisableX64FSRedirection}
    nsExec::ExecToLog '"$WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\launch.ps1" -Stop'
    ${EnableX64FSRedirection}
    Sleep 2500
    ReadRegStr $0 HKCU "${UNINSTALL_KEY}" "InstallLocation"
    ${If} $0 == $INSTDIR
      Delete "$DESKTOP\Codex Folia 背景.lnk"
      Delete "$SMPROGRAMS\Codex Folia\Codex Folia.lnk"
      Delete "$SMPROGRAMS\Codex Folia\关闭背景.lnk"
      Delete "$SMPROGRAMS\Codex Folia\配置 AI.lnk"
      Delete "$SMPROGRAMS\Codex Folia\重新选择 Codex.lnk"
      Delete "$SMPROGRAMS\Codex Folia\修复快捷方式.lnk"
      Delete "$SMPROGRAMS\Codex Folia\使用说明.lnk"
      Delete "$SMPROGRAMS\Codex Folia\卸载.lnk"
      RMDir "$SMPROGRAMS\Codex Folia"
      DeleteRegKey HKCU "${UNINSTALL_KEY}"
    ${EndIf}
  ${EndIf}
  ; Generated list deletes only files included in this installer. User data stays outside INSTDIR.
  !include "uninstall-files.nsh"
  Delete "$INSTDIR\codex-folia.install"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
