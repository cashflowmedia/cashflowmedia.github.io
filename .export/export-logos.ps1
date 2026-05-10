# Export CashFlowMedia logos in multiple formats to user's Downloads folder.
$ErrorActionPreference = 'Stop'

$chrome   = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$exportDir= $PSScriptRoot
$tempDir  = Join-Path $env:TEMP 'cfm-logo-export'
$dlDir    = Join-Path $env:USERPROFILE 'Downloads'
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

function ChromeShot {
  param($url, $out, $w, $h, $bg = '00000000', $vtime = 0)
  $args = @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    "--window-size=$w,$h",
    "--default-background-color=$bg",
    "--screenshot=$out",
    "--virtual-time-budget=$vtime",
    $url
  )
  $proc = Start-Process -FilePath $chrome -ArgumentList $args -Wait -NoNewWindow -PassThru -RedirectStandardError "$env:TEMP\cfm-chrome.err" -RedirectStandardOutput "$env:TEMP\cfm-chrome.out"
  if (-not (Test-Path $out)) { throw "Screenshot failed: $out" }
}

# === Static PNGs ===
Write-Host '[1/6] Rendering static PNGs...'
$urlIcon  = "file:///$($exportDir.Replace('\','/'))/render-icon.html"
$urlDark  = "file:///$($exportDir.Replace('\','/'))/render-icon-dark.html"
$urlWord  = "file:///$($exportDir.Replace('\','/'))/render-wordmark.html"

ChromeShot $urlIcon "$tempDir\icon-transparent.png" 1024 1024 '00000000' 1500
ChromeShot $urlDark "$tempDir\icon-dark.png"        1024 1024 '0c0e0dff' 1500
ChromeShot $urlWord "$tempDir\wordmark-dark.png"    1600 600  '0c0e0dff' 2500

# === PNG -> JPEG via System.Drawing ===
Write-Host '[2/6] Converting to JPEG...'
Add-Type -AssemblyName System.Drawing
function PngToJpeg($pngPath, $jpgPath, $quality = 92) {
  $img = [System.Drawing.Image]::FromFile($pngPath)
  $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 12, 14, 13))
  $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
  $g.Dispose()
  $img.Dispose()
  $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $bmp.Save($jpgPath, $jpgEncoder, $params)
  $bmp.Dispose()
}
PngToJpeg "$tempDir\icon-dark.png"     "$tempDir\icon-dark.jpg"
PngToJpeg "$tempDir\wordmark-dark.png" "$tempDir\wordmark-dark.jpg"

# === WebP via Chrome (just save the icon page as webp by re-screenshotting? Chrome only outputs PNG) ===
# Skip webp — would need ffmpeg.

# === Animation frame capture ===
Write-Host '[3/6] Capturing 12 animation frames...'
$frameCount = 12
$cycleMs    = 3200  # cascadeSubtle duration
$frameDelay = [int]($cycleMs / $frameCount)
for ($i = 0; $i -lt $frameCount; $i++) {
  # Start at a small offset so vtime > 0 (vtime=0 hangs Chrome) and to advance into the animation cycle
  $vt = 100 + ($i * $frameDelay)
  $out = "$tempDir\frame_{0:D2}.png" -f $i
  Write-Host "  frame $i @ $vt ms"
  ChromeShot $urlDark $out 512 512 '0c0e0dff' $vt
}

# === Build animated GIF using WPF GifBitmapEncoder ===
Write-Host '[4/6] Encoding animated GIF...'
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
$gifEnc = New-Object System.Windows.Media.Imaging.GifBitmapEncoder
for ($i = 0; $i -lt $frameCount; $i++) {
  $framePath = "$tempDir\frame_{0:D2}.png" -f $i
  $uri = New-Object System.Uri($framePath)
  $bf = [System.Windows.Media.Imaging.BitmapFrame]::Create($uri,
        [System.Windows.Media.Imaging.BitmapCreateOptions]::None,
        [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
  $gifEnc.Frames.Add($bf)
}
$gifPath = "$tempDir\animated.gif"
$fs = New-Object System.IO.FileStream($gifPath, [System.IO.FileMode]::Create)
$gifEnc.Save($fs)
$fs.Close()

# Patch GIF for proper frame delay + infinite loop (WPF encoder writes 0ms delay, no NETSCAPE block)
Write-Host '[5/6] Patching GIF for loop + frame delay...'
$bytes  = [System.IO.File]::ReadAllBytes($gifPath)
$delayCs = [int]($frameDelay / 10)  # 1/100 sec units
# Find every Graphics Control Extension (21 F9 04 ...) and overwrite the delay bytes (offset +4, +5)
$patched = New-Object System.Collections.Generic.List[byte]
$i = 0
while ($i -lt $bytes.Length) {
  if ($i + 7 -lt $bytes.Length -and $bytes[$i] -eq 0x21 -and $bytes[$i+1] -eq 0xF9 -and $bytes[$i+2] -eq 0x04) {
    # Graphics Control Extension. Bytes: 21 F9 04 packed delayLo delayHi transparentIdx 00
    $patched.Add(0x21); $patched.Add(0xF9); $patched.Add(0x04); $patched.Add($bytes[$i+3])
    $patched.Add([byte]($delayCs -band 0xFF))
    $patched.Add([byte](($delayCs -shr 8) -band 0xFF))
    $patched.Add($bytes[$i+6]); $patched.Add($bytes[$i+7])
    $i += 8
  } else {
    $patched.Add($bytes[$i]); $i++
  }
}
# Insert NETSCAPE2.0 application extension for infinite loop right after the global color table / before the first frame.
# Find the first 0x21 0xF9 (GCE) and insert the loop block right before it.
$result = New-Object System.Collections.Generic.List[byte]
$inserted = $false
$j = 0
$pa = $patched.ToArray()
while ($j -lt $pa.Length) {
  if (-not $inserted -and $j + 1 -lt $pa.Length -and $pa[$j] -eq 0x21 -and $pa[$j+1] -eq 0xF9) {
    # NETSCAPE2.0 looping extension: 21 FF 0B 'NETSCAPE2.0' 03 01 00 00 00
    $loop = [byte[]](0x21,0xFF,0x0B,0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30,0x03,0x01,0x00,0x00,0x00)
    foreach ($b in $loop) { $result.Add($b) }
    $inserted = $true
  }
  $result.Add($pa[$j]); $j++
}
[System.IO.File]::WriteAllBytes($gifPath, $result.ToArray())

# === Stage final outputs into Downloads ===
Write-Host '[6/6] Copying files to Downloads...'
$prefix = 'CashFlowMedia-logo'
$svgSrc = Join-Path $exportDir 'CashFlowMedia-icon.svg'

Copy-Item $svgSrc                     "$dlDir\$prefix-icon.svg"           -Force
Copy-Item "$tempDir\icon-transparent.png" "$dlDir\$prefix-icon-transparent.png" -Force
Copy-Item "$tempDir\icon-dark.png"        "$dlDir\$prefix-icon-dark.png"        -Force
Copy-Item "$tempDir\icon-dark.jpg"        "$dlDir\$prefix-icon.jpg"             -Force
Copy-Item "$tempDir\wordmark-dark.png"    "$dlDir\$prefix-wordmark.png"         -Force
Copy-Item "$tempDir\wordmark-dark.jpg"    "$dlDir\$prefix-wordmark.jpg"         -Force
Copy-Item $gifPath                        "$dlDir\$prefix-icon-animated.gif"    -Force

Write-Host ''
Write-Host 'Done. Files written:'
Get-ChildItem "$dlDir\$prefix*" | Sort-Object Name | ForEach-Object {
  '{0,-46} {1,8:N0} bytes' -f $_.Name, $_.Length | Write-Host
}
