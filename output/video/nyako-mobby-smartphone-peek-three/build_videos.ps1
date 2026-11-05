$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$videoRoot = Join-Path $repoRoot 'output\video'
$inputRoot = Join-Path $repoRoot 'assets\video-inputs\nyako-mobby-summer-night'
$audio = Join-Path $inputRoot 'audio\summer-night-fast-cuts.m4a'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$frameNames = @(
    '01-ceiling-empty.png',
    '02-upper-left-tilt.png',
    '03-upside-down-top-right.png',
    '04-right-edge-side-peek.png',
    '05-lower-left-curl.png',
    '06-bottom-right-paws-first.png',
    '07-top-center-sneak.png',
    '08-left-edge-wave.png',
    '09-bottom-center-stretch.png',
    '10-nose-first-top-left.png'
)
$breeds = @('maine-coon', 'ragdoll', 'russian-blue')

if (-not (Test-Path -LiteralPath $audio -PathType Leaf)) {
    throw "Audio input not found: $audio"
}

foreach ($breed in $breeds) {
    $folder = Join-Path $videoRoot "nyako-mobby-smartphone-peek-$breed"
    $assets = Join-Path $folder 'assets'
    $frames = @()
    for ($index = 0; $index -lt $frameNames.Count; $index++) {
        $number = ($index + 1).ToString('00')
        $frame = Join-Path (Join-Path $assets $number) $frameNames[$index]
        if (-not (Test-Path -LiteralPath $frame -PathType Leaf)) {
            throw "Generated still not found: $frame"
        }
        $frames += (Resolve-Path -LiteralPath $frame).Path
    }

    $target = Join-Path $folder "nyako-mobby-smartphone-peek-$breed.mp4"
    if (Test-Path -LiteralPath $target) {
        $version = 2
        do {
            $target = Join-Path $folder "nyako-mobby-smartphone-peek-$breed-v$version.mp4"
            $version++
        } while (Test-Path -LiteralPath $target)
    }

    $tempName = '.build-' + [guid]::NewGuid().ToString('N')
    $temp = Join-Path $folder $tempName
    New-Item -ItemType Directory -Path $temp | Out-Null
    try {
        $concat = Join-Path $temp 'frames.ffconcat'
        $lines = [System.Collections.Generic.List[string]]::new()
        $lines.Add('ffconcat version 1.0')
        for ($index = 0; $index -lt $frames.Count; $index++) {
            $safePath = $frames[$index].Replace('\', '/').Replace("'", "'\''")
            $lines.Add("file '$safePath'")
            $lines.Add('option framerate 60')
            $lines.Add($(if ($index -lt 9) { 'duration 0.750' } else { 'duration 0.850' }))
        }
        $lastSafePath = $frames[-1].Replace('\', '/').Replace("'", "'\''")
        $lines.Add("file '$lastSafePath'")
        $lines.Add('option framerate 60')
        [System.IO.File]::WriteAllLines($concat, $lines, [System.Text.Encoding]::ASCII)

        $silent = Join-Path $temp 'silent.mp4'
        $encodeArgs = @(
            '-hide_banner', '-loglevel', 'error', '-y',
            '-f', 'concat', '-safe', '0', '-i', $concat,
            '-vf', 'scale=1080:1920:flags=lanczos,setsar=1',
            '-r', '60', '-frames:v', '456', '-an',
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
            '-pix_fmt', 'yuv420p', $silent
        )
        & $ffmpeg @encodeArgs
        if ($LASTEXITCODE -ne 0) {
            throw "ffmpeg video encode failed for $breed (exit $LASTEXITCODE)"
        }

        $muxArgs = @(
            '-hide_banner', '-loglevel', 'error',
            '-i', $silent, '-i', $audio,
            '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy',
            '-movflags', '+faststart', $target
        )
        & $ffmpeg @muxArgs
        if ($LASTEXITCODE -ne 0) {
            throw "ffmpeg mux failed for $breed (exit $LASTEXITCODE)"
        }
        Write-Output $target
    }
    finally {
        $fullFolder = [System.IO.Path]::GetFullPath($folder) + [System.IO.Path]::DirectorySeparatorChar
        $fullTemp = [System.IO.Path]::GetFullPath($temp)
        if ($fullTemp.StartsWith($fullFolder, [System.StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $fullTemp -Recurse -Force
        }
    }
}
