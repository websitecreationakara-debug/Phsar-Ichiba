# One-time setup: registers the Phsar Ichiba weekly backup as a Windows
# Scheduled Task. Run this once (as the Demo user, no admin rights needed).
# Runs weekly-backup.ps1 every Sunday at 3:00 AM. "Run only when user is
# logged on" - no password is stored, but the task is skipped for that week
# if the machine is off or logged out at trigger time.

$TaskName = "PhsarIchiba-WeeklyBackup"
$ScriptPath = "D:\Ecommerce\Phsar Ichiba\scripts\weekly-backup.ps1"

$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3:00AM

$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "Weekly D1 database export + source snapshot for Phsar Ichiba, saved to D:\Backups\phsar-ichiba" `
  -Force

Write-Output "Registered scheduled task '$TaskName' - runs Sundays at 3:00 AM."
