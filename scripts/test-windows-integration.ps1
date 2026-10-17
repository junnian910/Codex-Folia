param([string]$HelperPath='', [string]$TestRoot='')
$ErrorActionPreference='Stop'
if(!$HelperPath){$HelperPath=Join-Path $PSScriptRoot '..\app\windows-integration.ps1'}
if(!$TestRoot){$TestRoot=Join-Path ([IO.Path]::GetTempPath()) ('folia-windows-test-'+[guid]::NewGuid().ToString('N'))}
. $HelperPath
New-Item -ItemType Directory -Path $TestRoot -Force|Out-Null
$checks=[Collections.Generic.List[string]]::new()
function Assert-Folia($Name,$Pass){if(!$Pass){throw $Name};$checks.Add($Name);Write-Output ('PASS '+$Name)}
$nativeActivationError=$null
try{Invoke-FoliaAppActivation -AppId 'Folia.NotInstalled_0000000000000!App' -Arguments ''|Out-Null}catch{$nativeActivationError=$_.Exception}
Assert-Folia 'Windows activation API is callable without touching a protected EXE' ($nativeActivationError -and $nativeActivationError.ToString() -notmatch '0x80040154|0x80004002|Add-Type|Compiler')
$script:activationArguments=$null
function Invoke-FoliaAppActivation {param($AppId,$Arguments);$script:activationArguments=$Arguments;return 4321}
try{
  $argumentText='--remote-debugging-port=9338 --user-data-dir="D:\User Data\Folia"'
  $started=Start-FoliaCodexApplication -AppIds @('Registered.Codex!App') -ExecutablePaths @('X:\inaccessible\WindowsApps\Codex.exe') -Arguments $argumentText
  Assert-Folia 'registered app activation precedes protected executable access' ($started.Method -eq 'WindowsActivation' -and $started.ProcessId -eq 4321)
  Assert-Folia 'Windows activation preserves quoted launch arguments' ($script:activationArguments -ceq $argumentText)
}finally{. $HelperPath}
function Get-AppxPackage {param($Name,$ErrorAction);return @()}
function Get-StartApps {param($Name,$ErrorAction);return [pscustomobject]@{Name='Codex';AppID='OpenAI.Codex_fixture!App'}}
try{
  $registeredIds=@(Get-FoliaCodexAppIds)
  Assert-Folia 'start menu registration resolves Codex without reading WindowsApps files' ($registeredIds -contains 'OpenAI.Codex_fixture!App')
}finally{Remove-Item Function:\Get-AppxPackage;Remove-Item Function:\Get-StartApps}
function New-FoliaPackageFixture($Name,$Version,$Executable){
  $root=Join-Path $TestRoot $Name
  $exe=Join-Path $root $Executable
  New-Item -ItemType Directory -Path (Split-Path -Parent $exe),(Join-Path (Split-Path -Parent $exe) 'resources') -Force|Out-Null
  [IO.File]::WriteAllText($exe,'test fixture')
  [IO.File]::WriteAllText((Join-Path (Split-Path -Parent $exe) 'resources\app.asar'),'test fixture')
  [IO.File]::WriteAllText((Join-Path $root 'AppxManifest.xml'),('<Package><Applications><Application Id="App" Executable="'+$Executable.Replace('\','/')+'"/><Application Id="CodexCoreCommandRunner" Executable="app/resources/codex-command-runner.exe"/></Applications></Package>'))
  return [pscustomobject]@{InstallLocation=$root;Version=$Version;SignatureKind='Developer';Expected=$exe}
}
$old=New-FoliaPackageFixture '旧版 Codex' '1.0.0.0' 'app\ChatGPT.exe'
$new=New-FoliaPackageFixture '新版 Codex 中文目录' '2.0.0.0' 'desktop\DifferentCodexName.exe'
$paths=@(Get-FoliaPackageExecutables @($old,$new))
Assert-Folia 'manifest executable can use a different filename and directory' ($paths[0] -ieq $new.Expected)
Assert-Folia 'installed versions are ordered newest first' ($paths.IndexOf($old.Expected) -gt $paths.IndexOf($new.Expected))
Assert-Folia 'desktop detection accepts the manifest executable' (Test-FoliaCodexExecutable $new.Expected)
$cli=Join-Path $TestRoot 'CLI\codex.exe'
New-Item -ItemType Directory -Path (Split-Path -Parent $cli) -Force|Out-Null
[IO.File]::WriteAllText($cli,'test CLI')
Assert-Folia 'standalone CLI is not mistaken for the desktop app' (!(Test-FoliaCodexExecutable $cli))
Assert-Folia 'missing paths do not terminate discovery' (!(Test-FoliaCodexExecutable (Join-Path $TestRoot 'missing.exe')))
$script:fixturePackages=@($new)
function Get-AppxPackage {param($Name,$ErrorAction);return $script:fixturePackages}
try{
  $discovered=@(Find-FoliaCodexExecutables -PreferredPath (Join-Path $TestRoot 'removed-old-version.exe'))
  Assert-Folia 'stale saved path falls back to registered packages' ($discovered[0] -ieq $new.Expected)
  Assert-Folia 'package discovery is not restricted to Store signature type' ($discovered -contains $new.Expected)
  $preferred=@(Find-FoliaCodexExecutables -PreferredPath $old.Expected)
  Assert-Folia 'explicit desktop location is honored' ($preferred[0] -ieq $old.Expected)
}finally{Remove-Item Function:\Get-AppxPackage}
$install=Join-Path $TestRoot 'Folia 安装目录 With Spaces'
New-Item -ItemType Directory -Path $install -Force|Out-Null
foreach($name in @('launch.ps1','Repair-Shortcuts.ps1','Configure-AI.cmd','README.md','Uninstall.exe')){[IO.File]::WriteAllText((Join-Path $install $name),'test fixture')}
Copy-Item -LiteralPath (Join-Path (Split-Path -Parent $HelperPath) 'folia.ico') -Destination (Join-Path $install 'folia.ico')
$desktop=Join-Path $TestRoot '重定向的桌面\Desktop'
$programs=Join-Path $TestRoot 'Start Menu\Programs'
$count=New-FoliaShortcuts -InstallDirectory $install -DesktopDirectory $desktop -ProgramsDirectory $programs
Assert-Folia 'missing redirected desktop directory is created' (Test-Path -LiteralPath $desktop)
Assert-Folia 'desktop and start menu shortcuts are all created' ($count -eq 8 -and @(Get-ChildItem -LiteralPath $desktop,$programs -Recurse -Filter '*.lnk').Count -eq 8)
$shell=New-Object -ComObject WScript.Shell
$shortcut=$shell.CreateShortcut((Join-Path $desktop 'Codex Folia 背景.lnk'))
Assert-Folia 'desktop shortcut quotes the actual installation script' ($shortcut.Arguments.Contains('"'+(Join-Path $install 'launch.ps1')+'"'))
Assert-Folia 'desktop shortcut uses the installation working directory' ($shortcut.WorkingDirectory -ieq $install)
Assert-Folia 'PowerShell location comes from the Windows directory' ($shortcut.TargetPath -ieq (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'))
Assert-Folia 'desktop icon belongs to Folia and has no Codex version dependency' ($shortcut.IconLocation -ieq ((Join-Path $install 'folia.ico')+',0'))
$menu=Join-Path $programs 'Codex Folia'
$select=$shell.CreateShortcut((Join-Path $menu '重新选择 Codex.lnk'))
Assert-Folia 'manual Codex selection entry is present' ($select.Arguments.EndsWith(' -SelectCodex'))
$repair=$shell.CreateShortcut((Join-Path $menu '修复快捷方式.lnk'))
Assert-Folia 'shortcut repair entry uses the installed helper' ($repair.Arguments.Contains((Join-Path $install 'Repair-Shortcuts.ps1')))
$again=New-FoliaShortcuts -InstallDirectory $install -DesktopDirectory $desktop -ProgramsDirectory $programs
Assert-Folia 'repair can recreate existing shortcuts' ($again -eq 8)
Write-Output ('Windows integration checks passed: '+$checks.Count)
