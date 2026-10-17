param([string]$DestinationPath='')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
# Only source files enter the installed corresponding-source archive.
$sourceRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\source\folia'))
$destination=if($DestinationPath){[IO.Path]::GetFullPath($DestinationPath)}else{Join-Path $PSScriptRoot '..\app\source\folia-source.zip'}
New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force|Out-Null
$paths=$null
if(Get-Command git -ErrorAction SilentlyContinue){
  $inside=& git -C $sourceRoot rev-parse --is-inside-work-tree 2>$null
  if($LASTEXITCODE -eq 0 -and $inside -eq 'true'){$paths=& git -C $sourceRoot -c core.quotepath=false ls-files --cached --others --exclude-standard}
}
if($null -eq $paths){
  $paths=[Collections.Generic.List[string]]::new()
  function Collect-Source($directory){
    foreach($entry in Get-ChildItem -LiteralPath $directory -Force){
      if($entry.PSIsContainer){if($entry.Name -notmatch '^(node_modules|dist|release|dev-dist|original|reference|models|test-results|playwright-report|\.git|\.codex|\.agents|\.dev-credentials|\.vercel|\.wrangler)$'){Collect-Source $entry.FullName}}
      else{$paths.Add($entry.FullName.Substring($sourceRoot.Length+1).Replace([char]92,[char]47))}
    }
  }
  Collect-Source $sourceRoot
}
$buffer=[IO.MemoryStream]::new();$zip=[IO.Compression.ZipArchive]::new($buffer,[IO.Compression.ZipArchiveMode]::Create,$true)
$count=0
try{
  foreach($relative in ($paths|Sort-Object -Unique)){
    if($relative -match '(^|/)(\.git|\.dev-credentials|node_modules|dist|release|test-results|original|reference)(/|$)' -or $relative -match '(^|/)\.env(?!\.example$)' -or $relative -match '\.(log|local)$'){continue}
    $file=Join-Path $sourceRoot $relative
    if(!(Test-Path -LiteralPath $file -PathType Leaf)){continue}
    $entry=$zip.CreateEntry($relative,[IO.Compression.CompressionLevel]::Optimal)
    $output=$entry.Open()
    try{$bytes=[IO.File]::ReadAllBytes($file);$output.Write($bytes,0,$bytes.Length)}finally{$output.Dispose()}
    $count++
  }
}finally{$zip.Dispose()}
try{[IO.File]::WriteAllBytes($destination,$buffer.ToArray())}finally{$buffer.Dispose()}
Write-Output ("Corresponding source files: {0}" -f $count)
