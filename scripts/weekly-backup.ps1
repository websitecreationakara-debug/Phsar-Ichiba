# Weekly backup for Phsar Ichiba: exports the production D1 database and
# snapshots the source tree to D:\Backups\phsar-ichiba\, uploads both to
# Google Drive (gdrive:Phsar Ichiba) via rclone, then prunes local backups
# older than $RetentionWeeks. Registered as a Windows Scheduled Task - see
# scripts/register-weekly-backup.ps1.

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectDir = "D:\Ecommerce\Phsar Ichiba"
$BackupDir = "D:\Backups\phsar-ichiba"
$RetentionWeeks = 8
$Rclone = "C:\Users\Demo\.project-tracker\bin\rclone.exe"
$DriveRemote = "gdrive:Phsar Ichiba"
$Date = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $BackupDir "backup.log"

function Log($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Output $line
  Add-Content -Path $LogFile -Value $line -Encoding utf8
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Set-Location $ProjectDir

try {
  Log "Starting backup for $Date"

  $DbFile = Join-Path $BackupDir "phsar-ichiba_db_$Date.sql"
  Log "Exporting D1 database to $DbFile"
  & npx wrangler d1 export phsar-ichiba --remote --output="$DbFile" 2>&1 | ForEach-Object { Log $_ }
  if (-not (Test-Path $DbFile)) { throw "Database export did not produce a file" }

  $SrcFile = Join-Path $BackupDir "phsar-ichiba_source_$Date.zip"
  Log "Archiving source tree to $SrcFile"
  & git archive --format=zip -o "$SrcFile" HEAD 2>&1 | ForEach-Object { Log $_ }
  if (-not (Test-Path $SrcFile)) { throw "Source archive did not produce a file" }

  $CommitHash = (& git rev-parse --short HEAD).Trim()
  $CommitMsg = (& git log -1 --format=%s).Trim()
  Log "Backup complete: db=$((Get-Item $DbFile).Length) bytes, source=$((Get-Item $SrcFile).Length) bytes, commit=$CommitHash ($CommitMsg)"

  Log "Uploading to Google Drive ($DriveRemote)"
  & $Rclone copy $DbFile $DriveRemote -q 2>&1 | ForEach-Object { Log $_ }
  & $Rclone copy $SrcFile $DriveRemote -q 2>&1 | ForEach-Object { Log $_ }
  Log "Google Drive upload complete"

  Log "Pruning Drive backups older than $RetentionWeeks weeks"
  & $Rclone delete $DriveRemote --min-age "$($RetentionWeeks * 7)d" --include "phsar-ichiba_*" -q 2>&1 | ForEach-Object { Log $_ }

  # Prune backups older than $RetentionWeeks.
  $cutoff = (Get-Date).AddDays(-7 * $RetentionWeeks)
  Get-ChildItem -Path $BackupDir -Filter "phsar-ichiba_*" -File |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
      Log "Pruning old backup: $($_.Name)"
      Remove-Item $_.FullName -Force
    }

  Log "Backup finished successfully"
} catch {
  Log "BACKUP FAILED: $_"
  throw
}
