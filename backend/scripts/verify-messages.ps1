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
$headers2 = @{ Authorization = "Bearer $($login2.data.accessToken)" }

# Create org -> team -> list -> task
$orgName = "Messages Test Org " + (Get-Date).ToString("yyyyMMddHHmmss")
$orgResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs" -Headers $headers2 -ContentType application/json -Body (@{ name = $orgName } | ConvertTo-Json)
$orgId = $orgResp.data.id
$teamResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs/$orgId/teams" -Headers $headers2 -ContentType application/json -Body (@{ name = "Chat Team" } | ConvertTo-Json)
$teamId = $teamResp.data.id
$listResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/teams/$teamId/lists" -Headers $headers2 -ContentType application/json -Body (@{ name = "Chat List" } | ConvertTo-Json)
$listId = $listResp.data.id
$taskResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/lists/$listId/tasks" -Headers $headers2 -ContentType application/json -Body (@{ title = "Message thread" } | ConvertTo-Json)
$taskId = $taskResp.data.id

# Add demo as MEMBER so they can post too
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs/$orgId/members" -Headers $headers2 -ContentType application/json -Body (@{ email = "demo@example.com"; role = "MEMBER" } | ConvertTo-Json)

# Post messages as both users
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/tasks/$taskId/messages" -Headers $headers2 -ContentType application/json -Body (@{ body = "Hello from owner" } | ConvertTo-Json)
$loginDemo = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/auth/login" -ContentType application/json -Body (@{ email = "demo@example.com"; password = "Demo1234" } | ConvertTo-Json)
$headersDemo = @{ Authorization = "Bearer $($loginDemo.data.accessToken)" }
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/tasks/$taskId/messages" -Headers $headersDemo -ContentType application/json -Body (@{ body = "Hi from demo" } | ConvertTo-Json)
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/tasks/$taskId/messages" -Headers $headers2 -ContentType application/json -Body (@{ body = "Second from owner" } | ConvertTo-Json)

# List messages ascending
$msgs1 = Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/tasks/$taskId/messages?limit=2" -Headers $headers2
$cursor = $msgs1.meta.nextCursor
$msgs2 = if ($cursor) { Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/tasks/$taskId/messages?limit=2&cursor=$cursor" -Headers $headers2 } else { $null }

[pscustomobject]@{
  org = $orgResp.data
  team = $teamResp.data
  list = $listResp.data
  task = $taskResp.data
  page1 = $msgs1
  page2 = $msgs2
} | ConvertTo-Json -Depth 8
