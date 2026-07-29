from pathlib import Path
import subprocess
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/projectedge-domainvasarlas-rackhost.pdf"
PUBLIC = ROOT / "public/guides/projectedge-domainvasarlas-rackhost.pdf"
COVER = ROOT / "public/guides/domain-guide-cover.png"
SHOTS = ROOT / "tmp/pdfs/domain-guide"
LOGO_WHITE = ROOT / "public/logo/pe-mark-white.png"
LOGO_INK = ROOT / "public/logo/pe-mark-ink.png"

W, H = A4
INK = colors.HexColor("#303841")
DARK = colors.HexColor("#252B32")
PAPER = colors.HexColor("#F3F1EB")
WHITE = colors.HexColor("#FFFFFF")
MUTED = colors.HexColor("#69757D")
AQUA = colors.HexColor("#76ABAE")
EMBER = colors.HexColor("#FF5722")
PALE = colors.HexColor("#E8EFEF")
LINE = colors.HexColor("#D6DEDE")

pdfmetrics.registerFont(TTFont("PE", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("PE-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))


def style(size=10, color=INK, leading=None, bold=False):
    return ParagraphStyle(
        "s",
        fontName="PE-Bold" if bold else "PE",
        fontSize=size,
        leading=leading or size * 1.35,
        textColor=color,
    )


def paragraph(c, text, x, y, width, st, max_height=300):
    from reportlab.platypus import Paragraph
    item = Paragraph(text, st)
    _, height = item.wrap(width, max_height)
    item.drawOn(c, x, y - height)
    return y - height


def base(c, page, section, dark=False):
    c.setFillColor(DARK if dark else PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(EMBER)
    c.rect(0, H - 10, W, 10, fill=1, stroke=0)
    c.drawImage(
        str(LOGO_WHITE if dark else LOGO_INK),
        34,
        H - 50,
        width=44,
        height=24,
        preserveAspectRatio=True,
        mask="auto",
    )
    c.setFont("PE-Bold", 7.5)
    c.setFillColor(colors.HexColor("#DDE2E3") if dark else MUTED)
    c.drawRightString(W - 34, H - 38, f"{section.upper()}  /  {page:02d}")


def footer(c, dark=False):
    c.setFont("PE", 7)
    c.setFillColor(colors.HexColor("#AAB3B6") if dark else MUTED)
    c.drawString(34, 18, "projectedge.hu")
    c.drawRightString(W - 34, 18, "Rackhost útmutató · 2026. július")


def heading(c, eyebrow, title, copy=None, dark=False):
    y = H - 82
    c.setFillColor(AQUA if dark else EMBER)
    c.setFont("PE-Bold", 8)
    c.drawString(36, y, eyebrow.upper())
    y -= 18
    y = paragraph(c, title, 36, y, W - 72, style(27, WHITE if dark else INK, 29, True))
    if copy:
        y -= 9
        y = paragraph(c, copy, 36, y, W - 72, style(10.5, colors.HexColor("#DDE2E3") if dark else MUTED, 15))
    return y - 16


def shot(c, filename, x, y, width, label, marker=None):
    image = ImageReader(str(SHOTS / filename))
    iw, ih = image.getSize()
    height = width * ih / iw
    c.setFillColor(WHITE)
    c.roundRect(x - 4, y - height - 4, width + 8, height + 8, 12, fill=1, stroke=0)
    c.drawImage(image, x, y - height, width=width, height=height)
    if marker:
        mx, my, num = marker
        c.setFillColor(EMBER)
        c.circle(x + width * mx, y - height * my, 11, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("PE-Bold", 9)
        c.drawCentredString(x + width * mx, y - height * my - 3, str(num))
    c.setFillColor(MUTED)
    c.setFont("PE", 7)
    c.drawString(x, y - height - 14, label)
    return y - height - 24


def step_card(c, x, y, width, number, title, copy, accent=AQUA, dark=False, height=88):
    fill = colors.HexColor("#343B43") if dark else WHITE
    c.setFillColor(fill)
    c.setStrokeColor(colors.HexColor("#48515A") if dark else LINE)
    c.roundRect(x, y - height, width, height, 14, fill=1, stroke=1)
    c.setFillColor(accent)
    c.circle(x + 24, y - 25, 13, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("PE-Bold", 8)
    c.drawCentredString(x + 24, y - 28, number)
    c.setFillColor(WHITE if dark else INK)
    c.setFont("PE-Bold", 11)
    c.drawString(x + 45, y - 21, title)
    paragraph(c, copy, x + 45, y - 32, width - 58, style(8.5, colors.HexColor("#C8D0D2") if dark else MUTED, 12), height - 36)


def make_cover_png():
    from reportlab.graphics import renderPM
    from reportlab.graphics.shapes import Drawing, Rect, String, Circle
    drawing = Drawing(900, 1200)
    drawing.add(Rect(0, 0, 900, 1200, fillColor=DARK, strokeColor=None))
    drawing.add(Rect(0, 1160, 900, 40, fillColor=EMBER, strokeColor=None))
    drawing.add(Circle(760, 960, 170, fillColor=colors.Color(1, .34, .13, .17), strokeColor=None))
    drawing.add(Circle(690, 250, 240, fillColor=colors.Color(.46, .67, .68, .16), strokeColor=None))
    drawing.add(String(75, 1050, "PROJECTEDGE", fontName="PE-Bold", fontSize=25, fillColor=AQUA))
    drawing.add(String(75, 830, "A SAJÁT", fontName="PE-Bold", fontSize=78, fillColor=WHITE))
    drawing.add(String(75, 735, "DOMAINED.", fontName="PE-Bold", fontSize=78, fillColor=WHITE))
    drawing.add(String(75, 635, "Rackhost vásárlási útmutató", fontName="PE", fontSize=32, fillColor=colors.HexColor("#D7DDDE")))
    drawing.add(Rect(75, 500, 510, 6, fillColor=EMBER, strokeColor=None))
    drawing.add(String(75, 445, "KERESÉS  ·  VÁSÁRLÁS  ·  AKTIVÁLÁS", fontName="PE-Bold", fontSize=18, fillColor=AQUA))
    drawing.add(String(75, 90, "projectedge.hu", fontName="PE", fontSize=18, fillColor=colors.HexColor("#AAB3B6")))
    renderPM.drawToFile(drawing, str(COVER), fmt="PNG", dpi=120)


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("ProjectEdge - Rackhost domainvásárlási útmutató")

    # Cover
    base(c, 1, "Domainvásárlás", dark=True)
    c.setFillColor(colors.Color(1, .34, .13, .13)); c.circle(W - 70, H - 210, 125, fill=1, stroke=0)
    c.setFillColor(colors.Color(.46, .67, .68, .12)); c.circle(105, 155, 150, fill=1, stroke=0)
    c.setFillColor(AQUA); c.setFont("PE-Bold", 10); c.drawString(42, H - 142, "PROJECTEDGE · ÜGYFÉL ÚTMUTATÓ")
    paragraph(c, "A saját<br/>domained.", 42, H - 175, W - 84, style(43, WHITE, 45, True))
    paragraph(c, "Rackhost vásárlás a kereséstől az aktív domainig.", 42, H - 305, W - 120, style(15, colors.HexColor("#D7DDDE"), 21))
    c.setFillColor(EMBER); c.roundRect(42, 250, W - 84, 95, 16, fill=1, stroke=0)
    paragraph(c, "<b>Ne vegyél külön tárhelyet.</b><br/>A ProjectEdge weboldalad Vercelen fut. A domain maradjon a saját vagy céges Rackhost-fiókodban.", 62, 318, W - 124, style(12, WHITE, 18))
    paragraph(c, "Jelszót, bankkártyaadatot és titkos kulcsot soha nem kérünk.", 42, 205, W - 84, style(10, AQUA, 14, True))
    footer(c, True); c.showPage()

    # Search and cart
    base(c, 2, "Keresés és kosár")
    y = heading(c, "01", "Keresd meg, majd ellenőrizd kétszer.", "Nyisd meg a rackhost.hu/domain oldalt. Rövid, könnyen kimondható .hu nevet keress.")
    y = shot(c, "01-domain-search-result.png", 36, y, W - 72, "1 · A zöld „szabad” jelzés után tedd kosárba.", (.79, .53, 1))
    y -= 3
    step_card(c, 36, y, (W - 82) / 2, "✓", "Jó választás", "Rövid, ékezet nélkül is egyértelmű, lehetőleg kötőjel és szám nélkül.")
    step_card(c, 46 + (W - 82) / 2, y, (W - 82) / 2, "!", "Mielőtt továbbmész", "Ellenőrizd a pontos írásmódot, a .hu végződést és a bruttó végösszeget.", EMBER)
    footer(c); c.showPage()

    # Hosting and register
    base(c, 3, "Vásárlás", dark=True)
    y = heading(c, "02", "A tárhelyet hagyd ki. A fiók legyen a tiéd.", "A domain a cím, a weboldal futtatását a Vercel végzi.", dark=True)
    col = (W - 86) / 2
    y1 = shot(c, "03-skip-hosting.png", 36, y, col, "2 · Folytasd tárhely nélkül.", (.52, .73, 2))
    y2 = shot(c, "04-register.png", 50 + col, y, col, "3 · Saját elérhetőséggel regisztrálj.", (.52, .59, 3))
    low = min(y1, y2) - 4
    step_card(c, 36, low, W - 72, "3", "Saját vagy céges fiók", "Olyan emailt és telefonszámot adj meg, amit később is elérsz. A domain tulajdonosa ne a fejlesztő legyen.", AQUA, True, 78)
    step_card(c, 36, low - 90, W - 72, "!", "Mit ne küldj el nekünk?", "Rackhost-jelszó, Google-jelszó, bankkártyaadat vagy bármilyen titkos kulcs.", EMBER, True, 70)
    footer(c, True); c.showPage()

    # after purchase
    base(c, 4, "Aktiválás")
    y = heading(c, "03", "A fizetés után még nincs teljesen kész.", "A Rackhost-fiók „Tennivalók” részében fejezd be a regisztrációt.")
    cards = [
        ("1", "Tulajdonosi adatok", "A „Tennivalók” alatt kattints a „Megadom” gombra. Magánszemély vagy cég valós adatait add meg."),
        ("2", "Email megerősítése", "Nyisd meg a Rackhost levelét és erősítsd meg az adatokat. Nézd meg a Spam mappát is."),
        ("3", "Fizetés", "Bankkártyával azonnali lehet, átutalásnál a díjbekérő hivatkozási száma kerüljön a közleménybe."),
        ("4", "Aktív státusz", "Ha mindenhol zöld pipa van, várd meg a regisztrátor visszaigazolását. Ezután a domain már használható."),
    ]
    for number, title, copy in cards:
        step_card(c, 36, y, W - 72, number, title, copy, AQUA if number != "4" else EMBER, False, 84)
        y -= 96
    c.setFillColor(PALE); c.roundRect(36, y - 68, W - 72, 68, 14, fill=1, stroke=0)
    paragraph(c, "<b>Fontos:</b> az adatok emailes megerősítésére a Rackhost tájékoztatója szerint 30 nap van, de ne várj vele - addig a név lefoglalása sem biztosított.", 52, y - 18, W - 104, style(9, INK, 13))
    footer(c); c.showPage()

    # what to send
    base(c, 5, "Beküldés", dark=True)
    y = heading(c, "04", "Ezt küldd el a projektednél.", "A brief beküldése után külön „Domain adatok elküldése” gomb jelenik meg.", dark=True)
    step_card(c, 36, y, W - 72, "1", "A megvásárolt domain neve", "Például: vallalkozasod.hu. Ne teljes webcímet és ne Rackhost-jelszót küldj.", AQUA, True, 92)
    y -= 106
    step_card(c, 36, y, W - 72, "2", "Kép vagy PDF az aktív státuszról", "A domain neve és az aktív / bejegyzett állapot legyen látható. PNG, JPG, WEBP vagy PDF feltölthető.", AQUA, True, 92)
    y -= 116
    c.setFillColor(EMBER); c.roundRect(36, y - 122, W - 72, 122, 18, fill=1, stroke=0)
    paragraph(c, "<b>Mi történik utána?</b><br/>Mi ellenőrizzük a domaint, majd pontosan megadjuk az A, CNAME vagy TXT DNS-rekordokat. Te rögzíted őket a Rackhost DNS zónák alatt, vagy képernyőmegosztással végigvezetünk. A jelszavad nálad marad.", 56, y - 28, W - 112, style(11, WHITE, 17))
    y -= 148
    paragraph(c, "A ProjectEdge ügyfélkapu jelzi, hogy az adatokat megkaptuk és éppen kinél van a következő lépés.", 36, y, W - 72, style(10, AQUA, 15, True))
    footer(c, True); c.showPage()

    # checklist
    base(c, 6, "Ellenőrzőlista")
    y = heading(c, "Kész", "Öt pipa, és indulhat az összekötés.", "Ezt az oldalt használd gyors ellenőrzésre.")
    checks = [
        "A domain a saját vagy céges Rackhost-fiókomban van.",
        "A tulajdonosi adatokat megadtam és emailben megerősítettem.",
        "A díjat kifizettem, a domain aktív / bejegyzett.",
        "Nem vettem felesleges tárhelyet a ProjectEdge-oldalhoz.",
        "Az ügyfélkapuban elküldtem a domain nevét és az igazolást.",
    ]
    for item in checks:
        c.setFillColor(WHITE); c.setStrokeColor(LINE); c.roundRect(36, y - 54, W - 72, 54, 12, fill=1, stroke=1)
        c.setStrokeColor(AQUA); c.setLineWidth(1.5); c.roundRect(50, y - 38, 22, 22, 6, fill=0, stroke=1)
        paragraph(c, item, 86, y - 17, W - 140, style(10.5, INK, 14, True))
        y -= 66
    y -= 8
    c.setFillColor(PALE); c.roundRect(36, y - 112, W - 72, 112, 14, fill=1, stroke=0)
    paragraph(c, "<b>Hivatalos segítség</b><br/>rackhost.hu/domain<br/>rackhost.hu/tudasbazis/domain/miert-van-szukseg-a-tulajdonosi-adatok-megadasara/<br/>rackhost.hu/tudasbazis/domain/hogyan-allithatom-be-a-domainhez-tartozo-rekordokat/", 52, y - 20, W - 104, style(8.5, MUTED, 13))
    footer(c); c.save()
    PUBLIC.write_bytes(OUT.read_bytes())
    subprocess.run(
        ["pdftoppm", "-f", "1", "-singlefile", "-png", "-r", "95", str(OUT), str(COVER.with_suffix(""))],
        check=True,
    )
    print(OUT)
    print(PUBLIC)
    print(COVER)


if __name__ == "__main__":
    build()
