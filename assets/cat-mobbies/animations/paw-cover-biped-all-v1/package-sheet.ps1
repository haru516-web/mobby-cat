[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SourceImage,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$Ffmpeg = 'ffmpeg'
)

$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $SourceImage).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
Add-Type -AssemblyName System.Drawing

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempPath = Join-Path $tempRoot ('mobby-paw-cover-' + [guid]::NewGuid().ToString('N'))
$framesPath = Join-Path $tempPath 'frames'
New-Item -ItemType Directory -Path $framesPath -Force | Out-Null

try {
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    $sheet = [System.Drawing.Bitmap]::new(2048, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($sheet)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 2048, 1024), 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
      }
      finally { $graphics.Dispose() }
      $sheet.Save((Join-Path $outputPath 'spritesheet.png'), [System.Drawing.Imaging.ImageFormat]::Png)
      for ($index = 0; $index -lt 8; $index++) {
        $column = $index % 4
        $row = [math]::Floor($index / 4)
        $rectangle = [System.Drawing.Rectangle]::new($column * 512, $row * 512, 512, 512)
        $frame = $sheet.Clone($rectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try { $frame.Save((Join-Path $framesPath ("{0:D2}.png" -f $index)), [System.Drawing.Imaging.ImageFormat]::Png) }
        finally { $frame.Dispose() }
      }
    }
    finally { $sheet.Dispose() }
  }
  finally { $source.Dispose() }

  $lines = [System.Collections.Generic.List[string]]::new()
  for ($index = 0; $index -lt 7; $index++) {
    $lines.Add(("file 'frames/{0:D2}.png'" -f $index))
    $lines.Add('duration 0.166667')
  }
  $lines.Add("file 'frames/07.png'")
  $lines.Add('duration 0.833333')
  $lines.Add("file 'frames/07.png'")
  $listPath = Join-Path $tempPath 'frames.txt'
  [System.IO.File]::WriteAllLines($listPath, $lines, [System.Text.Encoding]::ASCII)

  Push-Location $tempPath
  try {
    & $Ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i 'frames.txt' -t 2 -filter_complex 'color=c=0xF5F0E7:s=512x512:r=30:d=2[bg];[0:v]fps=30,format=rgba[fg];[bg][fg]overlay=shortest=1:format=auto,format=yuv420p[v]' -map '[v]' -an -c:v libx264 -crf 18 -preset medium -movflags +faststart (Join-Path $outputPath 'preview.mp4')
    if ($LASTEXITCODE -ne 0) { throw 'MP4 export failed' }
    & $Ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i 'frames.txt' -t 2 -vf 'fps=30,format=yuva420p' -an -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -deadline good -cpu-used 2 -auto-alt-ref 0 (Join-Path $outputPath 'transparent.webm')
    if ($LASTEXITCODE -ne 0) { throw 'WebM export failed' }
  }
  finally { Pop-Location }
}
finally {
  $resolvedTemp = [System.IO.Path]::GetFullPath($tempPath)
  if ($resolvedTemp.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
  }
}
