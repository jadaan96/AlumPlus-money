# إعداد كامل: تشغيل PostgreSQL + migrations + seed
$root = Split-Path $PSScriptRoot -Parent
& "$PSScriptRoot\start-postgres.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location "$root\backend"
Write-Host "تطبيق migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "تعبئة البيانات الأولية..."
npm run db:seed
Write-Host "اكتمل إعداد قاعدة البيانات."
