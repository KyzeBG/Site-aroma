$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $root ".tools"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$nodeVersion = $env:NODE_PORTABLE_VERSION
if (-not $nodeVersion) { $nodeVersion = "20.18.1" }

$zipName = "node-v$nodeVersion-win-x64.zip"
$zipPath = Join-Path $toolsDir $zipName
$extractDir = Join-Path $toolsDir "node-v$nodeVersion-win-x64"

if (-not (Test-Path (Join-Path $extractDir "node.exe"))) {
  $url = "https://nodejs.org/dist/v$nodeVersion/$zipName"
  Write-Host "Baixando Node.js portátil: $url"
  Invoke-WebRequest -Uri $url -OutFile $zipPath
  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
  Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
}

$env:Path = "$extractDir;$env:Path"
Write-Host "Node pronto: $extractDir"
& node.exe -v
& npm.cmd -v

