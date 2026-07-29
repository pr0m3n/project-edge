"""
ProjectEdge PDF útmutatók — közös design rendszer.

A korábbi PDF a weboldalétól és a levelekétől is eltérő palettát használt
(#F3F1EB papír, #303841 tinta, halvány szürke keretek). Ez a modul a Resend
levélsablon és a weboldal nyelvét viszi át PDF-be:

  * sötét (#1c1d20 / #24262b) borító és kiemelt oldalak, ember (#ff5722) sávval,
  * #eeede8 papír a tartalmi oldalakon (ez a levél body háttere),
  * monospace „// projectedge.hu" kickerek és terminál blokk,
  * nagy, fekete-súlyú címek, aqua (#76abae) másodlagos kiemelés,
  * pill címkék és kerek CTA-szerű linkchipek.

Fontos technikai javítás a régi scripthez képest: `registerFontFamily` nélkül a
reportlab CSENDBEN eldobta a `<b>` tageket, ezért a bekezdéseken belüli
kiemelések nem látszottak félkövérnek. Itt regisztráljuk a családot.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
GUIDES_DIR = ROOT / "public/guides"
OUTPUT_DIR = ROOT / "output/pdf"
LOGO_WHITE = ROOT / "public/logo/pe-mark-white.png"
LOGO_INK = ROOT / "public/logo/pe-mark-ink.png"

W, H = A4

# ── Paletta (weboldal + levél) ───────────────────────────────────────────────
NIGHT = colors.HexColor("#1c1d20")
CARBON = colors.HexColor("#24262b")
PAPER = colors.HexColor("#eeede8")
WHITE = colors.HexColor("#ffffff")
EMBER = colors.HexColor("#ff5722")
AQUA = colors.HexColor("#76abae")
INK = colors.HexColor("#202a2f")
MUTED = colors.HexColor("#6f7a72")
LINE = colors.HexColor("#dedcd4")
DIM = colors.HexColor("#8a8a84")
ON_DARK = colors.HexColor("#d8dad6")
ON_DARK_DIM = colors.HexColor("#9a9a96")
DARK_CARD = colors.HexColor("#2b2d33")
DARK_LINE = colors.HexColor("#3a3c43")

MARGIN = 40
CONTENT_W = W - 2 * MARGIN

_FONT_CANDIDATES = {
    "PE": [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    "PE-Bold": [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "PE-Black": [
        "/System/Library/Fonts/Supplemental/Arial Black.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "PE-Mono": [
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ],
    "PE-Mono-Bold": [
        "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    ],
}


def register_fonts():
    """Betűk regisztrálása az elérhető rendszerfájlokból, hiányzó változatra visszalépéssel."""
    resolved = {}
    for name, candidates in _FONT_CANDIDATES.items():
        for candidate in candidates:
            if Path(candidate).exists():
                pdfmetrics.registerFont(TTFont(name, candidate))
                resolved[name] = candidate
                break

    if "PE-Black" not in resolved and "PE-Bold" in resolved:
        pdfmetrics.registerFont(TTFont("PE-Black", resolved["PE-Bold"]))
    if "PE-Mono-Bold" not in resolved and "PE-Mono" in resolved:
        pdfmetrics.registerFont(TTFont("PE-Mono-Bold", resolved["PE-Mono"]))

    missing = [name for name in ("PE", "PE-Bold", "PE-Mono") if name not in resolved]
    if missing:
        raise RuntimeError(f"Nem találtam betűtípust ezekhez: {', '.join(missing)}")

    # Ez hiányzott korábban: enélkül a <b>/<i> a Paragraph-ban nem érvényesül.
    pdfmetrics.registerFontFamily("PE", normal="PE", bold="PE-Bold", italic="PE", boldItalic="PE-Bold")
    pdfmetrics.registerFontFamily(
        "PE-Mono", normal="PE-Mono", bold="PE-Mono-Bold", italic="PE-Mono", boldItalic="PE-Mono-Bold"
    )
    return resolved


_WHITE_MARK_CACHE = {}


def white_mark():
    """
    Tömör fehér PE jel a sötét oldalakhoz.

    A `pe-mark-white.png` áttetsző (a weboldalon és a levélben ez jól működik,
    PDF-ben viszont fakónak látszik a sötét háttéren). Ezért a jel maszkját a
    tinta változatból építjük fel, és tiszta fehérre színezzük. Pillow nélkül
    visszalépünk az eredeti fájlra.
    """
    if "reader" in _WHITE_MARK_CACHE:
        return _WHITE_MARK_CACHE["reader"]

    try:
        from PIL import Image, ImageOps

        source = Image.open(str(LOGO_INK)).convert("RGBA")

        # Mindkét logófájl fél-áttetsző exportált (a weboldalon és a levélben ez
        # nem tűnik fel, PDF-ben viszont fakó lesz tőle a jel). Ezért a formát
        # világosságból nyerjük ki, autocontraszttal felerősítjük, majd élesre
        # vágjuk — így az opacitástól függetlenül tömör maszkot kapunk.
        flat = Image.alpha_composite(Image.new("RGBA", source.size, (255, 255, 255, 255)), source).convert("L")
        mask = ImageOps.autocontrast(flat.point(lambda value: 255 - value)).point(
            lambda value: 255 if value > 96 else 0
        )

        # A jelet a sötét háttérre égetjük (RGB, alfa nélkül) — a sötét lapok
        # háttere itt mindenhol egyszínű NIGHT, tehát nem látszik a beégetés.
        night = tuple(int(round(channel * 255)) for channel in (NIGHT.red, NIGHT.green, NIGHT.blue))
        mark = Image.new("RGB", source.size, night)
        mark.paste(Image.new("RGB", source.size, (255, 255, 255)), mask=mask)
        reader = ImageReader(mark)
    except Exception:  # noqa: BLE001 — bármilyen képhiba esetén az eredeti fájl megteszi
        reader = ImageReader(str(LOGO_WHITE))

    _WHITE_MARK_CACHE["reader"] = reader
    return reader


def draw_check(c, x, y, size=9, color=WHITE):
    """Vektoros pipa. Az Arial nem tartalmazza a ✓ karaktert — üres négyzet lett belőle."""
    c.setStrokeColor(color)
    c.setLineWidth(max(1.4, size * 0.17))
    c.setLineCap(1)
    path = c.beginPath()
    path.moveTo(x - size * 0.42, y + size * 0.02)
    path.lineTo(x - size * 0.10, y - size * 0.32)
    path.lineTo(x + size * 0.44, y + size * 0.34)
    c.drawPath(path, stroke=1, fill=0)


def draw_arrow(c, x, y, size=8, color=AQUA):
    """Vektoros „kinyíló" nyíl a linkchipekhez (a ↗ karakter szintén hiányzik)."""
    c.setStrokeColor(color)
    c.setLineWidth(1.4)
    c.setLineCap(1)
    path = c.beginPath()
    path.moveTo(x - size * 0.35, y - size * 0.35)
    path.lineTo(x + size * 0.35, y + size * 0.35)
    c.drawPath(path, stroke=1, fill=0)
    head = c.beginPath()
    head.moveTo(x + size * 0.35, y - size * 0.05)
    head.lineTo(x + size * 0.35, y + size * 0.35)
    head.lineTo(x - size * 0.05, y + size * 0.35)
    c.drawPath(head, stroke=1, fill=0)


def style(size=10, color=INK, leading=None, font="PE"):
    return ParagraphStyle(
        "pe",
        fontName=font,
        fontSize=size,
        leading=leading or size * 1.45,
        textColor=color,
    )


def text_height(text, width, st):
    return Paragraph(text, st).wrap(width, 10_000)[1]


def draw_text(c, text, x, y, width, st):
    """Szöveg kirajzolása felső élhez igazítva. A visszatérési érték az alsó él y-ja."""
    item = Paragraph(text, st)
    _, height = item.wrap(width, 10_000)
    item.drawOn(c, x, y - height)
    return y - height


# ── Oldalvázak ───────────────────────────────────────────────────────────────
def page_base(c, section, page_no, dark=False):
    c.setFillColor(NIGHT if dark else PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(EMBER)
    c.rect(0, H - 9, W, 9, fill=1, stroke=0)
    c.drawImage(
        white_mark() if dark else str(LOGO_INK),
        MARGIN,
        H - 52,
        width=46,
        height=25,
        preserveAspectRatio=True,
        mask="auto",
    )
    c.setFont("PE-Mono", 8)
    c.setFillColor(ON_DARK_DIM if dark else DIM)
    c.drawRightString(W - MARGIN, H - 40, f"{section.upper()}  /  {page_no:02d}")


def footer(c, guide_label, dark=False):
    c.setStrokeColor(DARK_LINE if dark else LINE)
    c.setLineWidth(1)
    c.line(MARGIN, 34, W - MARGIN, 34)
    c.setFont("PE-Mono", 7.5)
    c.setFillColor(ON_DARK_DIM if dark else DIM)
    c.drawString(MARGIN, 21, "projectedge.hu")
    c.drawRightString(W - MARGIN, 21, guide_label)


def page_heading(c, number, title, lead=None, dark=False):
    """Szakaszcím: ember sorszám, nagy fekete-súlyú cím, halkabb bevezető."""
    y = H - 86
    c.setFillColor(EMBER)
    c.setFont("PE-Mono-Bold", 9)
    c.drawString(MARGIN, y, number.upper())
    y -= 20
    y = draw_text(c, title, MARGIN, y, CONTENT_W, style(25, WHITE if dark else INK, 27, "PE-Black"))
    if lead:
        y -= 8
        y = draw_text(c, lead, MARGIN, y, CONTENT_W, style(10.5, ON_DARK if dark else MUTED, 15.5))
    return y - 18


# ── Építőelemek ──────────────────────────────────────────────────────────────
def step_card(c, x, y, width, badge, title, body, dark=False, accent=AQUA):
    """Sorszámozott kártya, a szöveg magasságához méretezve (nincs üres alsó sáv)."""
    pad = 16
    text_x = x + pad + 30
    text_w = width - pad * 2 - 30
    body_st = style(9.5, ON_DARK if dark else MUTED, 14)
    height = max(58, text_height(body, text_w, body_st) + 40)

    c.setFillColor(DARK_CARD if dark else WHITE)
    c.setStrokeColor(DARK_LINE if dark else LINE)
    c.setLineWidth(1)
    c.roundRect(x, y - height, width, height, 13, fill=1, stroke=1)

    c.setFillColor(accent)
    c.circle(x + pad + 11, y - 22, 11.5, fill=1, stroke=0)
    if badge == "check":
        draw_check(c, x + pad + 11, y - 22, 11)
    else:
        c.setFillColor(WHITE)
        c.setFont("PE-Bold", 9)
        c.drawCentredString(x + pad + 11, y - 25.4, badge)

    c.setFillColor(WHITE if dark else INK)
    c.setFont("PE-Bold", 11.5)
    c.drawString(text_x, y - 26, title)
    draw_text(c, body, text_x, y - 34, text_w, body_st)
    return y - height - 10


_CALLOUT_TONES = {
    "ember": (EMBER, WHITE, WHITE),
    "aqua": (colors.HexColor("#e6efef"), INK, colors.HexColor("#3c4f52")),
    "dark": (CARBON, WHITE, ON_DARK),
}


def callout(c, x, y, width, title, body, tone="ember", bottom=None):
    """
    Kiemelt blokk — a levél ember CTA-sávjának PDF megfelelője.

    `bottom` megadásával a blokk alsó éle kerül a megadott y-ra (a borítón így
    ül a lap aljára ahelyett, hogy nagy üres sáv maradna alatta).
    """
    fill, title_color, body_color = _CALLOUT_TONES[tone]

    pad = 18
    title_st = style(12, title_color, 16, "PE-Bold")
    body_st = style(10, body_color, 15)
    height = text_height(title, width - pad * 2, title_st) + text_height(body, width - pad * 2, body_st) + pad * 2 + 4
    if bottom is not None:
        y = bottom + height

    c.setFillColor(fill)
    c.roundRect(x, y - height, width, height, 15, fill=1, stroke=0)
    inner = draw_text(c, title, x + pad, y - pad + 4, width - pad * 2, title_st)
    draw_text(c, body, x + pad, inner - 4, width - pad * 2, body_st)
    return y - height - 10


def terminal(c, x, y, width, label, lines):
    """Terminál blokk — ugyanaz a motívum, mint a ProjectEdge levelekben."""
    line_h = 15
    height = 34 + line_h * len(lines) + 12

    c.setFillColor(CARBON)
    c.roundRect(x, y - height, width, height, 11, fill=1, stroke=0)
    c.setStrokeColor(DARK_LINE)
    c.setLineWidth(1)
    c.line(x, y - 30, x + width, y - 30)

    for index, dot_color in enumerate((EMBER, colors.HexColor("#4a4c52"), colors.HexColor("#4a4c52"))):
        c.setFillColor(dot_color)
        c.circle(x + 16 + index * 13, y - 15, 4, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#8f9096"))
    c.setFont("PE-Mono", 8.5)
    c.drawString(x + 60, y - 18, label)

    text_y = y - 30 - 18
    for line in lines:
        prefix, _, rest = line.partition(" ")
        c.setFillColor(EMBER)
        c.setFont("PE-Mono", 9.5)
        c.drawString(x + 16, text_y, prefix)
        c.setFillColor(colors.HexColor("#c7c8cc"))
        c.drawString(x + 16 + c.stringWidth(prefix + " ", "PE-Mono", 9.5), text_y, rest)
        text_y -= line_h
    return y - height - 10


def tags(c, x, y, items, dark=False):
    """Pill címkék — a levél tag-sávjának megfelelője."""
    cursor_x = x
    for item in items:
        width = c.stringWidth(item, "PE-Bold", 8.5) + 22
        if cursor_x + width > W - MARGIN:
            cursor_x = x
            y -= 24
        c.setStrokeColor(AQUA if dark else colors.HexColor("#c9cfc7"))
        c.setLineWidth(1)
        c.roundRect(cursor_x, y - 16, width, 18, 9, fill=0, stroke=1)
        c.setFillColor(AQUA if dark else colors.HexColor("#57635a"))
        c.setFont("PE-Bold", 8.5)
        c.drawCentredString(cursor_x + width / 2, y - 11.5, item)
        cursor_x += width + 7
    return y - 26


def link_chip(c, x, y, label, url, dark=False):
    """Kattintható linkchip. A régi PDF-ben a hivatkozások sima szövegként álltak."""
    width = c.stringWidth(label, "PE-Bold", 9) + 36
    height = 22
    c.setFillColor(CARBON if dark else INK)
    c.roundRect(x, y - height, width, height, 11, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("PE-Bold", 9)
    c.drawString(x + 13, y - 14.5, label)
    draw_arrow(c, x + width - 14, y - 11)
    c.linkURL(url, (x, y - height, x + width, y), relative=0, thickness=0)
    return width


def link_row(c, x, y, links, dark=False):
    cursor_x = x
    for label, url in links:
        if cursor_x + c.stringWidth(label, "PE-Bold", 9) + 40 > W - MARGIN:
            cursor_x = x
            y -= 28
        cursor_x += link_chip(c, cursor_x, y, label, url, dark) + 8
    return y - 32


def checklist(c, x, y, width, items):
    for item in items:
        st = style(10.5, INK, 14.5, "PE-Bold")
        height = max(40, text_height(item, width - 76, st) + 24)
        c.setFillColor(WHITE)
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.roundRect(x, y - height, width, height, 11, fill=1, stroke=1)
        c.setStrokeColor(AQUA)
        c.setLineWidth(1.6)
        c.roundRect(x + 16, y - height / 2 - 9, 18, 18, 5, fill=0, stroke=1)
        draw_text(c, item, x + 46, y - (height - text_height(item, width - 76, st)) / 2, width - 76, st)
        y -= height + 8
    return y


def shot(c, path, x, y, width, caption, crop=None, marker=None):
    """
    Képernyőkép fehér kerettel.

    `crop` = (bal, felső, jobb, alsó) 0..1 arányban — így a lényeges rész nagyban
    látszik, nem az egész böngészőablak lekicsinyítve (ez volt a régi PDF egyik
    fő olvashatósági problémája).
    """
    reader = _image_reader(path, crop)
    iw, ih = reader.getSize()
    height = width * ih / iw

    # Defenzív: ha korábban alfás színnel rajzoltunk, a kép ne örökölje azt.
    c.setFillAlpha(1)
    c.setStrokeAlpha(1)
    c.setFillColor(WHITE)
    c.roundRect(x - 5, y - height - 5, width + 10, height + 10, 12, fill=1, stroke=0)
    c.drawImage(reader, x, y - height, width=width, height=height)

    if marker:
        mx, my, number = marker
        c.setFillColor(EMBER)
        c.circle(x + width * mx, y - height * my, 11, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("PE-Bold", 9)
        c.drawCentredString(x + width * mx, y - height * my - 3.2, str(number))

    c.setFillColor(MUTED)
    c.setFont("PE-Mono", 7.5)
    c.drawString(x, y - height - 17, caption)
    return y - height - 30


def _image_reader(path, crop):
    if not crop:
        return ImageReader(str(path))
    try:
        from PIL import Image
    except ImportError:  # Pillow nélkül a vágás kimarad, a PDF ettől még elkészül.
        return ImageReader(str(path))

    image = Image.open(str(path))
    iw, ih = image.size
    left, top, right, bottom = crop
    box = (int(iw * left), int(ih * top), int(iw * right), int(ih * bottom))
    return ImageReader(image.crop(box))


# ── Borító ───────────────────────────────────────────────────────────────────
def cover(c, eyebrow, title_lines, subtitle, terminal_label, terminal_lines, promise_title, promise_body, tag_items):
    c.setFillColor(NIGHT)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(EMBER)
    c.rect(0, H - 14, W, 14, fill=1, stroke=0)

    # Halk fénykörök — a weboldal hero hangulata.
    #
    # saveState/restoreState nélkül az áttelítettség (alfás kitöltőszín) a
    # grafikus állapotban maradna, és a KÖVETKEZŐ rajzolás — a logó — is
    # átvenné: emiatt látszott a jel fakó szürkének a tömör fehér helyett.
    c.saveState()
    c.setFillColor(colors.Color(1, 0.34, 0.13, 0.13))
    c.circle(W - 60, H - 230, 150, fill=1, stroke=0)
    c.setFillColor(colors.Color(0.46, 0.67, 0.68, 0.10))
    c.circle(90, 190, 165, fill=1, stroke=0)
    c.restoreState()

    c.drawImage(white_mark(), MARGIN, H - 82, width=96, height=52, preserveAspectRatio=True, mask="auto")
    c.setFont("PE-Mono", 9)
    c.setFillColor(ON_DARK_DIM)
    c.drawRightString(W - MARGIN, H - 56, "DIGITAL BUILD STUDIO")

    y = H - 152
    c.setFillColor(EMBER)
    c.rect(MARGIN, y - 22, CONTENT_W, 26, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("PE-Bold", 9.5)
    c.drawCentredString(W / 2, y - 14, eyebrow.upper())

    y -= 58
    c.setFont("PE-Mono", 10)
    c.setFillColor(colors.HexColor("#8a8a84"))
    c.drawString(MARGIN, y, "// projectedge.hu")

    y -= 16
    for line in title_lines:
        y = draw_text(c, line, MARGIN, y, CONTENT_W, style(40, WHITE, 43, "PE-Black"))
    y -= 14
    y = draw_text(c, subtitle, MARGIN, y, CONTENT_W - 80, style(14, AQUA, 20, "PE-Bold"))

    # Az alsó blokkok fix pozícióra ülnek, hogy a borító alja ne maradjon üres —
    # a címsor hossza (2 vagy 3 sor) így nem hagy nagy lyukat a lap közepén.
    y = min(y - 26, 402)
    y = terminal(c, MARGIN, y, CONTENT_W, terminal_label, terminal_lines)
    y = tags(c, MARGIN, min(y - 4, 292), tag_items, dark=True)
    callout(c, MARGIN, None, CONTENT_W, promise_title, promise_body, tone="ember", bottom=96)

    c.setFont("PE-Bold", 9.5)
    c.setFillColor(AQUA)
    c.drawString(MARGIN, 58, "Jelszót, bankkártyaadatot és titkos kulcsot soha nem kérünk.")


def build_cover_png(pdf_path, png_path):
    """
    Az 1. oldal PNG előnézete (az ügyfélkapu brief-kártyáján ez látszik).

    Elsőként PyMuPDF-fel próbálkozunk, mert az pip-ből telepszik és nem kell
    hozzá rendszerszintű csomag. Ha nincs meg, a poppler `pdftoppm`-je a tartalék.
    Ha egyik sem elérhető, a PDF akkor is elkészül — csak a borítókép nem frissül.
    """
    try:
        import fitz  # PyMuPDF

        with fitz.open(str(pdf_path)) as document:
            page = document.load_page(0)
            page.get_pixmap(dpi=95).save(str(png_path))
        return True
    except ImportError:
        pass

    import shutil
    import subprocess

    if shutil.which("pdftoppm"):
        subprocess.run(
            ["pdftoppm", "-f", "1", "-singlefile", "-png", "-r", "95", str(pdf_path), str(png_path.with_suffix(""))],
            check=True,
        )
        return True

    print(f"  ! Borítókép kimaradt ({png_path.name}): telepíts pymupdf-et vagy poppler-t.")
    return False


def finish(c, pdf_name, cover_png_name=None):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    GUIDES_DIR.mkdir(parents=True, exist_ok=True)
    c.save()
    out = OUTPUT_DIR / pdf_name
    published = GUIDES_DIR / pdf_name
    published.write_bytes(out.read_bytes())
    if cover_png_name:
        build_cover_png(published, GUIDES_DIR / cover_png_name)
    return published
