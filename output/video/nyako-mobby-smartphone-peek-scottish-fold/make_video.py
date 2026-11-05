from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = Path(__file__).resolve().parent
ASSET_DIR = OUT_DIR / "assets"
AUDIO = ROOT / "assets" / "video-inputs" / "nyako-mobby-summer-night" / "audio" / "summer-night-fast-cuts.m4a"
FRAMES = [
    ("01", "01-ceiling-empty.png"),
    ("02", "02-upper-left-tilt.png"),
    ("03", "03-upside-down-top-right.png"),
    ("04", "04-right-edge-side-peek.png"),
    ("05", "05-lower-left-curl.png"),
    ("06", "06-bottom-right-paws-first.png"),
    ("07", "07-top-center-sneak.png"),
    ("08", "08-left-edge-wave.png"),
    ("09", "09-bottom-center-stretch.png"),
    ("10", "10-nose-first-top-left.png"),
]
OUTPUT = OUT_DIR / "nyako-mobby-smartphone-peek-scottish-fold.mp4"


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg was not found on PATH")
    if not AUDIO.is_file():
        raise FileNotFoundError(AUDIO)
    if OUTPUT.exists():
        raise FileExistsError(OUTPUT)

    frame_paths = [ASSET_DIR / folder / name for folder, name in FRAMES]
    for path in frame_paths:
        if not path.is_file():
            raise FileNotFoundError(path)

    with tempfile.TemporaryDirectory(prefix="scottish-fold-video-", dir=OUT_DIR) as temp_name:
        temp = Path(temp_name)
        concat = temp / "frames.ffconcat"
        lines = ["ffconcat version 1.0"]
        for index, path in enumerate(frame_paths):
            safe_path = path.resolve().as_posix().replace("'", "'\\''")
            lines.extend([f"file '{safe_path}'", "option framerate 60"])
            lines.append("duration 0.750" if index < 9 else "duration 0.850")
        last_path = frame_paths[-1].resolve().as_posix().replace("'", "'\\''")
        lines.extend([f"file '{last_path}'", "option framerate 60"])
        concat.write_text("\n".join(lines) + "\n", encoding="ascii")

        silent = temp / "silent.mp4"
        run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "scale=1080:1920:flags=lanczos,setsar=1", "-r", "60",
            "-frames:v", "456", "-an", "-c:v", "libx264", "-preset", "medium",
            "-crf", "18", "-pix_fmt", "yuv420p", str(silent),
        ])
        run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(silent), "-i", str(AUDIO),
            "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
            "-movflags", "+faststart", str(OUTPUT),
        ])
    print(OUTPUT)


if __name__ == "__main__":
    main()
