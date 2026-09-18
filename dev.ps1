$port = 4173
$url = "http://localhost:$port/"
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $listener) {
  Start-Process -FilePath "python" -ArgumentList "-m http.server $port" -WorkingDirectory $PSScriptRoot
}

Start-Process $url
Write-Host "Cinder & Salt is running at $url"
