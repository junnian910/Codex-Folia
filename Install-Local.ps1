param([string]$InstallDirectory='', [string]$PreparedAppDirectory='', [switch]$NoShortcuts, [switch]$Start)
$ErrorActionPreference='Stop'
$project=$PSScriptRoot
if(!$InstallDirectory){$InstallDirectory=if(Test-Path -LiteralPath 'E:\'){ 'E:\Program Files\Codex Folia' }else{Join-Path $env:LOCALAPPDATA 'Programs\Codex Folia'}}
$destination=[IO.Path]::GetFullPath($InstallDirectory).TrimEnd([char]92)
if($destination -eq [IO.Path]::GetPathRoot($destination).TrimEnd([char]92) -or $destination -ieq $project -or $destination.StartsWith($project+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Choose a separate application folder, not a drive root or the source checkout.'}
if((Test-Path -LiteralPath $destination) -and @(Get-ChildItem -LiteralPath $destination -Force).Count -and !(Test-Path -LiteralPath (Join-Path $destination 'codex-folia.install'))){throw 'This folder contains an existing installation without an ownership marker. Preserve it and choose an empty folder, or let Codex inspect and migrate it first.'}
if(Test-Path -LiteralPath (Join-Path $destination 'launch.ps1')){
  $port=32110
  $settingsFile=Join-Path $env:LOCALAPPDATA 'CodexFolia\settings.json'
  if(Test-Path -LiteralPath $settingsFile){$savedSettings=Get-Content -LiteralPath $settingsFile -Raw -Encoding UTF8|ConvertFrom-Json;if($savedSettings.webPort){$port=[int]$savedSettings.webPort}}
  $running=$null
  try{$running=Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/integration/health" -f $port) -TimeoutSec 2}catch{}
  if($running){
    $hash=[Security.Cryptography.SHA256]::Create()
    try{$expected=([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($destination.Replace([char]92,[char]47).ToLowerInvariant())))).Replace('-','').ToLowerInvariant().Substring(0,16)}finally{$hash.Dispose()}
    if($running.app -ne 'Folia in Codex' -or $running.instanceId -ne $expected){throw 'A different Folia installation is running. Preserve it; stop it through its own entry before updating this folder.'}
    $nativePowerShell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    & $nativePowerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $destination 'launch.ps1') -Stop
    if($LASTEXITCODE -ne 0){throw 'Could not stop the previous Folia service.'}
    Start-Sleep -Seconds 2
  }
}
New-Item -ItemType Directory -Path $destination -Force|Out-Null
foreach($file in Get-ChildItem -LiteralPath (Join-Path $project 'app') -File){
  if($file.Name -notmatch '^(settings\.json|package-manifest\.json)$' -and $file.Extension -ne '.log'){Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $destination $file.Name) -Force}
}
foreach($name in @('vendor','licenses')){Copy-Item -LiteralPath (Join-Path $project ('app\'+$name)) -Destination $destination -Recurse -Force}
if($PreparedAppDirectory){
  $prepared=[IO.Path]::GetFullPath($PreparedAppDirectory)
  foreach($name in @('runtime','embedded','web','node_modules','source')){
    if(!(Test-Path -LiteralPath (Join-Path $prepared $name))){throw ('Missing prepared application directory: '+$name)}
    Copy-Item -LiteralPath (Join-Path $prepared $name) -Destination $destination -Recurse -Force
  }
  & (Join-Path $project 'Build.ps1') -PrepareOnly -SkipAppBuild -AppDirectory $destination
}else{
  if(!(Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw 'Node.js 24 with npm is required for a source installation. Ask Codex to prepare the toolchain, then rerun this script.'}
  & (Join-Path $project 'Build.ps1') -PrepareOnly -AppDirectory $destination
}
if($LASTEXITCODE -ne 0){throw 'Local build failed.'}
[IO.File]::WriteAllText((Join-Path $destination 'codex-folia.install'),'Codex Folia source installation',[Text.UTF8Encoding]::new($false))
if(!$NoShortcuts){. (Join-Path $destination 'windows-integration.ps1');$count=New-FoliaShortcuts -InstallDirectory $destination;Write-Output ("Created and verified {0} shortcuts with the local Folia icon." -f $count)}
if($Start){Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"'+(Join-Path $destination 'launch.ps1')+'"')) -WorkingDirectory $destination -WindowStyle Hidden|Out-Null}
Write-Output ('Installed from source: '+$destination)
