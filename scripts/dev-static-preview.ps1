$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot "bootstrap-node.ps1")

$nodeDir = Join-Path $root ".tools\\node-v20.18.1-win-x64"
$nodeExe = Join-Path $nodeDir "node.exe"

$api = Join-Path $root "preview-static\\api.mjs"
$web = Join-Path $root "preview-static\\server.mjs"

function Test-PortInUse([int]$Port) {
  try {
    return (Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet)
  } catch {
    return $true
  }
}

$apiCandidates = @(4000, 4100, 4200)
$apiPort = $apiCandidates | Where-Object { -not (Test-PortInUse $_) } | Select-Object -First 1
if (-not $apiPort) { $apiPort = 4000 }
$webCandidates = @(3000, 3100, 3200, 3300)
$webPort = $webCandidates | Where-Object { -not (Test-PortInUse $_) } | Select-Object -First 1
if (-not $webPort) { $webPort = 3100 }

Write-Host "Iniciando API preview (porta $apiPort) em background..."
$env:API_PORT = "$apiPort"
Start-Process -FilePath $nodeExe -ArgumentList @($api) -WorkingDirectory (Join-Path $root "preview-static") -WindowStyle Hidden

Write-Host "Iniciando Web preview (porta $webPort) em foreground..."
$env:PORT = "$webPort"
& $nodeExe $web
