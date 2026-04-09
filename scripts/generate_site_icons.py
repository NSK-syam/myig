#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


PNG_SIZES = {
    "searchoutfit-favicon-48x48.png": 48,
    "searchoutfit-apple-touch-icon.png": 180,
    "searchoutfit-android-chrome-192x192.png": 192,
    "searchoutfit-android-chrome-512x512.png": 512,
}

DUPLICATES = {
    "searchoutfit-favicon-48x48.png": "favicon-48x48.png",
    "searchoutfit-apple-touch-icon.png": "apple-touch-icon.png",
    "searchoutfit-android-chrome-192x192.png": "android-chrome-192x192.png",
    "searchoutfit-android-chrome-512x512.png": "android-chrome-512x512.png",
    "searchoutfit-favicon.ico": "favicon.ico",
}


def build_square_logo(source_path: Path) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    size = max(source.width, source.height)
    background = source.getpixel((0, 0))
    canvas = Image.new("RGBA", (size, size), background)
    offset = ((size - source.width) // 2, (size - source.height) // 2)
    canvas.paste(source, offset, source)
    return canvas


def save_pngs(square_logo: Image.Image, output_dir: Path) -> None:
    for filename, size in PNG_SIZES.items():
        rendered = square_logo.resize((size, size), Image.Resampling.LANCZOS)
        rendered.save(output_dir / filename, format="PNG", optimize=True)


def save_favicons(square_logo: Image.Image, output_dir: Path) -> None:
    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    images = [square_logo.resize(size, Image.Resampling.LANCZOS) for size in favicon_sizes]
    images[0].save(
        output_dir / "searchoutfit-favicon.ico",
        format="ICO",
        append_images=images[1:],
        sizes=favicon_sizes,
    )


def duplicate_outputs(output_dir: Path) -> None:
    for source_name, duplicate_name in DUPLICATES.items():
        (output_dir / duplicate_name).write_bytes((output_dir / source_name).read_bytes())


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate site favicon and app icons from the current logo.")
    parser.add_argument(
        "--source",
        default="public/searchoutfit-logo.png",
        help="Path to the source logo asset.",
    )
    parser.add_argument(
        "--output-dir",
        default="public",
        help="Directory to write favicon and app icon assets.",
    )
    args = parser.parse_args()

    source_path = Path(args.source).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    square_logo = build_square_logo(source_path)
    save_pngs(square_logo, output_dir)
    save_favicons(square_logo, output_dir)
    duplicate_outputs(output_dir)


if __name__ == "__main__":
    main()
