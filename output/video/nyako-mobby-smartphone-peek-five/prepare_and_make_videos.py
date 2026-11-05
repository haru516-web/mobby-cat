from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = Path(__file__).resolve().parent
ASSET_DIR = OUT_DIR / "assets"
STORYBOARD_DIR = OUT_DIR / "storyboards"
INPUT_DIR = ROOT / "assets" / "video-inputs" / "nyako-mobby-summer-night"
AUDIO = INPUT_DIR / "audio" / "summer-night-fast-cuts.m4a"
WIDTH, HEIGHT, FPS = 1080, 1920, 60
SOURCE_FRAME_SIZE = (940, 1672)

VIDEOS = [
    ("01-bengal", "01-bengal"),
    ("02-siamese-seal-point", "02-siamese-seal-point"),
    ("03-british-shorthair", "03-british-shorthair"),
    ("04-persian", "04-persian"),
    ("05-toyger", "05-toyger"),
]

POSES = [
    "01-ceiling-empty.png",
    "02-upper-left-tilt.png",
    "03-upside-down-top-right.png",
    "04-right-edge-side-peek.png",
    "05-lower-left-curl.png",
    "06-bottom-right-paws-first.png",
    "07-top-center-sneak.png",
    "08-left-edge-wave.png",
    "09-bottom-center-stretch.png",
    "10-nose-first-top-left.png",
]

SHEETS = [
    ("03-06", POSES[2:6]),
    ("07-10", POSES[6:10]),
]


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    for version in range(2, 1000):
        candidate = path.with_name(f"{path.stem}-v{version}{path.suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"Could not find an unused filename for {path}")


def crop_storyboards() -> None:
    for video_id, asset_folder in VIDEOS:
        target_dir = ASSET_DIR / asset_folder
        for group, filenames in SHEETS:
            sheet_path = STORYBOARD_DIR / f"{video_id}-{group}.png"
            if not sheet_path.is_file():
                raise FileNotFoundError(sheet_path)
            sheet = Image.open(sheet_path).convert("RGB")
            width, height = sheet.size
            x_mid, y_mid = width // 2, height // 2
            boxes = [
                (0, 0, x_mid, y_mid),
                (x_mid, 0, width, y_mid),
                (0, y_mid, x_mid, height),
                (x_mid, y_mid, width, height),
            ]
            for filename, box in zip(filenames, boxes):
                frame_path = target_dir / filename
                if frame_path.exists():
                    continue
                frame = sheet.crop(box).resize(SOURCE_FRAME_SIZE, Image.Resampling.LANCZOS)
                frame.save(frame_path, compress_level=2)

        # Normalize all generated frames and the empty opening to the same portrait size.
        for filename in POSES:
            frame_path = target_dir / filename
            if not frame_path.is_file():
                raise FileNotFoundError(frame_path)
            image = Image.open(frame_path).convert("RGB")
            if image.size != SOURCE_FRAME_SIZE:
                image.resize(SOURCE_FRAME_SIZE, Image.Resampling.LANCZOS).save(frame_path, compress_level=2)


def make_videos() -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg was not found on PATH")
    if not AUDIO.is_file():
        raise FileNotFoundError(AUDIO)

    with tempfile.TemporaryDirectory(prefix="nyako-smartphone-peek-", dir=OUT_DIR) as temp_name:
        temp_root = Path(temp_name)
        for video_id, asset_folder in VIDEOS:
            source_dir = ASSET_DIR / asset_folder
            work_dir = temp_root / asset_folder
            work_dir.mkdir()
            concat = work_dir / "frames.ffconcat"
            lines = ["ffconcat version 1.0"]
            frame_paths = [source_dir / pose for pose in POSES]
            for index, path in enumerate(frame_paths):
                safe_path = path.resolve().as_posix().replace("'", "'\\''")
                lines.extend([f"file '{safe_path}'", "option framerate 60"])
                lines.append("duration 0.750" if index < 9 else "duration 0.850")
            last_path = frame_paths[-1].resolve().as_posix().replace("'", "'\\''")
            lines.extend([f"file '{last_path}'", "option framerate 60"])
            concat.write_text("\n".join(lines) + "\n", encoding="ascii")

            silent = work_dir / "silent.mp4"
            run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-f", "concat", "-safe", "0", "-i", str(concat),
                "-vf", "scale=1080:1920:flags=lanczos,setsar=1", "-r", str(FPS),
                "-frames:v", "456", "-an", "-c:v", "libx264", "-preset", "medium",
                "-crf", "18", "-pix_fmt", "yuv420p", str(silent),
            ])
            output = unique_path(OUT_DIR / f"nyako-mobby-smartphone-peek-summer-night-{video_id}.mp4")
            run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(silent), "-i", str(AUDIO),
                "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
                "-movflags", "+faststart", str(output),
            ])
            print(output)


if __name__ == "__main__":
    crop_storyboards()
    make_videos()
