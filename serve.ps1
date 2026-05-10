# Cash Flow Media — local static file server
# Serves the project folder over HTTP so you can view changes on your phone
# (same WiFi) instantly, no GitHub deploy wait.
#
# Usage:   .\serve.ps1
# Or:      .\serve.ps1 -Port 9090
# Stop:    Ctrl+C

param([int]$Port = 8080)

$root = $PSScriptRoot
$ErrorActionPreference = 'Stop'

# Discover usable LAN IPv4 addresses (skip loopback + link-local)
$ips = @()
try {
  $ips = @((Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.AddressState -eq 'Preferred' -and
      $_.IPAddress -ne '127.0.0.1' -and
      $_.IPAddress -notlike '169.254.*'
    }).IPAddress)
} catch {}

# Build the listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
foreach ($ip in $ips) {
  try { $listener.Prefixes.Add("http://${ip}:${Port}/") } catch {}
}

try {
  $listener.Start()
} catch [System.Net.HttpListenerException] {
  Write-Host ''
  Write-Host 'ERROR: could not start HTTP listener (Windows access denied).' -ForegroundColor Red
  Write-Host ''
  Write-Host 'ONE-TIME FIX — open PowerShell as Administrator and run:' -ForegroundColor Yellow
  Write-Host ('  netsh http add urlacl url=http://+:{0}/ user=Everyone' -f $Port) -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Then re-run serve.ps1 (no admin needed after that).' -ForegroundColor Yellow
  exit 1
}

# MIME map
$mime = @{
  '.html'='text/html; charset=utf-8';   '.htm'='text/html; charset=utf-8'
  '.css' ='text/css; charset=utf-8';    '.js' ='application/javascript; charset=utf-8'
  '.mjs' ='application/javascript; charset=utf-8'
  '.json'='application/json';           '.svg'='image/svg+xml'
  '.png' ='image/png';                  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'
  '.gif' ='image/gif';                  '.webp'='image/webp'; '.ico'='image/x-icon'
  '.woff'='font/woff';                  '.woff2'='font/woff2'; '.ttf'='font/ttf'; '.otf'='font/otf'
  '.txt' ='text/plain; charset=utf-8';  '.xml'='application/xml'; '.pdf'='application/pdf'
  '.mp4' ='video/mp4';                  '.webm'='video/webm';  '.mp3'='audio/mpeg'
}

# Banner
Write-Host ''
Write-Host '  Cash Flow Media · local dev server' -ForegroundColor Cyan
Write-Host ('  Serving: ' + $root) -ForegroundColor DarkGray
Write-Host ''
Write-Host '  On this computer:' -ForegroundColor Gray
Write-Host ('     http://localhost:{0}/' -f $Port) -ForegroundColor Green
Write-Host ''
if ($ips.Count -gt 0) {
  Write-Host '  On your phone (same WiFi network):' -ForegroundColor Gray
  foreach ($ip in $ips) {
    Write-Host ('     http://{0}:{1}/' -f $ip, $Port) -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host '  If the phone cannot connect, allow the port through Windows Firewall:' -ForegroundColor DarkGray
  Write-Host ('     netsh advfirewall firewall add rule name="CFM Dev" dir=in protocol=TCP localport={0} action=allow' -f $Port) -ForegroundColor DarkGray
  Write-Host '  (Windows may pop a Firewall prompt the first time — click "Allow access".)' -ForegroundColor DarkGray
  Write-Host ''
}
Write-Host '  Tip: pages are sent with no-cache headers — just refresh after each save.' -ForegroundColor DarkGray
Write-Host '  Press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

# Request loop
try {
  $rootFull = [System.IO.Path]::GetFullPath($root)
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
    } catch { break }
    $req = $context.Request
    $res = $context.Response

    $rawPath = [uri]::UnescapeDataString($req.Url.AbsolutePath)
    $servedPath = $rawPath
    if ($rawPath -eq '/' -or $rawPath -eq '') { $rawPath = '/index.html' }
    $rel = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $candidate = Join-Path $root $rel

    # Path-traversal guard
    $resolved = $null
    try { $resolved = [System.IO.Path]::GetFullPath($candidate) } catch {}

    # No-cache so the phone always sees the latest edit on refresh
    try {
      $res.Headers.Add('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      $res.Headers.Add('Pragma', 'no-cache')
      $res.Headers.Add('Expires', '0')
    } catch {}

    $code = 404
    if ($resolved -and $resolved.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $resolved -PathType Leaf)) {
      $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      try {
        $bytes = [System.IO.File]::ReadAllBytes($resolved)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $code = 200
      } catch {
        $res.StatusCode = 500; $code = 500
      }
    } else {
      $res.StatusCode = 404
      $body = [Text.Encoding]::UTF8.GetBytes(("404 Not Found: " + $servedPath))
      $res.ContentLength64 = $body.Length
      try { $res.OutputStream.Write($body, 0, $body.Length) } catch {}
    }

    $color = switch ($code) { 200 {'Green'}; 404 {'Yellow'}; default {'Red'} }
    Write-Host ("  {0}  {1}" -f $code, $servedPath) -ForegroundColor $color

    try { $res.Close() } catch {}
  }
} finally {
  if ($listener.IsListening) { try { $listener.Stop() } catch {} }
  try { $listener.Close() } catch {}
  Write-Host ''
  Write-Host '  Server stopped.' -ForegroundColor Cyan
}
