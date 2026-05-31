<#
.SYNOPSIS
    GatePass - one-shot setup and deploy script.

.DESCRIPTION
    1. Checks prerequisites (Docker, Docker Compose v2)
    2. Creates .env from .env.example if missing, with secret prompts
    3. Optionally tears down existing containers (-Down)
    4. Builds images and starts all services in detached mode
    5. Polls the API health endpoint to confirm a successful deploy
    6. Optionally follows logs after startup (-Logs)

.PARAMETER Build
    Force a full image rebuild even if containers are already up.

.PARAMETER Down
    Stop and remove all containers before redeploying.

.PARAMETER Logs
    Tail container logs after a successful deployment.

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Build
    .\deploy.ps1 -Down -Build
    .\deploy.ps1 -Logs
#>
param(
    [switch]$Build,
    [switch]$Down,
    [switch]$Logs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK([string]$msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "    [!]  $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "    [X]  $msg" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------

Write-Step 'Checking prerequisites'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail 'Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop'
    exit 1
}

$dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
if (-not $dockerVersion) {
    Write-Fail 'Docker daemon is not running. Start Docker Desktop and try again.'
    exit 1
}
Write-OK "Docker $dockerVersion"

$composeVersion = docker compose version --short 2>$null
if (-not $composeVersion) {
    Write-Fail 'Docker Compose v2 not found. Update Docker Desktop to a recent version.'
    exit 1
}
Write-OK "Docker Compose $composeVersion"

# ---------------------------------------------------------------------------
# 2. .env setup
# ---------------------------------------------------------------------------

Write-Step 'Checking environment file'

$envFile    = Join-Path $PSScriptRoot '.env'
$envExample = Join-Path $PSScriptRoot '.env.example'

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
        Write-Fail '.env.example not found -- cannot create .env'
        exit 1
    }

    Write-Warn '.env not found -- creating from .env.example'
    Copy-Item $envExample $envFile

    Write-Host ''
    Write-Host '    GatePass needs a few secrets to run securely.' -ForegroundColor White
    Write-Host '    Press Enter to keep the default (dev-only) value.' -ForegroundColor DarkGray
    Write-Host ''

    $dbPass = Read-Host '    Postgres password [visitor_pass]'
    if ([string]::IsNullOrWhiteSpace($dbPass)) { $dbPass = 'visitor_pass' }

    $envContent = Get-Content $envFile -Raw
    $envContent = $envContent -replace '(?m)^POSTGRES_PASSWORD=.*$', "POSTGRES_PASSWORD=$dbPass"
    $envContent = $envContent -replace '(?m)^DATABASE_URL=.*$', "DATABASE_URL=postgresql://visitor_admin:$dbPass@postgres:5432/visitor_management"
    [System.IO.File]::WriteAllText($envFile, $envContent, [System.Text.Encoding]::UTF8)

    Write-OK '.env created'
} else {
    Write-OK '.env already exists -- skipping secret prompts'
}

# ---------------------------------------------------------------------------
# 3. Optional teardown
# ---------------------------------------------------------------------------

if ($Down) {
    Write-Step 'Stopping and removing existing containers'
    docker compose down --remove-orphans
    if ($LASTEXITCODE -ne 0) { Write-Warn "docker compose down exited $LASTEXITCODE" }
    Write-OK 'Containers removed'
}

# ---------------------------------------------------------------------------
# 4. Build and start
# ---------------------------------------------------------------------------

Write-Step 'Building and starting GatePass'

$upArgs = @('compose', 'up', '--detach', '--remove-orphans')
if ($Build -or $Down) { $upArgs += '--build' }

& docker @upArgs
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose up failed (exit $LASTEXITCODE)"
    Write-Host ''
    Write-Host '    Run: docker compose logs' -ForegroundColor DarkGray
    exit $LASTEXITCODE
}
Write-OK 'Containers started'

# ---------------------------------------------------------------------------
# 5. Health check
# ---------------------------------------------------------------------------

Write-Step 'Waiting for API to be healthy'

$apiUrl     = 'http://localhost:4001/health'
$maxSeconds = 60
$elapsed    = 0
$healthy    = $false

while ($elapsed -lt $maxSeconds) {
    try {
        $resp = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        # still starting up
    }

    Start-Sleep -Seconds 2
    $elapsed += 2
    Write-Host "    ... ${elapsed}s" -ForegroundColor DarkGray
}

if ($healthy) {
    Write-OK 'API is healthy'
} else {
    Write-Warn "API did not become healthy within ${maxSeconds}s"
    Write-Host '    Run: docker compose ps' -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------------------------

Write-Host ''
Write-Host '  GatePass is running:' -ForegroundColor White
Write-Host '    Security dashboard  ->  http://localhost:5173' -ForegroundColor Green
Write-Host '    Resident portal     ->  http://localhost:5174' -ForegroundColor Green
Write-Host '    API Gateway         ->  http://localhost:4001' -ForegroundColor Green
Write-Host ''
Write-Host '  Useful commands:' -ForegroundColor DarkGray
Write-Host '    docker compose ps          - show container status' -ForegroundColor DarkGray
Write-Host '    docker compose logs -f     - follow all logs' -ForegroundColor DarkGray
Write-Host '    docker compose down        - stop everything' -ForegroundColor DarkGray
Write-Host ''

# ---------------------------------------------------------------------------
# 7. Optional log tail
# ---------------------------------------------------------------------------

if ($Logs) {
    Write-Step 'Tailing logs (Ctrl+C to stop)'
    docker compose logs --follow
}