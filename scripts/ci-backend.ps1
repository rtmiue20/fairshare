<#
.SYNOPSIS
    Runs Backend CI pipeline locally on Windows PowerShell.
.DESCRIPTION
    Compiles Java 21 codebase, runs unit and integration tests (with graceful Testcontainers fallback),
    and displays test summary.
#>
[CmdletBinding()]
param(
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $RootDir "fairshare-backend"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [BACKEND CI] Starting Backend Build & Test (Java 21) " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Check Java
Write-Host "[1/3] Checking Java installation..." -ForegroundColor Yellow
$javaExe = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaExe) {
    Write-Error "Java not found in PATH. Please install Java 21."
    exit 1
}
# Note: java -version outputs to stderr by design; run cmd /c to avoid PS error stream treatment
$javaInfo = cmd /c "java -version 2>&1"
Write-Host "Found Java: $javaInfo" -ForegroundColor DarkGray

# 2. Build and Test
Write-Host "`n[2/3] Running Maven build & tests via mvnw.cmd..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    if ($SkipTests) {
        Write-Host "Skipping tests as requested (-SkipTests)..." -ForegroundColor Magenta
        .\mvnw.cmd clean compile
    } else {
        .\mvnw.cmd test
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Backend CI failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Pop-Location
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# 3. Test summary
Write-Host "`n[3/3] Parsing backend test results..." -ForegroundColor Yellow
Push-Location $RootDir
try {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python scripts/summarize-backend.py
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        python3 scripts/summarize-backend.py
    } else {
        Write-Host "Python not found to format summary table, checking reports directly:" -ForegroundColor Yellow
        Get-ChildItem -Path "fairshare-backend/target/surefire-reports/TEST-*.xml" | ForEach-Object {
            Write-Host " - $($_.Name)" -ForegroundColor DarkGray
        }
    }
} finally {
    Pop-Location
}

Write-Host "`n✅ [BACKEND CI] All backend checks completed successfully!" -ForegroundColor Green
exit 0
