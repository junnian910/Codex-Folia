# Windows PowerShell 5-compatible discovery and shortcut helpers.
function Test-FoliaCodexExecutable {
  param([string]$Path)
  if(!$Path){return $false}
  try{
    $file=Get-Item -LiteralPath $Path -ErrorAction Stop
    # The desktop app has Electron resources; the standalone CLI does not.
    return !$file.PSIsContainer -and $file.Extension -ieq '.exe' -and (Test-Path -LiteralPath (Join-Path $file.DirectoryName 'resources\app.asar'))
  }catch{return $false}
}

function Get-FoliaPackageExecutables {
  param([object[]]$Packages)
  foreach($package in @($Packages|Sort-Object {[version]$_.Version} -Descending)){
    if(!$package.InstallLocation){continue}
    $root=[string]$package.InstallLocation
    $manifest=$null
    $registeredManifest=$false
    if($package.PackageFullName -and (Get-Command Get-AppxPackageManifest -ErrorAction SilentlyContinue)){
      try{$manifest=Get-AppxPackageManifest -Package $package.PackageFullName -ErrorAction Stop;$registeredManifest=$true}catch{}
    }
    try{
      if(!$manifest){[xml]$manifest=Get-Content -LiteralPath (Join-Path $root 'AppxManifest.xml') -Raw -ErrorAction Stop}
      foreach($application in @($manifest.Package.Applications.Application)){
        if(!$application.Executable -or $application.Id -match 'Runner|Helper|CLI'){continue}
        $executable=Join-Path $root ([string]$application.Executable).Replace('/',[IO.Path]::DirectorySeparatorChar)
        $hasVisuals=@($application.ChildNodes|Where-Object {$_.LocalName -eq 'VisualElements'}).Count -gt 0
        if((Test-FoliaCodexExecutable $executable) -or ($registeredManifest -and ($application.Id -eq 'App' -or $hasVisuals))){
          Write-Output $executable
          if($registeredManifest){Write-Output (Join-Path (Split-Path -Parent $executable) 'Codex.exe')}
        }
      }
    }catch{}
    # The adjacent launcher can activate MSIX when its primary executable is inaccessible.
    foreach($relative in @('app\ChatGPT.exe','app\Codex.exe','ChatGPT.exe','Codex.exe')){
      $executable=Join-Path $root $relative
      if(Test-FoliaCodexExecutable $executable){Write-Output $executable}
    }
  }
}

function Find-FoliaCodexExecutables {
  param([string]$PreferredPath='')
  $candidates=[Collections.Generic.List[string]]::new()
  if(Test-FoliaCodexExecutable $PreferredPath){$candidates.Add([IO.Path]::GetFullPath($PreferredPath))}
  if(Get-Command Get-AppxPackage -ErrorAction SilentlyContinue){
    $packages=@(Get-AppxPackage -Name 'OpenAI.Codex*' -ErrorAction SilentlyContinue)
    foreach($candidate in @(Get-FoliaPackageExecutables $packages)){$candidates.Add($candidate)}
  }
  foreach($process in @(Get-Process -Name ChatGPT,Codex -ErrorAction SilentlyContinue)){
    try{if(Test-FoliaCodexExecutable $process.Path){$candidates.Add($process.Path)}}catch{}
  }
  foreach($registryRoot in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths','HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths')){
    foreach($name in @('Codex.exe','ChatGPT.exe')){
      try{$registered=(Get-Item -LiteralPath (Join-Path $registryRoot $name) -ErrorAction Stop).GetValue('');if(Test-FoliaCodexExecutable $registered){$candidates.Add($registered)}}catch{}
    }
  }
  foreach($registryRoot in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall')){
    foreach($entry in @(Get-ChildItem -LiteralPath $registryRoot -ErrorAction SilentlyContinue|Get-ItemProperty -ErrorAction SilentlyContinue)){
      if($entry.DisplayName -notmatch '^Codex(?:$|\s+(?:Desktop|Beta|Preview))' -or !$entry.InstallLocation){continue}
      foreach($relative in @('ChatGPT.exe','Codex.exe','app\ChatGPT.exe','app\Codex.exe')){
        $candidate=Join-Path $entry.InstallLocation $relative
        if(Test-FoliaCodexExecutable $candidate){$candidates.Add($candidate)}
      }
    }
  }
  foreach($root in @((Join-Path $env:LOCALAPPDATA 'Programs\Codex'),(Join-Path $env:ProgramFiles 'Codex'))){
    foreach($relative in @('ChatGPT.exe','Codex.exe')){$candidate=Join-Path $root $relative;if(Test-FoliaCodexExecutable $candidate){$candidates.Add($candidate)}}
  }
  $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach($candidate in $candidates){if($seen.Add($candidate)){Write-Output $candidate}}
}

function Get-FoliaCodexAppIds {
  $registeredIds=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $packages=@()
  if(Get-Command Get-AppxPackage -ErrorAction SilentlyContinue){$packages=@(Get-AppxPackage -Name 'OpenAI.Codex*' -ErrorAction SilentlyContinue|Sort-Object Version -Descending)}
  foreach($package in $packages){
    try{
      $manifest=Get-AppxPackageManifest -Package $package.PackageFullName -ErrorAction Stop
      foreach($application in @($manifest.Package.Applications.Application)){
        if($application.Id -match 'Runner|Helper|CLI'){continue}
        if($application.Id -eq 'App' -or @($application.ChildNodes|Where-Object {$_.LocalName -eq 'VisualElements'}).Count){
          $appId=$package.PackageFamilyName+'!'+$application.Id
          if($registeredIds.Add($appId)){Write-Output $appId}
        }
      }
    }catch{}
  }
  # Start menu registration remains readable when the package files are protected.
  if(Get-Command Get-StartApps -ErrorAction SilentlyContinue){
    foreach($application in @(Get-StartApps -Name '*Codex*' -ErrorAction SilentlyContinue)){
      if($application.AppID -like 'OpenAI.Codex*!*' -and $registeredIds.Add($application.AppID)){Write-Output $application.AppID}
    }
  }
}

function Invoke-FoliaAppActivation {
  param([string]$AppId,[string]$Arguments)
  if(!('FoliaWindowsActivation' -as [type])){
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")]
class FoliaActivationManager {}
[ComImport, Guid("2e941141-7f97-4756-ba1d-9decde894a3d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IFoliaActivationManager {
  [PreserveSig] int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string id,[MarshalAs(UnmanagedType.LPWStr)] string arguments,uint options,out uint processId);
  [PreserveSig] int ActivateForFile([MarshalAs(UnmanagedType.LPWStr)] string id,IntPtr items,[MarshalAs(UnmanagedType.LPWStr)] string verb,out uint processId);
  [PreserveSig] int ActivateForProtocol([MarshalAs(UnmanagedType.LPWStr)] string id,IntPtr items,out uint processId);
}
public static class FoliaWindowsActivation {
  public static uint Activate(string id,string arguments){
    var manager=(IFoliaActivationManager)new FoliaActivationManager();
    try{uint processId;int result=manager.ActivateApplication(id,arguments,2,out processId);Marshal.ThrowExceptionForHR(result);return processId;}
    finally{Marshal.ReleaseComObject(manager);}
  }
}
'@
  }
  return [FoliaWindowsActivation]::Activate($AppId,$Arguments)
}

function Start-FoliaCodexApplication {
  param([string[]]$AppIds,[string[]]$ExecutablePaths,[string]$Arguments)
  $failures=[Collections.Generic.List[string]]::new()
  # Store apps must be activated through Windows, which owns their protected install path.
  foreach($appId in $AppIds){
    try{$startedProcess=Invoke-FoliaAppActivation -AppId $appId -Arguments $Arguments;return [pscustomobject]@{Method='WindowsActivation';ProcessId=$startedProcess}}
    catch{$failures.Add('Windows 启动入口 '+$appId+'：'+$_.Exception.Message)}
  }
  foreach($path in $ExecutablePaths){
    try{$started=Start-Process -FilePath $path -WorkingDirectory (Split-Path -Parent $path) -ArgumentList $Arguments -WindowStyle Normal -PassThru -ErrorAction Stop;return [pscustomobject]@{Method='Executable';ProcessId=$started.Id}}
    catch{$failures.Add($path+'：'+$_.Exception.Message)}
  }
  throw ('Windows 未能启动 Codex。'+"`r`n"+($failures -join "`r`n"))
}

function Select-FoliaCodexExecutable {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog=[Windows.Forms.OpenFileDialog]::new()
  $dialog.Title='选择已安装的 Codex 桌面程序（不是命令行工具）'
  $dialog.Filter='Codex 桌面程序 (*.exe)|*.exe'
  $dialog.CheckFileExists=$true
  try{
    if($dialog.ShowDialog() -ne [Windows.Forms.DialogResult]::OK){return $null}
    if(!(Test-FoliaCodexExecutable $dialog.FileName)){throw '请选择 Codex 桌面程序所在目录内的 EXE，其旁边应有 resources\app.asar；不要选择命令行工具。'}
    return $dialog.FileName
  }finally{$dialog.Dispose()}
}

function New-FoliaShortcuts {
  param([string]$InstallDirectory,[string]$DesktopDirectory='',[string]$ProgramsDirectory='')
  $root=[IO.Path]::GetFullPath($InstallDirectory)
  if(!$DesktopDirectory){$DesktopDirectory=[Environment]::GetFolderPath('DesktopDirectory')}
  if(!$ProgramsDirectory){$ProgramsDirectory=[Environment]::GetFolderPath('Programs')}
  if(!$DesktopDirectory -or !$ProgramsDirectory){throw 'Windows 未提供当前用户的桌面或开始菜单目录。'}
  $menu=Join-Path $ProgramsDirectory 'Codex Folia'
  New-Item -ItemType Directory -Path $DesktopDirectory,$menu -Force|Out-Null
  $powershell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $launch='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $root 'launch.ps1')+'"'
  $repair='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $root 'Repair-Shortcuts.ps1')+'"'
  $links=@(
    @{Path=(Join-Path $DesktopDirectory 'Codex Folia 背景.lnk');Target=$powershell;Arguments=$launch},
    @{Path=(Join-Path $menu 'Codex Folia.lnk');Target=$powershell;Arguments=$launch},
    @{Path=(Join-Path $menu '关闭背景.lnk');Target=$powershell;Arguments=($launch+' -Stop')},
    @{Path=(Join-Path $menu '重新选择 Codex.lnk');Target=$powershell;Arguments=($launch+' -SelectCodex')},
    @{Path=(Join-Path $menu '修复快捷方式.lnk');Target=$powershell;Arguments=$repair},
    @{Path=(Join-Path $menu '配置 AI.lnk');Target=(Join-Path $root 'Configure-AI.cmd');Arguments=''},
    @{Path=(Join-Path $menu '使用说明.lnk');Target=(Join-Path $root 'README.md');Arguments=''}
  )
  if(Test-Path -LiteralPath (Join-Path $root 'Uninstall.exe')){$links+=@{Path=(Join-Path $menu '卸载.lnk');Target=(Join-Path $root 'Uninstall.exe');Arguments=''}}
  $icon=Join-Path $root 'folia.ico'
  if(!(Test-Path -LiteralPath $icon)){throw '缺少 folia.ico，请让本机 Codex 恢复程序图标后重新创建快捷方式。'}
  $iconLocation=$icon+',0'
  $shell=New-Object -ComObject WScript.Shell
  foreach($entry in $links){
    if(!(Test-Path -LiteralPath $entry.Target)){throw ('快捷方式目标不存在：'+$entry.Target)}
    $link=$shell.CreateShortcut($entry.Path)
    $link.TargetPath=$entry.Target;$link.Arguments=$entry.Arguments;$link.WorkingDirectory=$root
    $link.Description='Codex Folia';$link.IconLocation=$iconLocation;$link.Save()
    if(!(Test-Path -LiteralPath $entry.Path)){throw ('无法创建快捷方式：'+$entry.Path)}
    $saved=$shell.CreateShortcut($entry.Path)
    if($saved.TargetPath -ine $entry.Target -or $saved.Arguments -cne $entry.Arguments -or $saved.WorkingDirectory -ine $root -or $saved.IconLocation -ine $iconLocation){throw ('快捷方式内容校验失败：'+$entry.Path)}
  }
  return $links.Count
}
