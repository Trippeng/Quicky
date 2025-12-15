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

# Create org -> team -> list
$orgName = "Tasks Test Org " + (Get-Date).ToString("yyyyMMddHHmmss")
$orgResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs" -Headers $headers2 -ContentType application/json -Body (@{ name = $orgName } | ConvertTo-Json)
$orgId = $orgResp.data.id
$teamResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs/$orgId/teams" -Headers $headers2 -ContentType application/json -Body (@{ name = "Tasks Team" } | ConvertTo-Json)
$teamId = $teamResp.data.id
$listResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/teams/$teamId/lists" -Headers $headers2 -ContentType application/json -Body (@{ name = "To Do" } | ConvertTo-Json)
$listId = $listResp.data.id

# Create a task
$taskResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/lists/$listId/tasks" -Headers $headers2 -ContentType application/json -Body (@{ title = "Write tests"; description = "cover status changes" } | ConvertTo-Json)
$taskId = $taskResp.data.id

# List tasks
$tasks = Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/lists/$listId/tasks?limit=10" -Headers $headers2

# Get task
$taskGet = Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/tasks/$taskId" -Headers $headers2

# Update task status
$patch1 = Invoke-RestMethod -Method PATCH -Uri "http://127.0.0.1:4000/api/tasks/$taskId" -Headers $headers2 -ContentType application/json -Body (@{ status = "IN_PROGRESS" } | ConvertTo-Json)
$patch2 = Invoke-RestMethod -Method PATCH -Uri "http://127.0.0.1:4000/api/tasks/$taskId" -Headers $headers2 -ContentType application/json -Body (@{ status = "COMPLETE" } | ConvertTo-Json)

[pscustomobject]@{
  org = $orgResp.data
  team = $teamResp.data
  list = $listResp.data
  createdTask = $taskResp.data
  tasks = $tasks.data
  meta = $tasks.meta
  getTask = $taskGet.data
  patch1 = $patch1.data
  patch2 = $patch2.data
} | ConvertTo-Json -Depth 6
