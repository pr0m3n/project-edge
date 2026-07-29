from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "projectedge-domainvasarlas-rackhost.pdf"
PUBLIC = ROOT / "public" / "guides" / OUT.name
SHOTS = ROOT / "tmp" / "pdfs" / "domain-guide"
LOGO = ROOT / "public" / "logo" / "pe-mark-ink.png"

W, H = A4
INK = colors.HexColor("#303841")
PAPER = colors.HexColor("#F5F3EE")
WHITE = colors.white
AQUA = colors.HexColor("#76ABAE")
EMBER = colors.HexColor("#FF5722")
MUTED = colors.HexColor("#68727A")
LINE = colors.HexColor("#D9DEDE")

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
pdfmetrics.registerFont(TTFont("PE", FONT_REG))
pdfmetrics.registerFont(TTFont("PE-Bold", FONT_BOLD))


def pstyle(size=12, color=INK, leading=None, bold=False, align=0):
    return ParagraphStyle(
        "x", fontName="PE-Bold" if bold else "PE", fontSize=size,
        leading=leading or size * 1.35, textColor=color, alignment=align,
    )


def para(c, text, x, y, width, style, max_h=200):
    from reportlab.platypus import Paragraph
    p = Paragraph(text, style)
    _, h = p.wrap(width, max_h)
    p.drawOn(c, x, y - h)
    return y - h


def header(c, page, label):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(INK)
    c.drawImage(str(LOGO), 36, H - 54, width=42, height=24, preserveAspectRatio=True, mask="auto")
    c.setFont("PE-Bold", 8)
    c.drawRightString(W - 36, H - 40, f"{label.upper()}  ·  {page:02d}")
    c.setStrokeColor(LINE)
    c.line(36, H - 66, W - 36, H - 66)


def title(c, kicker, heading, copy=None):
    y = H - 96
    c.setFillColor(EMBER)
    c.setFont("PE-Bold", 9)
    c.drawString(42, y, kicker.upper())
    y -= 20
    y = para(c, heading, 42, y, W - 84, pstyle(29, INK, 31, True))
    if copy:
        y -= 12
        y = para(c, copy, 42, y, W - 84, pstyle(11, MUTED, 16))
    return y - 18


def screenshot(c, filename, y, caption, callout=None):
    path = SHOTS / filename
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    width = W - 84
    height = width * ih / iw
    c.setFillColor(WHITE)
    c.roundRect(40, y - height - 2, width + 4, height + 4, 12, fill=1, stroke=0)
    c.drawImage(img, 42, y - height, width=width, height=height, preserveAspectRatio=True)
    c.setFillColor(MUTED)
    c.setFont("PE", 8)
    c.drawString(42, y - height - 14, caption)
    if callout:
        cx, cy, text = callout
        c.setFillColor(EMBER)
        c.circle(42 + cx * width, y - cy * height, 10, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("PE-Bold", 9)
        c.drawCentredString(42 + cx * width, y - cy * height - 3, text)
    return y - height - 30


def box(c, x, y, w, h, heading, body, accent=AQUA):
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.roundRect(x, y - h, w, h, 13, fill=1, stroke=1)
    c.setFillColor(accent)
    c.rect(x, y - h, 5, h, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("PE-Bold", 11)
    c.drawString(x + 16, y - 22, heading)
    para(c, body, x + 16, y - 34, w - 30, pstyle(9, MUTED, 13), h - 38)


def footer(c, note="projectedge.hu · Rackhost útmutató · 2026. július"):
    c.setFillColor(MUTED)
    c.setFont("PE", 7.5)
    c.drawCentredString(W / 2, 20, note)


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("ProjectEdge – Rackhost domainvásárlási útmutató")

    # 1 — cover
    c.setFillColor(INK); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(EMBER); c.rect(0, H - 18, W, 18, fill=1, stroke=0)
    c.drawImage(str(LOGO), 46, H - 92, width=62, height=34, preserveAspectRatio=True, mask="auto")
    c.setFillColor(AQUA); c.setFont("PE-Bold", 10); c.drawString(48, H - 145, "PROJECTEDGE · ÜGYFÉL ÚTMUTATÓ")
    para(c, "Így veszed meg<br/>a saját domained.", 48, H - 180, W - 96, pstyle(40, WHITE, 42, True))
    para(c, "Rackhost.hu · a kereséstől az aktív domainig, képernyőről képernyőre.", 48, H - 305, W - 110, pstyle(15, colors.HexColor("#D6DBDC"), 21))
    box(c, 48, 330, W - 96, 102, "A legfontosabb", "A domain a te neveden marad. Külön tárhelyet nem kell vásárolnod, mert a weboldal Vercelen fut. Jelszót, bankkártyaadatot vagy titkos kulcsot soha ne küldj nekünk.", EMBER)
    c.setFillColor(colors.HexColor("#D6DBDC")); c.setFont("PE", 9)
    c.drawString(48, 72, "Ellenőrizve: 2026. július · A felület és az árak később változhatnak.")
    c.showPage()

    # 2 — prepare and search
    header(c, 2, "Keresés")
    y = title(c, "1. lépés", "Készülj elő, majd keresd meg a nevet.", "Nyisd meg a rackhost.hu/domain oldalt. Olyan nevet válassz, amit telefonban is könnyű lediktálni.")
    box(c, 42, y, 160, 86, "Legyen nálad", "Email cím, telefonszám, számlázási adatok és a domain leendő tulajdonosának adatai.")
    box(c, 215, y, 160, 86, "Jó név", "Rövid, egyszerű, szám és kötőjel nélkül. Elsőként a .hu végződést nézd meg.")
    box(c, 388, y, 165, 86, "Ne vedd meg", "Tárhelycsomag, weboldalkészítő vagy felesleges extra domain nem szükséges.", EMBER)
    y -= 108
    screenshot(c, "01-domain-search-result.png", y, "A keresés után a szabad domain a kosárba tehető.", (0.78, 0.53, "1"))
    footer(c); c.showPage()

    # 3 — cart
    header(c, 3, "Kosár")
    y = title(c, "2. lépés", "Ellenőrizd a kosarat.", "Válaszd ki az időtartamot, nézd meg a bruttó végösszeget, majd haladj tovább.")
    y = screenshot(c, "02-cart.png", y, "A képen szereplő név csak példa. Az aktuális ár eltérhet.", (0.80, 0.72, "2"))
    box(c, 42, y, W - 84, 78, "Mit ellenőrizz?", "A domain pontos írásmódját, a végződést (.hu), az időtartamot és a fizetendő összeget. Ha minden jó, kattints a tovább / adatok megadása gombra.", AQUA)
    footer(c); c.showPage()

    # 4 — hosting
    header(c, 4, "Tárhely")
    y = title(c, "3. lépés", "A tárhelyajánlatot hagyd ki.", "A ProjectEdge által készített oldal Vercelen fut, ezért a domain mellé nem kell külön Rackhost tárhely.")
    y = screenshot(c, "03-skip-hosting.png", y, "A tárhely opcionális kiegészítő. Folytasd nélküle.", (0.51, 0.73, "3"))
    box(c, 42, y, W - 84, 82, "Miért?", "A domain csak a cím. A kész weboldal futtatását a Vercel biztosítja. Később a Rackhost DNS-beállításában a domaint a Vercelhez kapcsoljuk.", EMBER)
    footer(c); c.showPage()

    # 5 — account
    header(c, 5, "Fiók")
    y = title(c, "4. lépés", "Hozd létre a saját Rackhost-fiókodat.", "A domain tulajdonosa és a számlázás felelőse te vagy a céged legyen — ne a fejlesztő.")
    y = screenshot(c, "04-register.png", y, "Saját email címet és olyan telefonszámot adj meg, amit később is elérsz.", (0.52, 0.59, "4"))
    box(c, 42, y, W - 84, 86, "Biztonság", "Használj egyedi jelszót. Ha a fiók támogatja, kapcsold be a kétlépcsős belépést. A ProjectEdge-nek nem kell bejelentkezési jelszó.", AQUA)
    footer(c); c.showPage()

    # 6 — after purchase
    header(c, 6, "Aktiválás")
    y = title(c, "5. lépés", "A vásárlás után még van két fontos teendőd.", "A fizetés önmagában nem mindig elég: a tulajdonosi adatokat és az email címet is meg kell erősíteni.")
    steps = [
        ("01", "Nyisd meg a Tennivalók menüt", "A Rackhost-fiókban keresd a domainhez tartozó feladatot, majd kattints a „Megadom” gombra."),
        ("02", "Add meg a tulajdonost", "Válaszd ki, hogy magánszemély vagy cég lesz a tulajdonos, és a valós adatokat töltsd ki."),
        ("03", "Erősítsd meg emailben", "Nyisd meg a Rackhost megerősítő levelét. Megerősítés nélkül a regisztráció nem válik véglegessé."),
        ("04", "Fizesd ki és várd meg az aktív státuszt", "A .hu domain bejegyzése a szolgáltató szerint jellemzően néhány munkanap lehet."),
    ]
    for num, head, body in steps:
        c.setFillColor(EMBER); c.circle(62, y - 16, 15, fill=1, stroke=0)
        c.setFillColor(WHITE); c.setFont("PE-Bold", 8); c.drawCentredString(62, y - 19, num)
        c.setFillColor(INK); c.setFont("PE-Bold", 12); c.drawString(88, y - 10, head)
        para(c, body, 88, y - 22, W - 135, pstyle(9.5, MUTED, 14))
        y -= 86
    box(c, 42, y + 4, W - 84, 86, "Ne hagyd félbe", "A Rackhost tudásbázisa szerint a tulajdonosi adatok megerősítésére korlátozott idő áll rendelkezésre. Nézd meg a Spam mappát is.", EMBER)
    footer(c); c.showPage()

    # 7 — send us
    header(c, 7, "ProjectEdge")
    y = title(c, "6. lépés", "Mit küldj el nekünk?", "Csak az összekötéshez szükséges, nem titkos információkat kérjük.")
    box(c, 42, y, W - 84, 80, "1. A domain neve", "Példa: vallalkozasod.hu — pontosan úgy írd, ahogyan megvetted.", AQUA)
    y -= 94
    box(c, 42, y, W - 84, 80, "2. Kép az aktív státuszról", "Egy képernyőkép elég, amin látszik a domain neve és az aktív / bejegyzett állapot.", AQUA)
    y -= 94
    box(c, 42, y, W - 84, 80, "3. Várd meg a pontos DNS-listát", "Mi megadjuk az A, CNAME vagy TXT rekord nevét és értékét. Te a Rackhost DNS zónák alatt rögzíted, vagy képernyőmegosztással végigvezetünk.", AQUA)
    y -= 108
    box(c, 42, y, W - 84, 104, "Ezt SOHA ne küldd el", "Rackhost-jelszó · Google-jelszó · bankkártyaadat · Vercel/Supabase titkos kulcs. Az átadás meghívással és hivatalos projektátadással történik.", EMBER)
    footer(c); c.showPage()

    # 8 — checklist and sources
    header(c, 8, "Ellenőrzőlista")
    y = title(c, "Kész", "A domain akkor áll készen, ha mind az öt pont pipa.", "Tartsd meg ezt az oldalt gyors ellenőrzéshez.")
    checks = [
        "A domain a saját / céges Rackhost-fiókomban van.",
        "A tulajdonosi adatokat megadtam és emailben megerősítettem.",
        "A számlát kifizettem, a domain státusza aktív.",
        "Nem vettem felesleges tárhelyet a ProjectEdge-oldalhoz.",
        "Elküldtem a domain nevét és az aktív státusz képét — jelszó nélkül.",
    ]
    for item in checks:
        c.setStrokeColor(AQUA); c.setLineWidth(1.5); c.roundRect(44, y - 21, 20, 20, 5, fill=0, stroke=1)
        para(c, item, 78, y - 1, W - 122, pstyle(11, INK, 15, True))
        y -= 55
    y -= 4
    para(c, "<b>Hivatalos segítség</b><br/>Rackhost domain: rackhost.hu/domain<br/>Tulajdonosi adatok: rackhost.hu/tudasbazis/domain/miert-van-szukseg-a-tulajdonosi-adatok-megadasara/<br/>DNS rekordok: rackhost.hu/tudasbazis/domain/hogyan-allithatom-be-a-domainhez-tartozo-rekordokat/", 44, y, W - 88, pstyle(8.5, MUTED, 13))
    footer(c, "projectedge.hu · Kérdés esetén írj az ügyfélkapuban")
    c.save()
    PUBLIC.write_bytes(OUT.read_bytes())
    print(OUT)
    print(PUBLIC)


if __name__ == "__main__":
    build()
