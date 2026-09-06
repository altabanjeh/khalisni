"""Regenerate Khalsni brand + application-identity assets from the two supplied
source images. Design is never changed — only cropping of uniform background and
format/size derivatives.

Sources (business-supplied, do not edit):
    imges/logo/ds.jpeg                                   Arabic wordmark on blue
    imges/logo/WhatsApp Image 2026-04-23 at 6.55.41 PM.jpeg   checkmark app icon

Usage:  python scripts/generate_brand_assets.py
Requires: Pillow
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "frontend", "public")
BRAND = os.path.join(PUB, "brand")
BLUE = (0, 107, 185)  # #006BB9

WORDMARK_SRC = os.path.join(ROOT, "imges", "logo", "ds.jpeg")
APPICON_SRC = os.path.join(ROOT, "imges", "logo", "WhatsApp Image 2026-04-23 at 6.55.41 PM.jpeg")


def _resize(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.LANCZOS)


def build_app_icon() -> Image.Image:
    ic = Image.open(APPICON_SRC).convert("RGB")
    gray = ic.convert("L")
    non_white = Image.eval(gray, lambda p: 255 if p < 245 else 0)
    sq = ic.crop(non_white.getbbox())
    w, h = sq.size
    side = max(w, h)
    base = Image.new("RGB", (side, side), BLUE)
    base.paste(sq, ((side - w) // 2, (side - h) // 2))

    radius = int(side * 0.18)
    rounded = Image.new("L", (side, side), 0)
    ImageDraw.Draw(rounded).rounded_rectangle([0, 0, side - 1, side - 1], radius=radius, fill=255)
    clean = Image.composite(base, Image.new("RGB", (side, side), BLUE), rounded)

    os.makedirs(BRAND, exist_ok=True)
    clean.save(os.path.join(BRAND, "khalsni-app-icon.png"))
    rgba = clean.convert("RGBA")
    rgba.putalpha(rounded)
    rgba.save(os.path.join(BRAND, "khalsni-app-icon-rounded.png"))
    return clean


def build_wordmark() -> None:
    wm = Image.open(WORDMARK_SRC).convert("RGB")
    mask = Image.new("L", wm.size)
    mask.putdata([
        0 if (abs(p[0] - BLUE[0]) + abs(p[1] - BLUE[1]) + abs(p[2] - BLUE[2])) < 90 else 255
        for p in wm.getdata()
    ])
    tb = mask.getbbox()
    pad_x = int((tb[2] - tb[0]) * 0.14)
    pad_y = int((tb[3] - tb[1]) * 0.42)
    crop = (
        max(0, tb[0] - pad_x), max(0, tb[1] - pad_y),
        min(wm.size[0], tb[2] + pad_x), min(wm.size[1], tb[3] + pad_y),
    )
    trimmed = wm.crop(crop)
    trimmed.save(os.path.join(BRAND, "khalsni-wordmark.png"))
    trimmed.save(os.path.join(BRAND, "khalsni-wordmark.jpg"), quality=88)
    wm.save(os.path.join(BRAND, "khalsni-wordmark-square.png"))


def build_identity(clean: Image.Image) -> None:
    targets = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-48x48.png": 48,
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    for name, size in targets.items():
        _resize(clean, size).save(os.path.join(PUB, name))

    maskable = Image.new("RGB", (512, 512), BLUE)
    maskable.paste(_resize(clean, 400), (56, 56))
    maskable.save(os.path.join(PUB, "icon-maskable-512.png"))

    clean.save(os.path.join(PUB, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    icon = build_app_icon()
    build_wordmark()
    build_identity(icon)
    print("Brand + identity assets regenerated in frontend/public/")
