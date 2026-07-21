# One-click restore: downloads a backup from Google Drive and, after an
# explicit typed confirmation, applies it to the LIVE production D1
# database. This is the destructive counterpart to restore-backup.ps1
# (which only downloads/unpacks for inspection).
#
# Usage: double-click restore-live.cmd, or:
#   .\restore-live.ps1                    # restores from the most recent backup
#   .\restore-live.ps1 -Date 2026-07-15   # restores from a specific date

param(
  [string]$Date
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Rclone = "C:\Users\Demo\.project-tracker\bin\rclone.exe"
$DriveRemote = "gdrive:Phsar Ichiba"
$RestoreDir = "D:\Backups\phsar-ichiba\restore"
$ProjectDir = "D:\Ecommerce\Phsar Ichiba"

Write-Output "=== Phsar Ichiba: Restore Live Database from Backup ==="
Write-Output ""

if (-not $Date) {
  Write-Output "No -Date given, finding the most recent backup on Drive..."
  $listing = & $Rclone lsl $DriveRemote -q
  $dates = @($listing |
    Select-String -Pattern 'phsar-ichiba_db_(\d{4}-\d{2}-\d{2})\.sql' |
    ForEach-Object { $_.Matches[0].Groups[1].Value } |
    Sort-Object -Descending)
  if (-not $dates) { throw "No backups found on $DriveRemote" }
  $Date = $dates[0]
}

Write-Output "Backup date: $Date"

New-Item -ItemType Directory -Force -Path $RestoreDir | Out-Null
$DbName = "phsar-ichiba_db_$Date.sql"
$DbLocal = Join-Path $RestoreDir $DbName

if (-not (Test-Path $DbLocal)) {
  Write-Output "Downloading $DbName ..."
  & $Rclone copy "$DriveRemote/$DbName" $RestoreDir -q
}
if (-not (Test-Path $DbLocal)) { throw "Could not find/download $DbName on Drive for date $Date" }

$sizeKb = [math]::Round((Get-Item $DbLocal).Length / 1KB, 1)
Write-Output "Local file ready: $DbLocal ($sizeKb KB)"
Write-Output ""
Write-Output "!! WARNING !!"
Write-Output "This will OVERWRITE the LIVE production database at phsarichiba.com"
Write-Output "with the $Date backup. Any orders or changes made AFTER that date"
Write-Output "will be permanently LOST. This cannot be undone."
Write-Output ""

$confirm = Read-Host "Type RESTORE (all caps, exactly) to proceed, or anything else to cancel"

if ($confirm -cne "RESTORE") {
  Write-Output ""
  Write-Output "Cancelled. Nothing was changed."
  exit 0
}

Write-Output ""
Write-Output "Restoring $Date backup to the live database..."
Set-Location $ProjectDir
& npx wrangler d1 execute phsar-ichiba --remote --file "$DbLocal"

Write-Output ""
Write-Output "Restore complete. The live site now reflects the $Date backup."
