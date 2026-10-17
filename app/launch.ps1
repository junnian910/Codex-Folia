param([switch]$Stop,[switch]$ServiceOnly,[switch]$Validate,[switch]$InitializeOnly,[switch]$SelectCodex,[string]$SettingsPath='')
$ErrorActionPreference='Stop'
$launchStage='读取配置'
# Public launcher: use only this application's settings, never another application's .env.
trap {
  $message='启动失败（'+$launchStage+'）：'+$_.Exception.Message
  try{
    $errorRoot=if($runtimeRoot){$runtimeRoot}else{Join-Path $env:LOCALAPPDATA 'CodexFolia'}
    New-Item -ItemType Directory -Path $errorRoot -Force|Out-Null
    $errorLog=Join-Path $errorRoot 'launcher-error.log'
    [IO.File]::WriteAllText($errorLog,((Get-Date).ToString('s')+"`r`n"+$message),[Text.UTF8Encoding]::new($false))
    $message+="`r`n`r`n详细提示已保存：$errorLog"
  }catch{}
  if(!$Validate -and !$InitializeOnly){Add-Type -AssemblyName System.Windows.Forms;[Windows.Forms.MessageBox]::Show($message,'Codex Folia')|Out-Null}
  [Console]::Error.WriteLine($message)
  exit 1
}
$root=$PSScriptRoot
. (Join-Path $root 'windows-integration.ps1')
$node=Join-Path $root 'runtime\node.exe'
if(!(Test-Path -LiteralPath $node)){throw '缺少随附运行环境，请重新安装 Codex Folia。'}
if(!$SettingsPath){$SettingsPath=Join-Path $env:LOCALAPPDATA 'CodexFolia\settings.json'}
$SettingsPath=[IO.Path]::GetFullPath($SettingsPath)
$runtimeRoot=Split-Path -Parent $SettingsPath
$settings=@{cdpPort=9338;webPort=32110;cacheDirectory='';codexPath='';ai=@{baseUrl='';model='';apiKey=''}}
if(Test-Path -LiteralPath $SettingsPath){
  $saved=Get-Content -LiteralPath $SettingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach($key in @('cdpPort','webPort','cacheDirectory','codexPath','ai')){if($null -ne $saved.$key){$settings[$key]=$saved.$key}}
}
$cdpPort=[int]$settings.cdpPort;$webPort=[int]$settings.webPort
if($cdpPort -lt 1024 -or $cdpPort -gt 65535 -or $webPort -lt 1024 -or $webPort -gt 65535 -or $cdpPort -eq $webPort){throw 'settings.json 中的两个端口必须不同，且在 1024–65535 之间。'}
if($Validate){
  foreach($file in @('folia.ico','windows-integration.ps1','Repair-Shortcuts.ps1','server.mjs','cdp.mjs','direct-network.mjs','renderer.js','storage-scope.js','embedded-network.js','widgets.js','direct-drag.js','lyric-layout.js','integration.css','vendor\api\generate-theme_openai.js','embedded\folia.js','embedded\folia-major.css')){
    if(!(Test-Path -LiteralPath (Join-Path $root $file))){throw "缺少运行文件：$file"}
  }
  & $node --check (Join-Path $root 'server.mjs')
  if($LASTEXITCODE -ne 0){throw '运行脚本校验失败。'}
  if([int]((& $node --version).TrimStart('v').Split('.')[0]) -lt 24){throw '随附运行环境版本错误。'}
  Write-Output 'Codex Folia runtime verified.'
  exit 0
}
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
if(!(Test-Path -LiteralPath $SettingsPath)){
  [IO.File]::WriteAllText($SettingsPath,($settings|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
}
if($InitializeOnly){Write-Output 'Codex Folia settings initialized.';exit 0}
if($SelectCodex){
  $launchStage='选择 Codex 桌面程序'
  $selected=Select-FoliaCodexExecutable
  if($selected){$settings.codexPath=$selected;[IO.File]::WriteAllText($SettingsPath,($settings|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false));[Windows.Forms.MessageBox]::Show('Codex 位置已保存，请从桌面快捷方式重新打开。','Codex Folia')|Out-Null}
  exit 0
}
if($Stop){
  [IO.File]::WriteAllText((Join-Path $runtimeRoot '.stop-request'),'stop')
  exit 0
}

$codexCandidates=@()
$codexAppIds=@()
if(!$ServiceOnly){
  $launchStage='查找 Codex 桌面程序'
  $codexAppIds=@(Get-FoliaCodexAppIds)
  $codexCandidates=@(Find-FoliaCodexExecutables -PreferredPath ([string]$settings.codexPath))
  if(!$codexCandidates.Count -and !$codexAppIds.Count){
    $selected=Select-FoliaCodexExecutable
    if(!$selected){throw '未找到 Codex 桌面程序。请先安装官方 Codex，或运行安装目录中的 Select-Codex.cmd 重新选择其 EXE。'}
    $settings.codexPath=$selected
    [IO.File]::WriteAllText($SettingsPath,($settings|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
    $codexCandidates=@($selected)
  }
  foreach($listener in @(Get-NetTCPConnection -State Listen -LocalPort $cdpPort -ErrorAction SilentlyContinue)){
    $owner=Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if(!$owner -or (!(Test-FoliaCodexExecutable $owner.Path) -and $codexCandidates -notcontains $owner.Path)){throw "调试端口 $cdpPort 已被其他程序使用，请在 settings.json 修改 cdpPort。"}
    $codexCandidates=@($owner.Path)+@($codexCandidates|Where-Object {$_ -ine $owner.Path})
  }
}

# Separate generated backend identity and all logs from both the installation and other players.
$backendTemp=Join-Path $runtimeRoot 'backend-temp'
New-Item -ItemType Directory -Path $backendTemp -Force | Out-Null
$previousTemp=$env:TEMP;$previousTmp=$env:TMP
$env:TEMP=$backendTemp;$env:TMP=$backendTemp
$env:FOLIA_CODEX_DATA_DIR=$runtimeRoot
$env:FOLIA_CODEX_CDP_PORT="$cdpPort";$env:FOLIA_CODEX_PORT="$webPort"
$env:FOLIA_CODEX_CACHE_DIR=if($settings.cacheDirectory){[Environment]::ExpandEnvironmentVariables([string]$settings.cacheDirectory)}else{Join-Path $runtimeRoot 'Cache'}
$env:FOLIA_CODEX_AI_URL=[string]$settings.ai.baseUrl
$env:FOLIA_CODEX_AI_MODEL=[string]$settings.ai.model
$env:FOLIA_CODEX_AI_KEY=[string]$settings.ai.apiKey
$env:NO_PROXY='localhost,127.0.0.1,::1'

$connection=& $node (Join-Path $root 'cdp.mjs') --probe $cdpPort | ConvertFrom-Json
$debugReady=$connection.ready
$hash=[Security.Cryptography.SHA256]::Create()
try{$instanceId=([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.Replace([char]92,[char]47).ToLowerInvariant())))).Replace('-','').ToLowerInvariant().Substring(0,16)}finally{$hash.Dispose()}
$serviceReady=$false
try{
  $health=Invoke-RestMethod -Uri "http://127.0.0.1:$webPort/integration/health" -TimeoutSec 2
  if($health.app -ne 'Folia in Codex' -or $health.instanceId -ne $instanceId){throw 'Different service'}
  $serviceReady=$true
}catch{
  if(Get-NetTCPConnection -State Listen -LocalPort $webPort -ErrorAction SilentlyContinue){throw "端口 $webPort 已有其他服务。请先关闭其他 Folia 接入，或修改 settings.json 的 webPort。"}
}
if(!$serviceReady){
  $launchStage='启动播放器服务'
  $stdout=Join-Path $runtimeRoot 'server.log';$stderr=Join-Path $runtimeRoot 'server-error.log'
  Start-Process -FilePath $node -ArgumentList ('"'+(Join-Path $root 'server.mjs')+'"') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null
  $deadline=(Get-Date).AddSeconds(15)
  do{
    Start-Sleep -Milliseconds 250
    try{$health=Invoke-RestMethod -Uri "http://127.0.0.1:$webPort/integration/health" -TimeoutSec 1;$serviceReady=$health.app -eq 'Folia in Codex' -and $health.instanceId -eq $instanceId}catch{}
  }while(!$serviceReady -and (Get-Date) -lt $deadline)
  if(!$serviceReady){throw "背景服务启动失败，请查看 $stderr"}
}
foreach($key in @('FOLIA_CODEX_AI_URL','FOLIA_CODEX_AI_MODEL','FOLIA_CODEX_AI_KEY')){[Environment]::SetEnvironmentVariable($key,$null,'Process')}
$env:TEMP=$previousTemp;$env:TMP=$previousTmp
[IO.File]::WriteAllText((Join-Path $runtimeRoot '.enable-request'),'enable')
if(!$ServiceOnly -and !$debugReady){
  $launchStage='启动 Codex'
  $profile=Join-Path $runtimeRoot 'profile'
  New-Item -ItemType Directory -Path $profile -Force|Out-Null
  $codexArguments='--remote-debugging-address=127.0.0.1 --remote-debugging-port='+$cdpPort+' --user-data-dir="'+$profile+'"'
  Start-FoliaCodexApplication -AppIds $codexAppIds -ExecutablePaths $codexCandidates -Arguments $codexArguments|Out-Null
  $launchStage='连接 Codex 本机接口'
  $deadline=(Get-Date).AddSeconds(30)
  do{Start-Sleep -Milliseconds 500;$connection=& $node (Join-Path $root 'cdp.mjs') --probe $cdpPort | ConvertFrom-Json;$debugReady=$connection.ready}while(!$debugReady -and (Get-Date) -lt $deadline)
  if(!$debugReady){throw '背景服务已启动，但 Codex 窗口未就绪。请保存草稿并关闭 Codex，再从 Codex Folia 快捷方式重试。'}
}
Write-Output 'Codex Folia started.'
