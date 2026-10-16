param([string]$AppDirectory='')
$ErrorActionPreference='Stop'
# Reuse the pinned official Node runtime, or fetch its archive and validate the published checksum.
if(!$AppDirectory){$AppDirectory=Join-Path $PSScriptRoot '..\app'}
$AppDirectory=[IO.Path]::GetFullPath($AppDirectory)
$version='24.18.0';$runtime=Join-Path $AppDirectory 'runtime';$node=Join-Path $runtime 'node.exe'
New-Item -ItemType Directory -Path $runtime -Force|Out-Null
if(Test-Path -LiteralPath $node){if((& $node --version) -ne ('v'+$version)){throw 'Unexpected bundled Node version.'};Write-Output $node;exit 0}
$local=Get-Command node.exe -ErrorAction SilentlyContinue
if($local){
  $identity=& $local.Source -p 'JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})' | ConvertFrom-Json
  if($identity.version -eq ('v'+$version) -and $identity.platform -eq 'win32' -and $identity.arch -eq 'x64'){
    Copy-Item -LiteralPath $local.Source -Destination $node -Force
    Write-Output $node;exit 0
  }
}
$downloads=Join-Path $PSScriptRoot '..\work\downloads'
New-Item -ItemType Directory -Path $downloads -Force|Out-Null
$name="node-v$version-win-x64.zip";$archive=Join-Path $downloads $name
$base="https://nodejs.org/dist/v$version"
Invoke-WebRequest -UseBasicParsing -Uri "$base/SHASUMS256.txt" -OutFile (Join-Path $downloads 'SHASUMS256.txt') -TimeoutSec 60
Invoke-WebRequest -UseBasicParsing -Uri "$base/$name" -OutFile $archive -TimeoutSec 60
$line=Get-Content -LiteralPath (Join-Path $downloads 'SHASUMS256.txt') | Where-Object {$_ -match ('\s+'+[regex]::Escape($name)+'$')}
if(!$line -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne (($line -split '\s+')[0]).ToLowerInvariant()){throw 'Node archive checksum mismatch.'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($archive)
try{[IO.Compression.ZipFileExtensions]::ExtractToFile($zip.GetEntry("node-v$version-win-x64/node.exe"),$node,$true)}finally{$zip.Dispose()}
if((& $node --version) -ne ('v'+$version)){throw 'Node version verification failed.'}
Write-Output $node
