$ErrorActionPreference = 'Stop'

function Wait-Health($url, $timeoutSec = 25) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $h = Invoke-RestMethod -Method GET -Uri $url -TimeoutSec 3
      if ($h.status -eq 'ok') { return $true }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  return $false
}

if (-not (Wait-Health "http://localhost:4000/health" 25)) {
  Write-Error "Health check timed out"
}

# Login as user2 (owner)
$login2 = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType application/json -Body (@{ email = "user2@example.com"; password = "User2Pass!" } | ConvertTo-Json)
$token2 = $login2.data.accessToken
$headers2 = @{ Authorization = "Bearer $token2" }

# Create a fresh org for this test
$orgName = "User2 Org " + (Get-Date).ToString("yyyyMMddHHmmss")
$orgResp = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/orgs" -Headers $headers2 -ContentType application/json -Body (@{ name = $orgName } | ConvertTo-Json)
$orgId = $orgResp.data.id

# Add demo as MEMBER
$addMember = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/orgs/$orgId/members" -Headers $headers2 -ContentType application/json -Body (@{ email = "demo@example.com"; role = "MEMBER" } | ConvertTo-Json)

# Confirm members
$members = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/orgs/$orgId/members" -Headers $headers2

[pscustomobject]@{
  org = $orgResp.data
  addedMember = $addMember.data
  members = $members.data
} | ConvertTo-Json -Depth 6
