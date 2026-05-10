$ErrorActionPreference = 'Stop'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$tmp    = $env:TEMP
$dl     = Join-Path $env:USERPROFILE 'Downloads'
$url    = 'file:///C:/Users/bradl/cashflow-media/.export/render-loader.html'

# Capture mid-cycle so bars are at full height (cas peaks ~50% of 2.4s = 1200ms)
$pngOut = Join-Path $tmp 'cfm-loader.png'
$args = @(
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1024,1024',
  '--default-background-color=0c0e0dff',
  "--screenshot=$pngOut",
  '--virtual-time-budget=1200',
  $url
)
Start-Process -FilePath $chrome -ArgumentList $args -Wait -NoNewWindow `
  -RedirectStandardError "$tmp\cfm-chrome.err" -RedirectStandardOutput "$tmp\cfm-chrome.out" | Out-Null
if (-not (Test-Path $pngOut)) { throw 'Loader screenshot failed' }
Write-Host ("PNG: {0:N0} bytes" -f (Get-Item $pngOut).Length)

# Convert PNG -> JPEG (System.Drawing)
Add-Type -AssemblyName System.Drawing
$jpgOut = Join-Path $tmp 'cfm-loader.jpg'
$img = [System.Drawing.Image]::FromFile($pngOut)
$bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 12, 14, 13))
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)
$g.Dispose(); $img.Dispose()
$jpgEnc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
$bmp.Save($jpgOut, $jpgEnc, $params)
$bmp.Dispose()
Write-Host ("JPG: {0:N0} bytes" -f (Get-Item $jpgOut).Length)

# Stage in Downloads
Copy-Item $pngOut "$dl\CashFlowMedia-loader-logo.png" -Force
Copy-Item $jpgOut "$dl\CashFlowMedia-loader-logo.jpg" -Force
Write-Host ''
Write-Host 'Files in Downloads:'
Get-ChildItem "$dl\CashFlowMedia-loader-logo.*" | ForEach-Object { '{0,-44} {1,8:N0} bytes' -f $_.Name, $_.Length | Write-Host }
