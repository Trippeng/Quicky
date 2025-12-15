$ErrorActionPreference = 'Stop'

function Wait-Health($url, $timeoutSec = 30) {
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

if (-not (Wait-Health "http://127.0.0.1:4000/health" 30)) { Write-Error "Health check timed out" }

# Login as owner (user2)
$login2 = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/auth/login" -ContentType application/json -Body (@{ email = "user2@example.com"; password = "User2Pass!" } | ConvertTo-Json)
$token2 = $login2.data.accessToken
$headers2 = @{ Authorization = "Bearer $token2" }

# Create org
$orgName = "Teams Test Org " + (Get-Date).ToString("yyyyMMddHHmmss")
$orgResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs" -Headers $headers2 -ContentType application/json -Body (@{ name = $orgName } | ConvertTo-Json)
$orgId = $orgResp.data.id

# Create team
$teamResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs/$orgId/teams" -Headers $headers2 -ContentType application/json -Body (@{ name = "Alpha Team" } | ConvertTo-Json)
$teamId = $teamResp.data.id

# List teams
$teams = Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/orgs/$orgId/teams?limit=10" -Headers $headers2

# Create list in team
$listResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/teams/$teamId/lists" -Headers $headers2 -ContentType application/json -Body (@{ name = "Backlog" } | ConvertTo-Json)

# List lists
$lists = Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/teams/$teamId/lists?limit=10" -Headers $headers2

[pscustomobject]@{
  org = $orgResp.data
  team = $teamResp.data
  teams = $teams.data
  list = $listResp.data
  lists = $lists.data
  meta = @{ teams = $teams.meta; lists = $lists.meta }
} | ConvertTo-Json -Depth 6
