$prs = @(148, 149, 150, 151, 152)
foreach ($pr in $prs) {
  Write-Host "Updating PR $pr"
  gh pr update-branch $pr
  
  $merged = $false
  while (-not $merged) {
    Start-Sleep -Seconds 30
    $checks = gh pr checks $pr
    if ($checks -match "pending" -or $checks -match "in_progress") {
      Write-Host "Checks pending for $pr..."
    } else {
      if ($checks -match "fail") {
          Write-Host "Checks FAILED for $pr!"
          break
      }
      Write-Host "Checks finished for $pr, attempting merge..."
      $mergeOutput = gh pr merge $pr --squash --delete-branch 2>&1
      if ($LASTEXITCODE -eq 0 -or $mergeOutput -match "failed to delete local branch") {
        Write-Host "Merged $pr"
        $merged = $true
      } elseif ($mergeOutput -match "is not mergeable" -or $mergeOutput -match "not up to date") {
        Write-Host "PR not mergeable, updating branch again..."
        gh pr update-branch $pr
      } else {
        Write-Host "Merge failed: $mergeOutput"
        $merged = $true # Break on unknown error
      }
    }
  }
}
