# Restores a Phsar Ichiba backup from Google Drive (gdrive:Phsar Ichiba).
#
# Usage:
#   .\restore-backup.ps1                  # downloads the most recent backup
#   .\restore-backup.ps1 -Date 2026-07-21 # downloads a specific date
#
# This script only DOWNLOADS the backup and unpacks the source snapshot for
# inspection — it deliberately does NOT touch the live database. Restoring
# the D1 database overwrites production data and can't be undone, so that
# step is printed as a command for you to run yourself once you're sure.

param(
  [string]$Date
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Rclone = "C:\Users\Demo\.project-tracker\bin\rclone.exe"
$DriveRemote = "gdrive:Phsar Ichiba"
$RestoreDir = "D:\Backups\phsar-ichiba\restore"

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

Write-Output "Restoring backup dated $Date"

New-Item -ItemType Directory -Force -Path $RestoreDir | Out-Null

$DbName = "phsar-ichiba_db_$Date.sql"
$SrcName = "phsar-ichiba_source_$Date.zip"
$DbLocal = Join-Path $RestoreDir $DbName
$SrcLocal = Join-Path $RestoreDir $SrcName

Write-Output "Downloading $DbName ..."
& $Rclone copy "$DriveRemote/$DbName" $RestoreDir --progress
if (-not (Test-Path $DbLocal)) { throw "Could not find $DbName on Drive for date $Date" }

Write-Output "Downloading $SrcName ..."
& $Rclone copy "$DriveRemote/$SrcName" $RestoreDir --progress
if (-not (Test-Path $SrcLocal)) { throw "Could not find $SrcName on Drive for date $Date" }

$UnzipDir = Join-Path $RestoreDir "source_$Date"
Write-Output "Unpacking source snapshot to $UnzipDir ..."
Expand-Archive -Path $SrcLocal -DestinationPath $UnzipDir -Force

Write-Output ""
Write-Output "Done. Downloaded to: $RestoreDir"
Write-Output ""
Write-Output "Source code from that backup is unpacked and browsable at:"
Write-Output "  $UnzipDir"
Write-Output ""
Write-Output "The database dump was downloaded but NOT applied (this would overwrite"
Write-Output "production data and can't be undone). To restore it for real, run:"
Write-Output ""
Write-Output "  cd `"D:\Ecommerce\Phsar Ichiba`""
Write-Output "  npx wrangler d1 execute phsar-ichiba --remote --file `"$DbLocal`""
Write-Output ""
Write-Output "Consider restoring to a local/dev D1 instance first (drop --remote)"
Write-Output "to sanity-check the dump before touching production."
