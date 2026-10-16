param([switch]$NoUI)
$ErrorActionPreference='Stop'
try{
  . (Join-Path $PSScriptRoot 'windows-integration.ps1')
  $count=New-FoliaShortcuts -InstallDirectory $PSScriptRoot
  Write-Output "Created and verified $count shortcuts."
  if(!$NoUI){Add-Type -AssemblyName System.Windows.Forms;[Windows.Forms.MessageBox]::Show('桌面和开始菜单快捷方式已重新创建。','Codex Folia')|Out-Null}
  exit 0
}catch{
  [Console]::Error.WriteLine($_.Exception.Message)
  if(!$NoUI){Add-Type -AssemblyName System.Windows.Forms;[Windows.Forms.MessageBox]::Show($_.Exception.Message,'Codex Folia')|Out-Null}
  exit 1
}
