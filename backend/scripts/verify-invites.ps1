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

if (-not (Wait-Health "http://127.0.0.1:4000/health" 30)) {
  Write-Error "Health check timed out"
}

# Owner login (user2)
$login2 = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/auth/login" -ContentType application/json -Body (@{ email = "user2@example.com"; password = "User2Pass!" } | ConvertTo-Json)
$token2 = $login2.data.accessToken
$headers2 = @{ Authorization = "Bearer $token2" }

# Create org and invite
$orgName = "Invites Test Org " + (Get-Date).ToString("yyyyMMddHHmmss")
$orgResp = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs" -Headers $headers2 -ContentType application/json -Body (@{ name = $orgName } | ConvertTo-Json)
$orgId = $orgResp.data.id
$invite = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/orgs/$orgId/invites" -Headers $headers2 -ContentType application/json -Body (@{ days = 14 } | ConvertTo-Json)
$token = $invite.data.token

# Invitee login (demo) and accept
$loginDemo = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/auth/login" -ContentType application/json -Body (@{ email = "demo@example.com"; password = "Demo1234" } | ConvertTo-Json)
$tokenDemo = $loginDemo.data.accessToken
$headersDemo = @{ Authorization = "Bearer $tokenDemo" }
$accept = Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:4000/api/invites/accept" -Headers $headersDemo -ContentType application/json -Body (@{ token = $token } | ConvertTo-Json)

# Confirm membership and invite usage
$members = Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/api/orgs/$orgId/members" -Headers $headers2

[pscustomobject]@{
  org = $orgResp.data
  invite = $invite.data
  accept = $accept.data
  members = $members.data
} | ConvertTo-Json -Depth 6
