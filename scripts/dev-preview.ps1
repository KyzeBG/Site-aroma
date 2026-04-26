$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot "bootstrap-node.ps1")

if (-not (Test-Path (Join-Path $root "apps\\api\\.env"))) {
  Copy-Item (Join-Path $root "apps\\api\\.env.example") (Join-Path $root "apps\\api\\.env") -Force
}

if (-not (Test-Path (Join-Path $root "apps\\web\\.env"))) {
  Copy-Item (Join-Path $root "apps\\web\\.env.example") (Join-Path $root "apps\\web\\.env") -Force
}

$webEnv = Join-Path $root "apps\\web\\.env"
$webEnvContent = Get-Content $webEnv -Raw
if ($webEnvContent -notmatch "NEXT_PUBLIC_API_BASE_URL") {
  Add-Content -Path $webEnv -Value "`nNEXT_PUBLIC_API_BASE_URL=http://localhost:4000"
}
if ($webEnvContent -notmatch "API_INTERNAL_BASE_URL") {
  Add-Content -Path $webEnv -Value "`nAPI_INTERNAL_BASE_URL=http://localhost:4000"
}

Write-Host "Instalando dependências (workspaces)..."
Push-Location $root
& npm.cmd install
Pop-Location

Write-Host "Iniciando API preview em background (porta 4000)..."
Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev:preview") -WorkingDirectory (Join-Path $root "apps\\api") -WindowStyle Hidden

Write-Host "Iniciando Web em foreground (porta 3000)..."
Push-Location (Join-Path $root "apps\\web")
& npm.cmd run dev
Pop-Location

