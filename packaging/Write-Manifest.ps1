param([string]$AppDirectory='')
$ErrorActionPreference='Stop'
# Manifest both the packaged content and its precise uninstall file list.
if(!$AppDirectory){$AppDirectory=Join-Path $PSScriptRoot '..\app'};$appRoot=[IO.Path]::GetFullPath($AppDirectory)
$files=@(Get-ChildItem -LiteralPath $appRoot -Recurse -File | Where-Object {$_.Name -ne 'package-manifest.json'})
$manifest=@($files|Sort-Object FullName|ForEach-Object{
  [ordered]@{path=$_.FullName.Substring($appRoot.Length+1).Replace([char]92,[char]47);bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
})
[IO.File]::WriteAllText((Join-Path $appRoot 'package-manifest.json'),($manifest|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
$commands=[Collections.Generic.List[string]]::new()
foreach($file in @($files.FullName)+@(Join-Path $appRoot 'package-manifest.json')){
  $relative=$file.Substring($appRoot.Length+1).Replace('$','$$')
  $commands.Add('Delete "$INSTDIR\'+$relative+'"')
}
foreach($dir in @(Get-ChildItem -LiteralPath $appRoot -Recurse -Directory|Sort-Object {$_.FullName.Length} -Descending)){
  $commands.Add('RMDir "$INSTDIR\'+$dir.FullName.Substring($appRoot.Length+1).Replace('$','$$')+'"')
}
[IO.File]::WriteAllLines((Join-Path $PSScriptRoot 'uninstall-files.nsh'),$commands,[Text.UTF8Encoding]::new($false))
