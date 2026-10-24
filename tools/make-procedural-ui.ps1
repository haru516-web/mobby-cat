# Regenerate UI images that are pure gradients/shadows (no need for image generation)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$cam = "$root\app\assets\ui\camera"

function Save-VerticalScrim($path, $w, $h, $topAlpha, $bottomAlpha) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($y = 0; $y -lt $h; $y++) {
    $t = $y / ($h - 1)
    # smoothstep so the fade has no visible band
    $s = $t * $t * (3 - 2 * $t)
    $a = [int][math]::Round($topAlpha + ($bottomAlpha - $topAlpha) * $s)
    $c = [System.Drawing.Color]::FromArgb($a, 0, 0, 0)
    for ($x = 0; $x -lt $w; $x++) { $bmp.SetPixel($x, $y, $c) }
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function Save-SoftShadow($path, $w, $h, $maxAlpha) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cx = ($w - 1) / 2; $cy = ($h - 1) / 2
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $dx = ($x - $cx) / $cx; $dy = ($y - $cy) / $cy
      $d = [math]::Sqrt($dx * $dx + $dy * $dy)
      $a = if ($d -ge 1) { 0 } else { [int]($maxAlpha * [math]::Pow(1 - $d, 1.6)) }
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, 74, 59, 50))
    }
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Save-VerticalScrim "$cam\topbar-scrim.png" 1179 300 150 0
Save-VerticalScrim "$cam\bottombar-scrim.png" 1179 600 0 170
Save-SoftShadow "$cam\shadow-soft.png" 480 150 120
"done"
