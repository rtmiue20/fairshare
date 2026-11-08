<#
.SYNOPSIS
    Runs Frontend CI pipeline locally on Windows PowerShell.
.DESCRIPTION
    Installs npm dependencies, runs ESLint, executes Vitest unit tests, and builds Vite bundle.
#>
[CmdletBinding()]
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [FRONTEND CI] Starting Lint, Test & Build (Node.js)    " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Check Node & npm
Write-Host "[1/5] Checking Node.js & npm..." -ForegroundColor Yellow
try {
    $nodeVer = node --version
    $npmVer = npm --version
    Write-Host "Found Node: $nodeVer | npm: $npmVer" -ForegroundColor DarkGray
} catch {
    Write-Error "Node.js or npm not found in PATH. Please install Node 20+."
    exit 1
}

Push-Location $FrontendDir
try {
    # 2. Dependencies
    Write-Host "`n[2/5] Checking / installing dependencies..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ npm install failed" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    # 3. Lint
    Write-Host "`n[3/5] Running ESLint..." -ForegroundColor Yellow
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Lint failed" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    # 4. Vitest
    Write-Host "`n[4/5] Running Vitest (test:ci)..." -ForegroundColor Yellow
    npm run test:ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Frontend tests failed" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    # 5. Type-check & Build
    if (-not $SkipBuild) {
        Write-Host "`n[5/5] Building production bundle (tsc + Vite)..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n❌ Frontend build failed" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } else {
        Write-Host "`n[5/5] Skipping build step as requested (-SkipBuild)..." -ForegroundColor Magenta
    }
} finally {
    Pop-Location
}

# Test summary
Write-Host "`n[Summary] Parsing frontend test results..." -ForegroundColor Yellow
Push-Location $RootDir
try {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python scripts/summarize-frontend.py
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        python3 scripts/summarize-frontend.py
    }
} finally {
    Pop-Location
}

Write-Host "`n✅ [FRONTEND CI] All frontend checks completed successfully!" -ForegroundColor Green
exit 0
