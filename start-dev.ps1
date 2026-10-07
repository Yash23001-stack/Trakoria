param(
    [switch]$UseSmokeDb
)

$ErrorActionPreference = "Stop"

function Assert-PathExists($Path, $Message) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw $Message
    }
}

function Assert-PortAvailable($Port, $Name) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        $owners = ($connection | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
        throw "$Name port $Port is already in use by process id(s): $owners. Stop the existing process or change the port before running this script."
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $Root "frontend"
$BackendApp = Join-Path $Root "backend\api.py"
$FrontendPackage = Join-Path $FrontendDir "package.json"
$EnvFile = Join-Path $Root ".env"
$LogDir = Join-Path $Root ".trakoria\logs"

Assert-PathExists $BackendApp "Missing backend\api.py. Run this script from the Trakoria repository root."
Assert-PathExists $FrontendPackage "Missing frontend\package.json. Run npm install inside frontend before starting."
Assert-PathExists (Join-Path $FrontendDir "node_modules") "Missing frontend\node_modules. Run: cd frontend; npm install"
Assert-PathExists $EnvFile "Missing .env. Backend PIN/Bot configuration will not load without it."

Assert-PortAvailable 8000 "FastAPI backend"
Assert-PortAvailable 5175 "Vite frontend"

New-Item -ItemType Directory -Force $LogDir | Out-Null

$BackendLog = Join-Path $LogDir "backend.log"
$FrontendLog = Join-Path $LogDir "frontend.log"
$backendEnv = ""
if ($UseSmokeDb) {
    $smokeDb = Join-Path $Root ".trakoria\dev-smoke.db"
    $backendEnv = "`$env:TRAKORIA_DB_PATH='$smokeDb'; "
    Write-Host "Using isolated smoke database: $smokeDb"
}

$backendCommand = "cd '$Root'; ${backendEnv}uvicorn backend.api:app --reload *> '$BackendLog'"
$frontendCommand = "cd '$FrontendDir'; npm.cmd run dev *> '$FrontendLog'"

$backend = Start-Process powershell -ArgumentList "-NoProfile", "-Command", $backendCommand -WorkingDirectory $Root -PassThru -WindowStyle Hidden
$frontend = Start-Process powershell -ArgumentList "-NoProfile", "-Command", $frontendCommand -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden

Write-Host "Trakoria local development started."
Write-Host "Backend:  http://127.0.0.1:8000  PID $($backend.Id)"
Write-Host "Frontend: http://localhost:5175    PID $($frontend.Id)"
Write-Host "Backend log:  $BackendLog"
Write-Host "Frontend log: $FrontendLog"
Write-Host "Stop with: Stop-Process -Id $($backend.Id),$($frontend.Id)"
