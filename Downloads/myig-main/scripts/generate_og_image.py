from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "og-image.png"
OUTPUT_JPG = ROOT / "public" / "og-image.jpg"
LOGO = ROOT / "public" / "searchoutfit-logo.png"

WIDTH = 1200
HEIGHT = 630

BG = "#121315"
PANEL = "#1B1C1F"
PANEL_SOFT = "#202126"
TEXT = "#F6F2EA"
MUTED = "#CEC5B8"
GOLD = "#B58A44"
GOLD_SOFT = "#E8D7B4"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def add_glow(base: Image.Image, box: tuple[int, int, int, int], color: str, blur: int, alpha: int) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    fill = ImageColor.getrgb(color) + (alpha,)
    draw.ellipse(box, fill=fill)
    overlay = overlay.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(overlay)


def draw_pill(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.rounded_rectangle(xy, radius=999, fill=fill, outline=outline)


def fit_logo(max_width: int, max_height: int) -> Image.Image:
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return logo


def text_box(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont, fill: str) -> tuple[int, int, int, int]:
    bbox = draw.textbbox(xy, text, font=font)
    draw.text(xy, text, font=font, fill=fill)
    return bbox


def main() -> None:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)

    # Background glow
    add_glow(canvas, (720, 10, 1170, 460), GOLD, 70, 34)
    add_glow(canvas, (830, 210, 1290, 720), "#D29B55", 90, 22)

    # Main content panels
    draw.rounded_rectangle((42, 42, WIDTH - 42, HEIGHT - 42), radius=34, fill="#16171A", outline="#2B2D32")
    draw.rounded_rectangle((660, 84, 1118, 546), radius=28, fill=PANEL)

    arial_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    arial = "/System/Library/Fonts/Supplemental/Arial.ttf"
    georgia = "/System/Library/Fonts/Supplemental/Georgia.ttf"
    georgia_italic = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"

    badge_font = load_font(arial_bold, 22)
    brand_font = load_font(arial_bold, 58)
    title_font = load_font(georgia, 86)
    accent_font = load_font(georgia_italic, 74)
    body_font = load_font(arial, 28)
    card_title_font = load_font(arial_bold, 24)
    card_body_font = load_font(arial, 20)

    draw_pill(draw, (88, 92, 378, 132), fill="#201A12", outline="#3A3227")
    draw.text((110, 100), "AI OUTFIT SEARCH TOOL", font=badge_font, fill=GOLD_SOFT)

    logo_small = fit_logo(92, 56)
    canvas.alpha_composite(logo_small, (88, 162))
    draw.text((194, 170), "SearchOutfit", font=brand_font, fill=TEXT)

    text_box(draw, (88, 270), "Find the", font=title_font, fill=TEXT)
    text_box(draw, (88, 352), "exact look", font=accent_font, fill=GOLD_SOFT)
    text_box(draw, (88, 434), "you saw.", font=title_font, fill=TEXT)

    body = "Turn any Instagram post, image URL, or screenshot into detected outfit items and shoppable product matches."
    draw.multiline_text((88, 528), body, font=body_font, fill=MUTED, spacing=10)

    # Right-side product-style panel
    draw.rounded_rectangle((694, 118, 1086, 512), radius=24, fill=PANEL_SOFT, outline="#32343B")

    logo_large = fit_logo(236, 142)
    logo_x = 694 + (392 - logo_large.width) // 2
    canvas.alpha_composite(logo_large, (logo_x, 154))

    demo_cards = [
        ("Paste a public post", "Instagram URL or screenshot"),
        ("AI detects the outfit", "Items, brand cues, and style"),
        ("Compare stores", "Prices, offers, and direct links"),
    ]
    card_y = 318
    for idx, (title, subtitle) in enumerate(demo_cards):
        top = card_y + idx * 62
        draw.rounded_rectangle((724, top, 1058, top + 48), radius=16, fill="#272930", outline="#363944")
        draw.ellipse((742, top + 15, 754, top + 27), fill=GOLD)
        draw.text((772, top + 8), title, font=card_title_font, fill=TEXT)
        draw.text((772, top + 30), subtitle, font=card_body_font, fill=MUTED)

    draw_pill(draw, (742, 486, 1036, 526), fill="#201A12")
    draw.text((774, 495), "Instagram, screenshots, direct matches", font=badge_font, fill=GOLD_SOFT)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    rgb = canvas.convert("RGB")
    rgb.save(OUTPUT, format="PNG", optimize=True)
    rgb.save(OUTPUT_JPG, format="JPEG", quality=92, optimize=True, progressive=True)


if __name__ == "__main__":
    main()
