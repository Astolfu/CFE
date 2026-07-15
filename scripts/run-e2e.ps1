#!powershell
# Script para levantar backend y frontend y ejecutar los tests E2E (PowerShell)
param(
    [int]$BackendPort = 3001,
    [int]$FrontendPort = 5173
)

Write-Host "Iniciando backend..."
# Usar npm.cmd para compatibilidad en Windows
$backendProc = Start-Process -FilePath npm.cmd -ArgumentList 'run','dev' -WorkingDirectory "$PSScriptRoot\..\backend" -PassThru -NoNewWindow

Write-Host "Iniciando frontend..."
$frontendProc = Start-Process -FilePath npm.cmd -ArgumentList 'run','dev' -WorkingDirectory "$PSScriptRoot\.." -PassThru -NoNewWindow

function Wait-ForUrl($url, $timeoutSec = 30) {
    $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSec)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -Method GET -TimeoutSec 3 -ErrorAction Stop
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { return $true }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Host "Esperando backend en http://localhost:$BackendPort/health ..."
if (-not (Wait-ForUrl "http://localhost:$BackendPort/health" 40)) {
    Write-Host "Backend no respondió en el tiempo esperado. Revisa logs." -ForegroundColor Red
    exit 1
}

Write-Host "Esperando frontend en http://localhost:$FrontendPort/ ..."
if (-not (Wait-ForUrl "http://localhost:$FrontendPort/" 40)) {
    Write-Host "Frontend no respondió en el tiempo esperado. Revisa logs." -ForegroundColor Red
    exit 1
}

Write-Host "Ambos servicios arriba. Ejecutando tests Playwright..."

# Ejecutar playwright tests (se ejecutan en serie)
npx playwright test --reporter=list
$exitCode = $LASTEXITCODE

Write-Host "Tests finalizados con código: $exitCode"

Write-Host "Deteniendo procesos iniciados..."
if ($backendProc) { Stop-Process -Id $backendProc.Id -Force }
if ($frontendProc) { Stop-Process -Id $frontendProc.Id -Force }

exit $exitCode
