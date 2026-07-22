# Runs the repeatable local release-candidate verification for the current package version.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$package = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if ($package.version -notmatch '^\d+\.\d+\.\d+-rc\.\d+$') {
  throw "RC verification requires an -rc.N package version; found '$($package.version)'."
}

function Invoke-NpmScript([string]$script) {
  Write-Host "Running npm run $script..."
  & npm.cmd run $script
  if ($LASTEXITCODE -ne 0) {
    throw "npm run $script failed with exit code $LASTEXITCODE."
  }
}

Invoke-NpmScript 'build'
Invoke-NpmScript 'test:ci'
Invoke-NpmScript 'release:win'

$installer = Get-ChildItem -Path (Join-Path $root 'release') -Filter "NthTerm-$($package.version)-win-x64.exe" |
  Where-Object { $_.Name -notlike '*__uninstaller*' } |
  Select-Object -First 1
if (-not $installer) {
  throw "Missing RC installer for version $($package.version)."
}

& (Join-Path $PSScriptRoot 'validate-windows-installer.ps1')
if (-not $?) {
  throw 'Installer validation failed.'
}

Write-Host "RC verification passed for NthTerm $($package.version)."
