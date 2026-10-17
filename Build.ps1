param([switch]$SkipAppBuild,[switch]$PrepareOnly,[switch]$CreateInstaller,[string]$AppDirectory='',[string]$NsisPath='',[string]$OutputDirectory='',[string]$PreparedAppDirectory='')
$ErrorActionPreference='Stop'
# Build from expanded, public source. Generated binaries and dependencies remain ignored by Git.
$projectRoot=$PSScriptRoot
$appRoot=if($AppDirectory){[IO.Path]::GetFullPath($AppDirectory)}elseif($PreparedAppDirectory){[IO.Path]::GetFullPath($PreparedAppDirectory)}else{Join-Path $projectRoot 'app'}
if($AppDirectory -and $PreparedAppDirectory){throw 'Choose AppDirectory or PreparedAppDirectory.'}
if($PreparedAppDirectory -and !$SkipAppBuild){throw '-PreparedAppDirectory requires -SkipAppBuild.'}
if(!$OutputDirectory){$OutputDirectory=Join-Path $projectRoot 'dist'}
$OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force|Out-Null
if(!$SkipAppBuild){
  $node=& (Join-Path $projectRoot 'packaging\Prepare-Runtime.ps1') -AppDirectory $appRoot
  $npm=(Get-Command npm.cmd -ErrorAction Stop).Source
  Push-Location $appRoot
  try{& $npm ci --ignore-scripts --omit=dev;if($LASTEXITCODE -ne 0){throw 'Backend dependency restore failed.'}}finally{Pop-Location}
  $sourceRoot=Join-Path $projectRoot 'source\folia'
  if(!(Test-Path -LiteralPath (Join-Path $sourceRoot 'package.json'))){throw 'Missing expanded source/folia source tree.'}
  $oldDist=$env:FOLIA_CODEX_DIST_DIR;$oldApi=$env:VITE_NETEASE_API_BASE
  Push-Location $sourceRoot
  try{
    & $npm ci --ignore-scripts
    if($LASTEXITCODE -ne 0){throw 'Frontend dependency restore failed.'}
    $env:FOLIA_CODEX_DIST_DIR=$appRoot;$env:VITE_NETEASE_API_BASE='/folia/api/netease'
    & $node node_modules/typescript/bin/tsc --noEmit
    if($LASTEXITCODE -ne 0){throw 'TypeScript check failed.'}
    & $node node_modules/vite/bin/vite.js build --config vite.codex.config.ts
    if($LASTEXITCODE -ne 0){throw 'Embedded build failed.'}
    & $node node_modules/vite/bin/vite.js build --base=/folia/ --emptyOutDir --outDir (Join-Path $appRoot 'web')
    if($LASTEXITCODE -ne 0){throw 'Web build failed.'}
  }finally{Pop-Location;$env:FOLIA_CODEX_DIST_DIR=$oldDist;$env:VITE_NETEASE_API_BASE=$oldApi}
  & (Join-Path $projectRoot 'packaging\Export-Source.ps1') -DestinationPath (Join-Path $appRoot 'source\folia-source.zip')
}else{$node=Join-Path $appRoot 'runtime\node.exe'}
& (Join-Path $appRoot 'launch.ps1') -Validate -SettingsPath (Join-Path $appRoot 'settings.example.json')
if($LASTEXITCODE -ne 0){throw 'Runtime validation failed.'}
if($PrepareOnly -or !$CreateInstaller){Write-Output 'Local application prepared; no installer was created.';return}
if(!$NsisPath){
  $compiler=Get-Command makensis.exe -ErrorAction SilentlyContinue
  if($compiler){$NsisPath=$compiler.Source}else{$NsisPath=Join-Path $env:LOCALAPPDATA 'electron-builder\Cache\nsis\nsis-3.0.4.1\makensis.exe'}
}
if(!(Test-Path -LiteralPath $NsisPath)){throw 'Install NSIS 3 or pass -NsisPath with makensis.exe.'}
& (Join-Path $projectRoot 'packaging\Write-Manifest.ps1') -AppDirectory $appRoot
& (Join-Path $appRoot 'launch.ps1') -Validate -SettingsPath (Join-Path $appRoot 'settings.example.json')
if($LASTEXITCODE -ne 0){throw 'Runtime validation failed.'}
$installer=Join-Path $OutputDirectory 'Codex-Folia-Setup-0.1.16-win-x64.exe'
& $NsisPath /V2 ('/DPAYLOAD='+$appRoot) ('/DOUTPUT='+$installer) (Join-Path $projectRoot 'packaging\installer.nsi')
if($LASTEXITCODE -ne 0){throw 'Installer build failed.'}
Get-FileHash -LiteralPath $installer -Algorithm SHA256 | Select-Object Hash,@{Name='File';Expression={Split-Path $_.Path -Leaf}}
