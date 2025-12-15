# Troubleshooting — Local API Connectivity

Context: On Windows, repeated attempts to call `/health` reported timeouts from PowerShell, while the dev server printed "API listening". Root cause was likely IPv6/IPv4 and terminal-session binding quirks.

What we changed:
- Added `HOST` support in backend to bind explicitly.
- Updated server to `listen(PORT, HOST)`.
- Set `HOST=127.0.0.1` in backend `.env`.

How to recover quickly:
1) Free the port and start in foreground
```
$conn = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
Push-Location "C:\Users\solos\Desktop\quicky\backend"
npm run dev
```
2) Use IPv4 loopback explicitly for checks
```
Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/health"
```
3) If using another terminal, ensure it’s not blocked by profiles/proxy. Try `Invoke-WebRequest` as a cross-check and temporarily disable VPNs/firewalls if needed.

Automated verification scripts:
- Step 9 (members): `backend/scripts/verify-step-9.ps1`
- Step 9 (invites): `backend/scripts/verify-invites.ps1`

If issues persist:
- Confirm `.env` values and that `PORT` is free.
- Run `netsh interface ipv6 show prefixpolicies` and prefer IPv4 for localhost (advanced).
- As a last resort, bind to `0.0.0.0` for LAN testing and curl from WSL.