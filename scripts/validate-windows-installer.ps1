# Validates unsigned Windows NSIS install, launch, reinstall, and AppData preservation.
# Prerequisite: npm run release:win (produces release/NthTerm-*-win-x64.exe)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Get-Sha256([string]$path) {
  $getFileHash = Get-Command Get-FileHash -ErrorAction SilentlyContinue
  if ($getFileHash) {
    return (Get-FileHash $path -Algorithm SHA256).Hash
  }

  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.File]::OpenRead($path)
  try {
    return ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '')
  }
  finally {
    $stream.Dispose()
    $sha256.Dispose()
  }
}

$installer = Get-ChildItem -Path (Join-Path $root 'release') -Filter 'NthTerm-*-win-x64.exe' |
  Where-Object { $_.Name -notlike '*__uninstaller*' } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $installer) {
  throw 'No NSIS installer found under release/. Run npm run release:win first.'
}

$installDir = Join-Path $env:LOCALAPPDATA 'Programs\NthTerm'
$exe = Join-Path $installDir 'NthTerm.exe'
$appDataDir = Join-Path $env:APPDATA 'NthTerm'
$sqlite = Join-Path $appDataDir 'nthterm.sqlite'
$marker = Join-Path $appDataDir 'nthterm-task6-marker.txt'
$resultPath = Join-Path $root 'release\task6-installer-validation.json'

New-Item -ItemType Directory -Force -Path $appDataDir | Out-Null

$beforeHash = if (Test-Path $sqlite) { Get-Sha256 $sqlite } else { $null }
"task6-marker $(Get-Date -Format o)" | Set-Content -Encoding utf8 $marker
$markerBefore = Get-Content $marker -Raw

Write-Host "Installer: $($installer.FullName)"
Unblock-File -Path $installer.FullName -ErrorAction SilentlyContinue

Write-Host 'Installing (silent /S)...'
$install = Start-Process -FilePath $installer.FullName -ArgumentList '/S' -PassThru -Wait
if ($install.ExitCode -ne 0) { throw "Installer exited $($install.ExitCode)" }
if (-not (Test-Path $exe)) { throw "Installed exe missing at $exe" }

Write-Host 'Launch smoke...'
$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 8
if ($proc.HasExited) { throw "Installed app exited early code=$($proc.ExitCode)" }

Start-Sleep -Seconds 3
$afterLaunchHash = if (Test-Path $sqlite) { Get-Sha256 $sqlite } else { $null }
$children = @(Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id })
$hasConhost = $children | Where-Object { $_.Name -eq 'conhost.exe' }

Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Get-Process NthTerm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host 'Reinstall / upgrade (silent /S)...'
$reinstall = Start-Process -FilePath $installer.FullName -ArgumentList '/S' -PassThru -Wait
if ($reinstall.ExitCode -ne 0) { throw "Reinstall exited $($reinstall.ExitCode)" }
if (-not (Test-Path $exe)) { throw "Exe missing after reinstall at $exe" }
if (-not (Test-Path $sqlite)) { throw "SQLite missing after reinstall at $sqlite" }

$markerAfter = Get-Content $marker -Raw
if ($markerAfter -ne $markerBefore) {
  throw 'AppData marker was not preserved across reinstall.'
}

$afterReinstallHash = Get-Sha256 $sqlite

$proc2 = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 8
if ($proc2.HasExited) { throw "App exited after upgrade code=$($proc2.ExitCode)" }
Stop-Process -Id $proc2.Id -Force -ErrorAction SilentlyContinue
Get-Process NthTerm -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$result = [pscustomobject]@{
  Installer = $installer.Name
  InstallerExit = $install.ExitCode
  ReinstallExit = $reinstall.ExitCode
  InstallPath = $exe
  FirstLaunchAlive = $true
  PostUpgradeAlive = $true
  ConhostObserved = [bool]$hasConhost
  SqliteBeforeHash = $beforeHash
  SqliteAfterLaunchHash = $afterLaunchHash
  SqliteAfterReinstallHash = $afterReinstallHash
  MarkerPreserved = $true
  SqlitePath = $sqlite
}

$result | ConvertTo-Json -Depth 3 | Set-Content -Encoding utf8 $resultPath
$result | Format-List
Write-Host "Wrote $resultPath"
Write-Host 'Task 6 installer validation passed.'
