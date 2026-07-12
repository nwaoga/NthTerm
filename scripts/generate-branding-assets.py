"""Generate NthTerm Windows branding assets for Electron Builder and the renderer favicon."""
from __future__ import annotations

import struct
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
PUBLIC = ROOT / "public"

BG = (9, 13, 22, 255)  # midnight shell base
ACCENT = (189, 111, 255, 255)
TEXT = (219, 231, 245, 255)
SOFT = (148, 163, 184, 255)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_mark(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1, size // 32)
    radius = max(4, size // 5)
    rounded_rect(draw, (pad, pad, size - pad - 1, size - pad - 1), radius, BG)

    inset = size * 0.18
    rounded_rect(draw, (inset, inset, size - inset, size - inset), max(3, size // 10), (15, 23, 38, 255))

    bar_h = size * 0.08
    draw.rounded_rectangle(
        (inset, inset, size - inset, inset + bar_h),
        radius=max(2, size // 24),
        fill=(21, 28, 45, 255),
    )
    dot_y = inset + bar_h / 2
    for i, color in enumerate(((248, 113, 113, 255), (251, 191, 36, 255), (52, 211, 153, 255))):
        cx = inset + size * 0.08 + i * size * 0.08
        r = max(1.5, size * 0.025)
        draw.ellipse((cx - r, dot_y - r, cx + r, dot_y + r), fill=color)

    try:
        font = ImageFont.truetype("segoeui.ttf", size=int(size * 0.42))
    except OSError:
        font = ImageFont.load_default()

    glyph = "N"
    bbox = draw.textbbox((0, 0), glyph, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = inset + bar_h + (size - inset - bar_h - inset - th) / 2 - bbox[1] - size * 0.02
    draw.text((tx, ty), glyph, font=font, fill=TEXT)

    caret_w = size * 0.18
    caret_h = max(2, size * 0.035)
    cx0 = size / 2 - caret_w / 2
    cy0 = ty + th + size * 0.04
    draw.rounded_rectangle((cx0, cy0, cx0 + caret_w, cy0 + caret_h), radius=caret_h / 2, fill=ACCENT)

    return img


def png_bytes(img: Image.Image) -> bytes:
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def write_ico(path: Path, source: Image.Image, sizes: list[int]) -> None:
    """Write a multi-resolution ICO with PNG-compressed images (Vista+)."""
    images: list[tuple[int, bytes]] = []
    for size in sizes:
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        images.append((size, png_bytes(resized)))

    count = len(images)
    offset = 6 + 16 * count
    header = struct.pack("<HHH", 0, 1, count)
    directory = bytearray()
    blobs = bytearray()
    for size, data in images:
        width = 0 if size >= 256 else size
        height = 0 if size >= 256 else size
        directory += struct.pack(
            "<BBBBHHII",
            width,
            height,
            0,
            0,
            1,
            32,
            len(data),
            offset + len(blobs),
        )
        blobs += data

    path.write_bytes(header + directory + blobs)


def save_sidebar_bmp(path: Path) -> None:
    # NSIS welcome/finish sidebar: 164 x 314, 24-bit BMP
    width, height = 164, 314
    img = Image.new("RGB", (width, height), BG[:3])
    draw = ImageDraw.Draw(img)

    for y in range(height):
        t = y / (height - 1)
        color = (
            int(9 + (21 - 9) * t),
            int(13 + (28 - 13) * t),
            int(22 + (45 - 22) * t),
        )
        draw.line([(0, y), (width, y)], fill=color)

    mark = draw_mark(96).convert("RGBA")
    img.paste(mark, ((width - 96) // 2, 48), mark)

    try:
        title_font = ImageFont.truetype("segoeui.ttf", 18)
        sub_font = ImageFont.truetype("segoeui.ttf", 11)
    except OSError:
        title_font = ImageFont.load_default()
        sub_font = title_font

    title = "NthTerm"
    title_box = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_box[2] - title_box[0]
    draw.text(((width - title_width) / 2, 160), title, font=title_font, fill=TEXT[:3])

    subtitle = "Terminal workspaces"
    subtitle_box = draw.textbbox((0, 0), subtitle, font=sub_font)
    subtitle_width = subtitle_box[2] - subtitle_box[0]
    draw.text(((width - subtitle_width) / 2, 188), subtitle, font=sub_font, fill=SOFT[:3])

    draw.rounded_rectangle((42, 220, width - 42, 224), radius=2, fill=ACCENT[:3])
    img.save(path, format="BMP")


def save_header_bmp(path: Path) -> None:
    # NSIS header image: 150 x 57, 24-bit BMP
    width, height = 150, 57
    img = Image.new("RGB", (width, height), (15, 23, 38))
    draw = ImageDraw.Draw(img)
    mark = draw_mark(40).convert("RGBA")
    img.paste(mark, (10, (height - 40) // 2), mark)

    try:
        font = ImageFont.truetype("segoeui.ttf", 16)
    except OSError:
        font = ImageFont.load_default()

    draw.text((58, 18), "NthTerm", font=font, fill=TEXT[:3])
    img.save(path, format="BMP")


def main() -> None:
    BUILD.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    mark = draw_mark(1024)
    mark.save(BUILD / "icon.png", format="PNG")
    write_ico(BUILD / "icon.ico", mark, [16, 24, 32, 48, 64, 128, 256])
    write_ico(BUILD / "installerIcon.ico", mark, [16, 24, 32, 48, 64, 128, 256])
    write_ico(BUILD / "uninstallerIcon.ico", mark, [16, 24, 32, 48, 64, 128, 256])
    save_sidebar_bmp(BUILD / "installerSidebar.bmp")
    save_sidebar_bmp(BUILD / "uninstallerSidebar.bmp")
    save_header_bmp(BUILD / "installerHeader.bmp")
    write_ico(PUBLIC / "favicon.ico", mark, [16, 32, 48])
    mark.resize((32, 32), Image.Resampling.LANCZOS).save(PUBLIC / "favicon-32.png", format="PNG")

    print("Generated branding assets in build/ and public/")


if __name__ == "__main__":
    main()
