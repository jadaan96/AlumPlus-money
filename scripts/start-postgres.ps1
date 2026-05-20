# تشغيل PostgreSQL المحلي للمشروع (منفذ 5432)
$pgBin = "C:\ZKBioTime\pgsql\bin"
$dataDir = "C:\workshop-pg-data"
$logFile = "$env:TEMP\workshop-pg-5432.log"

if (-not (Test-Path $pgBin\pg_ctl.exe)) {
    Write-Error "لم يُعثر على PostgreSQL. ثبّت PostgreSQL أو تأكد من مسار ZKBioTime."
    exit 1
}

if (-not (Test-Path $dataDir)) {
    Write-Host "إنشاء قاعدة بيانات جديدة في $dataDir ..."
    & "$pgBin\initdb.exe" -D $dataDir -U postgres -E UTF8 --locale=C -A trust
    & "$pgBin\pg_ctl.exe" -D $dataDir -o "-p 5432" -l $logFile start
    Start-Sleep 2
    & "$pgBin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -c "CREATE USER workshop WITH PASSWORD 'workshop_secret' CREATEDB;"
    & "$pgBin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -c "CREATE DATABASE workshop_accounts OWNER workshop;"
    Write-Host "تم إنشاء المستخدم workshop وقاعدة workshop_accounts"
} else {
    $status = & "$pgBin\pg_ctl.exe" -D $dataDir status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "تشغيل PostgreSQL..."
        & "$pgBin\pg_ctl.exe" -D $dataDir -o "-p 5432" -l $logFile start
    } else {
        Write-Host "PostgreSQL يعمل بالفعل على المنفذ 5432"
    }
}

Write-Host "جاهز: postgresql://workshop:workshop_secret@localhost:5432/workshop_accounts"
