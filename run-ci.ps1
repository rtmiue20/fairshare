<#
.SYNOPSIS
    Master CI runner for Windows local environment.
.DESCRIPTION
    Runs Backend CI, Frontend CI, and Docker CI pipelines with a unified report.
    Usage:
        .\run-ci.ps1              # Runs all components
        .\run-ci.ps1 -Backend     # Only Backend CI
        .\run-ci.ps1 -Frontend    # Only Frontend CI
        .\run-ci.ps1 -Docker      # Only Docker Smoke Test
#>
[CmdletBinding()]
param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Docker,
    [switch]$All
)

$ErrorActionPreference = "Continue"
$RootDir = $PSScriptRoot
if (-not $RootDir) { $RootDir = (Get-Location).Path }

# Default to running all if no specific flags are set
if (-not $Backend -and -not $Frontend -and -not $Docker) {
    $All = $true
}
if ($All) {
    $Backend = $true
    $Frontend = $true
    $Docker = $true
}

$startTime = Get-Date

Write-Host @"
======================================================================
           FAIRSHARE LOCAL CI PIPELINE (WINDOWS POWERSHELL)           
======================================================================
"@ -ForegroundColor Cyan

$results = [ordered]@{}

# 1. Backend CI
if ($Backend) {
    Write-Host "`n>>> [1] RUNNING BACKEND CI..." -ForegroundColor Cyan
    & "$RootDir\scripts\ci-backend.ps1"
    if ($LASTEXITCODE -eq 0) {
        $results["Backend CI"] = "PASS"
    } else {
        $results["Backend CI"] = "FAIL"
    }
}

# 2. Frontend CI
if ($Frontend) {
    Write-Host "`n>>> [2] RUNNING FRONTEND CI..." -ForegroundColor Cyan
    & "$RootDir\scripts\ci-frontend.ps1"
    if ($LASTEXITCODE -eq 0) {
        $results["Frontend CI"] = "PASS"
    } else {
        $results["Frontend CI"] = "FAIL"
    }
}

# 3. Docker CI
if ($Docker) {
    Write-Host "`n>>> [3] RUNNING DOCKER CI..." -ForegroundColor Cyan
    & "$RootDir\scripts\ci-docker.ps1"
    if ($LASTEXITCODE -eq 0) {
        $results["Docker CI"] = "PASS / SKIPPED"
    } else {
        $results["Docker CI"] = "FAIL"
    }
}

$duration = (Get-Date) - $startTime

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "                       LOCAL CI SUMMARY REPORT                        " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Total Execution Time: $([Math]::Round($duration.TotalSeconds, 1))s`n"

$hasFailure = $false
foreach ($key in $results.Keys) {
    $status = $results[$key]
    if ($status -eq "PASS") {
        Write-Host "  [+] $key : " -NoNewline
        Write-Host "PASSED" -ForegroundColor Green
    } elseif ($status -like "*SKIPPED*") {
        Write-Host "  [*] $key : " -NoNewline
        Write-Host "$status" -ForegroundColor Yellow
    } else {
        Write-Host "  [-] $key : " -NoNewline
        Write-Host "FAILED" -ForegroundColor Red
        $hasFailure = $true
    }
}

Write-Host "======================================================================`n" -ForegroundColor Cyan

if ($hasFailure) {
    Write-Host "❌ One or more CI steps failed. Please review logs above.`n" -ForegroundColor Red
    exit 1
} else {
    Write-Host "🎉 All requested CI checks completed successfully on Windows!`n" -ForegroundColor Green
    exit 0
}
