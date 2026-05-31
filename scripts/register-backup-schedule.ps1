# تسجيل مهمة Windows: نسخ احتياطي كل يومين الساعة 3:00 صباحاً
# شغّل مرة واحدة (كمسؤول اختياري — يكفي حسابك الحالي):
#   powershell -ExecutionPolicy Bypass -File scripts\register-backup-schedule.ps1

$ErrorActionPreference = "Stop"

$taskName = "WorkshopAccounts-DbBackup"
$scriptPath = Join-Path $PSScriptRoot "backup-db.ps1"
$projectRoot = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path $scriptPath)) {
    Write-Error "Missing script: $scriptPath"
    exit 1
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $projectRoot

# كل يومين — الساعة 3:00 ص
$trigger = New-ScheduledTaskTrigger -Daily -DaysInterval 2 -At "03:00"

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Workshop accounts PostgreSQL backup every 2 days (D:\backups\workshop-accounts)" `
    -RunLevel Limited | Out-Null

Write-Host "Scheduled task registered: $taskName"
Write-Host "  Every 2 days at 03:00"
Write-Host "  Script: $scriptPath"
Write-Host "  Backups: D:\backups\workshop-accounts"
Write-Host ""
Write-Host "Test now: npm run db:backup"
Write-Host "View task: taskschd.msc -> Task Scheduler Library -> $taskName"
