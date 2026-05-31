# نسخ احتياطي لقاعدة workshop_accounts — يُشغَّل يدوياً أو عبر Task Scheduler كل يومين
param(
    [string]$BackupRoot = "D:\backups\workshop-accounts",
    [int]$KeepCount = 15
)

$ErrorActionPreference = "Stop"
$pgBin = "C:\ZKBioTime\pgsql\bin"
$pgDump = Join-Path $pgBin "pg_dump.exe"
$logFile = Join-Path $BackupRoot "backup.log"

function Write-Log([string]$msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Get-DbConfig {
    $root = Split-Path $PSScriptRoot -Parent
    $envFile = Join-Path $root "backend\.env"
    $defaults = @{
        Host     = "127.0.0.1"
        Port     = "5432"
        User     = "workshop"
        Password = "workshop_secret"
        Database = "workshop_accounts"
    }

    if (-not (Test-Path $envFile)) {
        return $defaults
    }

    $urlLine = Get-Content $envFile -Encoding UTF8 |
        Where-Object { $_ -match '^\s*DATABASE_URL\s*=\s*"(.+)"\s*$' } |
        Select-Object -First 1

    if (-not $urlLine) {
        return $defaults
    }

    if ($urlLine -match 'DATABASE_URL\s*=\s*"postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^"?]+)') {
        return @{
            Host     = $matches[3]
            Port     = $matches[4]
            User     = $matches[1]
            Password = $matches[2]
            Database = $matches[5]
        }
    }

    return $defaults
}

try {
    New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

    if (-not (Test-Path $pgDump)) {
        throw "pg_dump not found at $pgDump"
    }

    $db = Get-DbConfig
    $stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
    $outFile = Join-Path $BackupRoot "workshop_accounts_$stamp.sql"

    $env:PGPASSWORD = $db.Password

    Write-Log "Starting backup -> $outFile"

    & $pgDump `
        -h $db.Host `
        -p $db.Port `
        -U $db.User `
        -d $db.Database `
        -F p `
        --no-owner `
        --no-acl `
        -f $outFile

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    $sizeMb = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
    Write-Log "Backup OK - $sizeMb MB"

    $old = Get-ChildItem $BackupRoot -Filter "workshop_accounts_*.sql" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $KeepCount

    foreach ($f in $old) {
        Remove-Item $f.FullName -Force
        Write-Log "Removed old backup: $($f.Name)"
    }
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
