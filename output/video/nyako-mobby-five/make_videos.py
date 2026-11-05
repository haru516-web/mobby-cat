from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = Path(__file__).resolve().parent
INPUT_DIR = ROOT / "assets" / "video-inputs" / "nyako-mobby-summer-night"
CHARACTER_DIR = ROOT / "assets" / "cat-mobbies" / "characters"
AUDIO = INPUT_DIR / "audio" / "summer-night-fast-cuts.m4a"
BACKGROUND = OUT_DIR / "summer-night-room-background.png"
WIDTH, HEIGHT, FPS = 1080, 1920, 60

# Ten still compositions follow the original 0.75 s beat grid. Each character
# has its own comic timing through framing and angle, with hard cuts only.
VIDEOS = [
    (
        "01-bengal",
        "bengal",
        [
            (90, 245, 990, 13), (1015, 160, 1100, 180),
            (1085, 850, 900, -3), (105, 1690, 1040, 23),
            (925, 1925, 930, 180), (540, 250, 850, 0),
            (-45, 1015, 890, -13), (540, 1810, 1120, 0),
            (300, 285, 1420, -19),
        ],
    ),
    (
        "02-siamese-seal-point",
        "siamese-seal-point",
        [
            (155, 330, 820, -17), (975, 205, 1120, 180),
            (1110, 890, 790, -9), (55, 1745, 1020, 2),
            (1010, 1950, 850, 180), (525, 275, 900, 5),
            (-20, 935, 960, 12), (555, 1810, 1080, 180),
            (250, 365, 1320, 13),
        ],
    ),
    (
        "03-british-shorthair",
        "british-shorthair",
        [
            (145, 260, 900, 22), (1010, 140, 1180, 180),
            (1110, 980, 1010, 1), (105, 1650, 1140, -12),
            (930, 1900, 1000, 180), (540, 240, 970, 0),
            (-10, 1085, 970, 7), (540, 1855, 1210, 0),
            (250, 315, 1460, -12),
        ],
    ),
    (
        "04-persian",
        "persian",
        [
            (175, 350, 1010, 25), (1000, 205, 1220, 180),
            (1100, 1000, 1080, 0), (105, 1735, 1180, 16),
            (890, 1985, 960, 180), (540, 310, 930, -3),
            (-15, 975, 950, -12), (535, 1800, 1220, 0),
            (275, 295, 1460, -18),
        ],
    ),
    (
        "05-toyger",
        "toyger",
        [
            (95, 235, 925, -12), (1030, 105, 1080, 180),
            (1080, 930, 925, -5), (85, 1655, 1020, 20),
            (930, 1935, 960, 180), (540, 300, 850, 2),
            (-5, 990, 930, 15), (540, 1825, 1120, 0),
            (300, 260, 1380, -20),
        ],
    ),
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


def paste_character(background: Image.Image, character: Image.Image, layout: tuple[int, int, int, int]) -> Image.Image:
    center_x, center_y, target_size, angle = layout
    scale = target_size / max(character.size)
    resized = character.resize(
        (round(character.width * scale), round(character.height * scale)),
        Image.Resampling.LANCZOS,
    )
    if angle:
        resized = resized.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    x = round(center_x - resized.width / 2)
    y = round(center_y - resized.height / 2)
    frame = background.copy()
    frame.alpha_composite(resized, (x, y))
    return frame


def main() -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg was not found on PATH")
    if not AUDIO.is_file() or not BACKGROUND.is_file():
        raise FileNotFoundError("The supplied audio or generated background is missing")

    background = Image.open(BACKGROUND).convert("RGB").resize(
        (WIDTH, HEIGHT), Image.Resampling.LANCZOS
    ).convert("RGBA")

    with tempfile.TemporaryDirectory(prefix="nyako-mobby-five-", dir=OUT_DIR) as temp_name:
        temp = Path(temp_name)
        for video_id, character_id, layouts in VIDEOS:
            char_path = CHARACTER_DIR / f"{character_id}.png"
            character = Image.open(char_path).convert("RGBA")
            alpha = character.getchannel("A")
            bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
            if bbox:
                character = character.crop(bbox)

            frame_dir = temp / video_id
            frame_dir.mkdir()
            frames: list[Path] = []
            empty_path = frame_dir / "frame-01.png"
            background.save(empty_path, compress_level=2)
            frames.append(empty_path)
            for index, layout in enumerate(layouts, start=2):
                frame_path = frame_dir / f"frame-{index:02d}.png"
                paste_character(background, character, layout).save(frame_path, compress_level=2)
                frames.append(frame_path)

            concat_path = frame_dir / "images.ffconcat"
            lines = ["ffconcat version 1.0"]
            for index, frame in enumerate(frames):
                safe_path = frame.resolve().as_posix().replace("'", "'\\''")
                lines.extend([f"file '{safe_path}'", "option framerate 60"])
                if index < 9:
                    lines.append("duration 0.750")
                else:
                    lines.append("duration 0.850")
            last_safe_path = frames[-1].resolve().as_posix().replace("'", "'\\''")
            lines.extend([f"file '{last_safe_path}'", "option framerate 60"])
            concat_path.write_text("\n".join(lines) + "\n", encoding="ascii")

            silent_video = frame_dir / "silent.mp4"
            run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-f", "concat", "-safe", "0", "-i", str(concat_path),
                "-vf", "scale=1080:1920:flags=lanczos,setsar=1", "-r", str(FPS),
                "-frames:v", "456", "-an", "-c:v", "libx264", "-preset", "medium",
                "-crf", "18", "-pix_fmt", "yuv420p", str(silent_video),
            ])
            output = unique_path(OUT_DIR / f"nyako-mobby-peek-summer-night-{video_id}.mp4")
            run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(silent_video), "-i", str(AUDIO),
                "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
                "-movflags", "+faststart", str(output),
            ])
            print(output)


if __name__ == "__main__":
    main()
