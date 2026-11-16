<#
.SYNOPSIS
    Build and upload FairShare single-JAR artifact to Alwaysdata (thien.alwaysdata.net).
.EXAMPLE
    .\scripts\deploy-alwaysdata.ps1
    .\scripts\deploy-alwaysdata.ps1 -SkipPull
#>
param(
    [switch]$SkipPull,
    [string]$SshTarget = "thien@ssh-thien.alwaysdata.net",
    [string]$RemoteDir = "fairshare"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Assert-LastExitCode([string]$StepName) {
    if ($LASTEXITCODE -ne 0) {
        throw "Step '$StepName' failed with exit code $LASTEXITCODE."
    }
}

Push-Location $RepoRoot
try {
    if (-not $SkipPull) {
        Write-Host "==> [1/5] Fetching and merging origin/master..." -ForegroundColor Cyan
        git fetch origin
        Assert-LastExitCode "git fetch origin"
        git merge origin/master
        Assert-LastExitCode "git merge origin/master"
    } else {
        Write-Host "==> [1/5] Skipping git pull/merge (-SkipPull)." -ForegroundColor Yellow
    }

    Write-Host "==> [2/5] Installing & building frontend..." -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot "frontend")
    try {
        npm ci
        Assert-LastExitCode "npm ci"
        npm run build
        Assert-LastExitCode "npm run build"
    } finally {
        Pop-Location
    }

    Write-Host "==> [3/5] Embedding frontend/dist into backend static resources..." -ForegroundColor Cyan
    $StaticDir = Join-Path $RepoRoot "fairshare-backend\src\main\resources\static"
    if (Test-Path $StaticDir) {
        Remove-Item $StaticDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $StaticDir | Out-Null
    Copy-Item -Path (Join-Path $RepoRoot "frontend\dist\*") -Destination $StaticDir -Recurse -Force

    Write-Host "==> [4/5] Building backend JAR with JDK 21..." -ForegroundColor Cyan
    $Jdk21Path = "C:\Users\Admin\.jdks\jbr-21.0.11"
    if (Test-Path $Jdk21Path) {
        $env:JAVA_HOME = $Jdk21Path
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    }
    Push-Location (Join-Path $RepoRoot "fairshare-backend")
    try {
        .\mvnw.cmd -B package -DskipTests
        Assert-LastExitCode "mvnw package"
    } finally {
        Pop-Location
    }

    $JarPath = Join-Path $RepoRoot "fairshare-backend\target\fairshare-backend-0.0.1-SNAPSHOT.jar"
    if (-not (Test-Path $JarPath)) {
        throw "JAR not found at $JarPath"
    }

    Write-Host "==> [5/5] Uploading JAR to Alwaysdata ($SshTarget)..." -ForegroundColor Cyan
    scp $JarPath "${SshTarget}:${RemoteDir}/app.jar.new"
    Assert-LastExitCode "scp upload"
    ssh $SshTarget "mkdir -p ~/${RemoteDir}/uploads && mv ~/${RemoteDir}/app.jar.new ~/${RemoteDir}/app.jar"
    Assert-LastExitCode "ssh atomic replace"

    Write-Host ""
    Write-Host "Upload hoan tat! Hay vao https://admin.alwaysdata.com/site/ va bam nut Restart cho thien.alwaysdata.net." -ForegroundColor Green
} finally {
    Pop-Location
}
