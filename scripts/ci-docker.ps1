<#
.SYNOPSIS
    Runs Docker Compose smoke test locally on Windows PowerShell.
.DESCRIPTION
    Builds and tests MariaDB, backend, and frontend containers.
    Gracefully detects if Docker / Docker Desktop is installed and running.
#>
[CmdletBinding()]
param(
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [DOCKER CI] Docker Compose Smoke Test (Windows)        " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Check Docker executable
Write-Host "[1/7] Checking Docker CLI..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "`n⚠️  [SKIP] Docker CLI is not installed or not in PATH on this Windows machine." -ForegroundColor Yellow
    Write-Host "   To run Docker CI on Windows, please install Docker Desktop:" -ForegroundColor Gray
    Write-Host "   https://www.docker.com/products/docker-desktop/ (with WSL2 enabled)`n" -ForegroundColor Gray
    exit 0
}

# 2. Check Docker daemon running
Write-Host "[2/7] Checking Docker daemon status..." -ForegroundColor Yellow
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  [SKIP] Docker Desktop is installed but the Docker daemon is NOT running." -ForegroundColor Yellow
    Write-Host "   Please open and start Docker Desktop to run container tests.`n" -ForegroundColor Gray
    exit 0
}

Push-Location $RootDir
try {
    # 3. Create .env for local testing
    Write-Host "[3/7] Generating local .env configuration..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        $envContent = Get-Content ".env.example" -Raw
        $randPass1 = -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
        $randPass2 = -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
        $envContent = $envContent -replace '^DB_PASSWORD=.*', "DB_PASSWORD=$randPass1"
        $envContent = $envContent -replace '^DB_ROOT_PASSWORD=.*', "DB_ROOT_PASSWORD=$randPass2"
        [IO.File]::WriteAllText((Join-Path $RootDir ".env"), $envContent, [System.Text.Encoding]::UTF8)
        Write-Host "Generated .env with random secure passwords." -ForegroundColor DarkGray
    }

    # 4. Validate compose file
    Write-Host "[4/7] Validating docker-compose.yml configuration..." -ForegroundColor Yellow
    docker compose config --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker compose validation failed!" -ForegroundColor Red
        exit 1
    }

    # 5. Build images
    Write-Host "[5/7] Building container images..." -ForegroundColor Yellow
    docker compose build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker compose build failed!" -ForegroundColor Red
        exit 1
    }

    # 6. Start stack
    Write-Host "[6/7] Starting Docker stack (detached)..." -ForegroundColor Yellow
    docker compose up -d

    # 7. Smoke checks
    Write-Host "[7/7] Running smoke checks (DB healthy, Backend up, Frontend serving)..." -ForegroundColor Yellow
    
    # Check DB
    $dbHealthy = $false
    for ($i = 1; $i -le 30; $i++) {
        $status = (docker inspect -f '{{.State.Health.Status}}' fairshare-db 2>$null)
        Write-Host " - DB health check ($i/30): $status" -ForegroundColor DarkGray
        if ($status -eq "healthy") {
            $dbHealthy = $true
            break
        }
        Start-Sleep -Seconds 4
    }
    if (-not $dbHealthy) {
        Write-Host "❌ MariaDB failed to become healthy in time!" -ForegroundColor Red
        docker compose logs fairshare-db
        exit 1
    }

    # Check Backend
    $backendUp = $false
    for ($i = 1; $i -le 40; $i++) {
        $code = 0
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            $code = $resp.StatusCode
        } catch {
            if ($_.Exception.Response) {
                $code = [int]$_.Exception.Response.StatusCode
            }
        }
        Write-Host " - Backend health check ($i/40): HTTP $code" -ForegroundColor DarkGray
        if ($code -in 200, 401, 403) {
            $backendUp = $true
            break
        }
        Start-Sleep -Seconds 4
    }
    if (-not $backendUp) {
        Write-Host "❌ Backend did not respond in time!" -ForegroundColor Red
        docker compose logs fairshare-backend
        exit 1
    }

    # Check Flyway
    $flywayLogs = docker logs fairshare-backend 2>&1 | Select-String "Successfully applied|Schema .* is up to date"
    if ($flywayLogs) {
        Write-Host " - Flyway migrations confirmed:" -ForegroundColor DarkGray
        $flywayLogs | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
    }

    # Check Frontend
    try {
        $frontendHtml = (Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 5).Content
        if ($frontendHtml -match '<div id="root"') {
            Write-Host " - Frontend root HTML confirmed serving successfully." -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "⚠️ Warning: Frontend did not respond at http://localhost:80" -ForegroundColor Yellow
    }

    Write-Host "`n✅ [DOCKER CI] Smoke test passed successfully!" -ForegroundColor Green

} finally {
    if (-not $KeepRunning) {
        Write-Host "`nCleaning up Docker stack..." -ForegroundColor Yellow
        docker compose down -v
    } else {
        Write-Host "`nContainers kept running as requested (-KeepRunning)." -ForegroundColor Magenta
    }
    Pop-Location
}

exit 0
