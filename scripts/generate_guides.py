"""
ProjectEdge ügyfél-útmutatók generálása.

    python3 scripts/generate_guides.py

Négy PDF készül el, a weboldal és a levelek design nyelvén (lásd guide_kit.py):

  1. projectedge-domainvasarlas-rackhost.pdf — domain vásárlás Rackhoston
  2. projectedge-vercel-atadas.pdf           — a weboldal futtatásának átvétele
  3. projectedge-supabase-atadas.pdf         — az adatbázis átvétele
  4. projectedge-resend-email.pdf            — a levélküldés beállítása

A PDF-ek a public/guides/ alá kerülnek; az ügyfélkapu vezetett átadási lépései
(lib/handover.ts) ezekre a fájlnevekre hivatkoznak. Az elsőhöz borító-PNG is
készül (domain-guide-cover.png), mert a brief varázsló kártyáján az látszik.

A domain útmutatóban valódi Rackhost képernyőképek vannak (tmp/pdfs/domain-guide).
A Vercel / Supabase / Resend útmutatók szándékosan képernyőkép nélkül,
lépéskártyákkal és kattintható linkekkel készülnek: azok a felületek gyakran
változnak, és egy elavult képernyőkép többet zavar, mint amennyit segít.
"""

from reportlab.pdfgen import canvas

from guide_kit import (
    AQUA,
    CONTENT_W,
    EMBER,
    GUIDES_DIR,
    H,
    MARGIN,
    OUTPUT_DIR,
    ROOT,
    callout,
    checklist,
    cover,
    finish,
    footer,
    link_row,
    page_base,
    page_heading,
    register_fonts,
    shot,
    step_card,
    tags,
    terminal,
)

SHOTS = ROOT / "tmp/pdfs/domain-guide"
FOOTER_DOMAIN = "Domain útmutató · Rackhost"
FOOTER_VERCEL = "Átadási útmutató · Vercel"
FOOTER_SUPABASE = "Átadási útmutató · Supabase"
FOOTER_RESEND = "Átadási útmutató · Resend"


def new_canvas(name, title):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT_DIR / name), pagesize=(595.2755905511812, 841.8897637795277))
    c.setTitle(title)
    c.setAuthor("ProjectEdge")
    return c


# ═════════════════════════════════════════════════════════════════════════════
# 1. Domain vásárlás (Rackhost)
# ═════════════════════════════════════════════════════════════════════════════
def build_domain_guide():
    name = "projectedge-domainvasarlas-rackhost.pdf"
    c = new_canvas(name, "ProjectEdge — Domainvásárlási útmutató (Rackhost)")

    cover(
        c,
        eyebrow="ProjectEdge · ügyfél útmutató",
        title_lines=["A saját", "domained."],
        subtitle="Rackhost vásárlás a kereséstől az aktív domainig.",
        terminal_label="projectedge.domain",
        terminal_lines=[
            "$ projectedge.domain --register vallalkozasod.hu",
            "→ 1. keresés  2. vásárlás  3. adatok  4. aktív",
        ],
        promise_title="Ne vegyél külön tárhelyet.",
        promise_body=(
            "A ProjectEdge weboldalad Vercelen fut, tárhelyre nincs szükség. A domain maradjon a saját vagy "
            "céges Rackhost-fiókodban — így a cím végig a tiéd."
        ),
        tag_items=["Keresés", "Vásárlás", "Tulajdonosi adatok", "Aktív domain"],
    )
    footer(c, FOOTER_DOMAIN, dark=True)
    c.showPage()

    # ── 2. oldal: keresés ─────────────────────────────────────────────────────
    page_base(c, "Keresés és kosár", 2)
    y = page_heading(
        c,
        "01. lépés",
        "Keresd meg, majd ellenőrizd kétszer.",
        "Nyisd meg a rackhost.hu/domain oldalt, és írj be egy rövid, könnyen kimondható .hu nevet. "
        "A találati sorban zöld <b>szabad</b> jelzés mutatja, ha a név elérhető.",
    )
    y = shot(
        c,
        SHOTS / "01-domain-search-result.png",
        MARGIN,
        y,
        CONTENT_W,
        "1 · A találati sor: zöld „szabad” jelzés, futamidő és díj. A lángikon csak dekoráció.",
        crop=(0.17, 0.795, 0.84, 0.90),
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "check",
        "Jó választás",
        "Rövid, ékezet nélkül is egyértelmű, lehetőleg kötőjel és szám nélkül. A cégnév vagy a szolgáltatás neve a legjobb.",
    )
    y = shot(
        c,
        SHOTS / "02-cart.png",
        MARGIN,
        y,
        CONTENT_W,
        "2 · A kosárban látszik, hogy a 490 Ft akciós: az áthúzott 1 800 Ft + ÁFA a normál éves díj.",
        crop=(0.16, 0.685, 0.84, 0.935),
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "!",
        "Mielőtt továbbmész",
        "Ellenőrizd a pontos írásmódot és a .hu végződést. A kiemelt díj az <b>első évre</b> szól — "
        "a <b>megújítás évente esedékes, és jellemzően drágább</b>. Ez a költség az átadás után nálad marad.",
        accent=EMBER,
    )
    link_row(c, MARGIN, y, [("rackhost.hu/domain", "https://rackhost.hu/domain")])
    footer(c, FOOTER_DOMAIN)
    c.showPage()

    # ── 3. oldal: vásárlás ────────────────────────────────────────────────────
    page_base(c, "Vásárlás", 3, dark=True)
    y = page_heading(
        c,
        "02. lépés",
        "A tárhelyet hagyd ki. A fiók legyen a tiéd.",
        "A domain a cím, a weboldal futtatását a Vercel végzi. A megrendelés első képernyőjén tárhely "
        "csomagokat ajánl a Rackhost — <b>ezek közül egyiket sem kell választanod</b>.",
        dark=True,
    )
    y = shot(
        c,
        SHOTS / "03-skip-hosting.png",
        MARGIN,
        y,
        CONTENT_W,
        "1 · A tárhely-választó. Egyik csomagot se jelöld be: tekerj lejjebb, és tárhely nélkül folytasd.",
        crop=(0.13, 0.555, 0.87, 0.86),
    )
    y = shot(
        c,
        SHOTS / "04-register.png",
        MARGIN,
        y,
        CONTENT_W,
        "2 · A regisztrációs képernyő. Itt a saját, később is elérhető email címedet és telefonszámodat add meg.",
        crop=(0.13, 0.145, 0.87, 0.70),
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "3",
        "Saját vagy céges fiók",
        "Regisztrálj olyan email címmel és telefonszámmal, amit később is elérsz. A domain tulajdonosa "
        "te vagy a cég legyen — <b>ne a fejlesztő</b>. Így nem kerülhet a cím idegen kézbe.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "!",
        "Mit ne küldj el nekünk?",
        "Rackhost-jelszót, Google-jelszót, bankkártyaadatot vagy bármilyen titkos kulcsot. A beállításhoz "
        "ezekre nincs szükségünk — csak a domain nevére és néhány DNS rekordra.",
        dark=True,
        accent=EMBER,
    )
    footer(c, FOOTER_DOMAIN, dark=True)
    c.showPage()

    # ── 4. oldal: aktiválás ───────────────────────────────────────────────────
    page_base(c, "Aktiválás", 4)
    y = page_heading(
        c,
        "03. lépés",
        "A fizetés után még nincs teljesen kész.",
        "A Rackhost-fiókban a „Tennivalók” résznél kell befejezned a regisztrációt. Amíg ez nincs meg, "
        "a domain nem lesz bejegyzett állapotú.",
    )
    for badge, title, body in [
        (
            "1",
            "Tulajdonosi adatok",
            "A „Tennivalók” alatt kattints a „Megadom” gombra, és add meg a magánszemély vagy a cég valós adatait. "
            "Ez a .hu domainnél kötelező, és ez határozza meg, ki a domain jogosultja.",
        ),
        (
            "2",
            "Email megerősítése",
            "Nyisd meg a Rackhost levelét, és erősítsd meg az adatokat. Ha nem találod, nézd meg a Spam és a "
            "Promóciók mappát is.",
        ),
        (
            "3",
            "Fizetés",
            "Bankkártyával azonnali. Átutalásnál a díjbekérőn szereplő hivatkozási szám kerüljön a közleménybe, "
            "különben nem tud párosítani a rendszer.",
        ),
        (
            "4",
            "Aktív státusz",
            "Ha minden ponton zöld pipa van, várd meg a regisztrátor visszaigazolását. Ezután a domain "
            "bejegyzett, és összekötjük a weboldaladdal.",
        ),
    ]:
        y = step_card(c, MARGIN, y, CONTENT_W, badge, title, body, accent=AQUA if badge != "4" else EMBER)

    y -= 2
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "Ne várj az adatok megerősítésével.",
        "A Rackhost tájékoztatója szerint erre 30 nap van, de amíg nincs kész, a név lefoglalása sem biztosított. "
        "Ha elakadsz, jelezd az ügyfélkapun — képernyőmegosztással végigmegyünk rajta.",
        tone="aqua",
    )
    footer(c, FOOTER_DOMAIN)
    c.showPage()

    # ── 5. oldal: beküldés ────────────────────────────────────────────────────
    page_base(c, "Beküldés", 5, dark=True)
    y = page_heading(
        c,
        "04. lépés",
        "Ezt küldd el a projektednél.",
        "Az ügyfélkapun a projekted kártyáján megjelenik egy „Domain adatok elküldése” gomb. A briefet ettől "
        "függetlenül is beküldheted — nem kell megvárnod a domaint.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "1",
        "A megvásárolt domain neve",
        "Például: vallalkozasod.hu — teljes webcím (https://…) nélkül, és <b>Rackhost-jelszó nélkül</b>.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "2",
        "Kép vagy PDF az aktív státuszról",
        "Legyen látható a domain neve és az aktív / bejegyzett állapot. PNG, JPG, WEBP vagy PDF tölthető fel, "
        "legfeljebb 10 MB. A feltöltött igazolást csak bejelentkezés után lehet megnyitni.",
        dark=True,
    )
    y -= 2
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "Mi történik utána?",
        "Ellenőrizzük a domaint, majd az ügyfélkapu átadási lépésénél pontosan kiírjuk, milyen A, CNAME vagy TXT "
        "rekordot kell felvenned a Rackhost DNS zónák alatt. Nem emailben kapod meg: ott lesz, ahol dolgozol. "
        "A jelszavad végig nálad marad.",
        tone="ember",
    )
    y = terminal(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "projectedge.handover",
        [
            "$ projectedge.dns --show vallalkozasod.hu",
            "→ A      @    216.150.1.1",
            "→ CNAME  www  cname.vercel-dns.com",
        ],
    )
    footer(c, FOOTER_DOMAIN, dark=True)
    c.showPage()

    # ── 6. oldal: ellenőrzőlista ──────────────────────────────────────────────
    page_base(c, "Ellenőrzőlista", 6)
    y = page_heading(c, "Kész", "Öt pipa, és indulhat az összekötés.", "Ezt az oldalt használd gyors ellenőrzésre.")
    y = checklist(
        c,
        MARGIN,
        y,
        CONTENT_W,
        [
            "A domain a saját vagy céges Rackhost-fiókomban van.",
            "A tulajdonosi adatokat megadtam és emailben megerősítettem.",
            "A díjat kifizettem, a domain aktív / bejegyzett.",
            "Nem vettem felesleges tárhelyet a ProjectEdge-oldalhoz.",
            "Az ügyfélkapuban elküldtem a domain nevét és az igazolást.",
        ],
    )
    y -= 6
    y = link_row(
        c,
        MARGIN,
        y,
        [
            ("Domain regisztráció", "https://rackhost.hu/domain"),
            ("Miért kell tulajdonosi adat?", "https://rackhost.hu/tudasbazis/domain/miert-van-szukseg-a-tulajdonosi-adatok-megadasara/"),
            ("DNS rekordok beállítása", "https://rackhost.hu/tudasbazis/domain/hogyan-allithatom-be-a-domainhez-tartozo-rekordokat/"),
        ],
    )
    tags(c, MARGIN, y, ["Tiéd a domain", "Tiéd a fiók", "Nincs jelszócsere", "Nincs tárhely"])
    footer(c, FOOTER_DOMAIN)

    return finish(c, name, "domain-guide-cover.png")


# ═════════════════════════════════════════════════════════════════════════════
# 2. Vercel átadás
# ═════════════════════════════════════════════════════════════════════════════
def build_vercel_guide():
    name = "projectedge-vercel-atadas.pdf"
    c = new_canvas(name, "ProjectEdge — Vercel átadási útmutató")

    cover(
        c,
        eyebrow="ProjectEdge · átadási útmutató",
        title_lines=["A weboldalad", "a te fiókodban."],
        subtitle="Vercel átvétel négy lépésben, leállás nélkül.",
        terminal_label="projectedge.handover",
        terminal_lines=[
            "$ projectedge.handover --service vercel",
            "→ te: fiók + csapat  ·  te: meghívás",
            "→ mi: projekt átadás  ·  te: ellenőrzés",
        ],
        promise_title="A Vercel futtatja az oldaladat.",
        promise_body=(
            "Nem tárhely a régi értelemben: nincs cPanel és nincs FTP. Az átadás után a projekt a te csapatodban "
            "van, a domainnel és a beállításokkal együtt."
        ),
        tag_items=["Saját fiók", "Meghívásos hozzáférés", "Zero downtime", "Domain veled marad"],
    )
    footer(c, FOOTER_VERCEL, dark=True)
    c.showPage()

    page_base(c, "Fiók és csapat", 2)
    y = page_heading(
        c,
        "01. lépés",
        "Hozz létre fiókot és céges csapatot.",
        "Ez a te lépésed. Regisztrálj a saját vagy céges email címeddel — a Vercelen a „csapat” (Team) az a "
        "hely, ahová a weboldal projektje kerül.",
    )
    for badge, title, body in [
        ("1", "Regisztráció", "Nyisd meg a vercel.com/signup oldalt. Google vagy GitHub fiókkal is beléphetsz, de használhatsz sima email címet is."),
        (
            "2",
            "Csapat létrehozása",
            "Belépés után bal felül van a fiókválasztó. Ott a <b>Create Team</b> lehetőséggel hozz létre egy csapatot "
            "a cég nevével. A csapat neve része lesz néhány belső címnek, ezért legyen rövid és ékezet nélküli.",
        ),
        (
            "3",
            "Csomag",
            "Bemutatkozó oldalhoz az ingyenes (Hobby) szint technikailag elég, <b>üzleti, kereskedelmi használatra "
            "azonban a Vercel feltételei fizetős (Pro) csapatot írnak elő</b>. Az átadás előtt megbeszéljük, "
            "melyik a helyes a te esetedben.",
        ),
        (
            "4",
            "Írd be az ügyfélkapun",
            "Az átadási lépésnél add meg a létrehozott csapat nevét. Ebből tudjuk, hová kell átadni a projektet.",
        ),
    ]:
        y = step_card(c, MARGIN, y, CONTENT_W, badge, title, body)
    y -= 2
    link_row(
        c,
        MARGIN,
        y,
        [("Vercel regisztráció", "https://vercel.com/signup"), ("Vercel irányítópult", "https://vercel.com/dashboard")],
    )
    footer(c, FOOTER_VERCEL)
    c.showPage()

    page_base(c, "Meghívás", 3, dark=True)
    y = page_heading(
        c,
        "02. lépés",
        "Hívj meg minket a csapatodba.",
        "Ahhoz, hogy át tudjuk adni a projektet, tagnak kell lennünk a csapatodban. Jelszóra nincs szükség — "
        "pontosan ezért van meghívás.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "1",
        "Hol találod?",
        "A csapatodon belül: <b>Settings → Members → Invite</b>. Írd be az info@projectedge.hu címet.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "2",
        "Milyen szerepkörrel?",
        "A <b>Member</b> szerepkör elég. Owner jogosultságot nem kell adnod, és az átadás után a hozzáférésünket "
        "bármikor visszavonhatod.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "3",
        "Fizetési mód",
        "Ha fizetős csapatot használsz, az átadás előtt legyen érvényes fizetési mód a csapaton. Enélkül az "
        "átadás után szolgáltatáskiesés lehet.",
        dark=True,
        accent=EMBER,
    )
    y -= 2
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "Utána mi jövünk.",
        "Az átadást a Vercel „Transfer Project” funkciójával végezzük: az oldal közben nem áll le. Utána "
        "ellenőrizzük az éles domaint, a környezeti változókat és a build működését, és újrakötjük azokat az "
        "integrációkat, amelyeket az átadás nem visz magával.",
        tone="ember",
    )
    link_row(c, MARGIN, y, [("Mit visz át az átadás?", "https://vercel.com/docs/projects/transferring-projects")], dark=True)
    footer(c, FOOTER_VERCEL, dark=True)
    c.showPage()

    page_base(c, "Ellenőrzés", 4)
    y = page_heading(
        c,
        "03. lépés",
        "Nézd meg, hogy tényleg nálad van.",
        "Az átadás után egy rövid ellenőrzés a te lépésed. Ha bármi nem stimmel, az ügyfélkapun jelezd.",
    )
    y = checklist(
        c,
        MARGIN,
        y,
        CONTENT_W,
        [
            "A projekt megjelenik a saját Vercel csapatomban.",
            "A „Visit” gombra kattintva betölt az éles weboldal.",
            "Az éles cím a saját domainem, és https:// előtaggal nyílik.",
            "A Settings → Environment Variables listában látom a beállításokat.",
            "A számlázás (ha fizetős csomag) az én fiókomhoz tartozik.",
        ],
    )
    y -= 6
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "Mi marad a mi oldalunkon?",
        "Semmi olyan, ami nélkül ne működne az oldal. A hozzáférésünket a csapat beállításai között bármikor "
        "visszavonhatod — a 30 napos technikai garanciához viszont hasznos, ha addig megmarad.",
        tone="aqua",
    )
    tags(c, MARGIN, y, ["Zero downtime", "Saját számlázás", "Visszavonható hozzáférés"])
    footer(c, FOOTER_VERCEL)

    return finish(c, name, "vercel-guide-cover.png")


# ═════════════════════════════════════════════════════════════════════════════
# 3. Supabase átadás
# ═════════════════════════════════════════════════════════════════════════════
def build_supabase_guide():
    name = "projectedge-supabase-atadas.pdf"
    c = new_canvas(name, "ProjectEdge — Supabase átadási útmutató")

    cover(
        c,
        eyebrow="ProjectEdge · átadási útmutató",
        title_lines=["Az adataid", "a te szervezetedben."],
        subtitle="Supabase átvétel: adatbázis, belépés, feltöltések.",
        terminal_label="projectedge.handover",
        terminal_lines=[
            "$ projectedge.handover --service supabase",
            "→ te: szervezet  ·  te: meghívás",
            "→ mi: projekt átadás + kulcscsere  ·  te: teszt",
        ],
        promise_title="Csak akkor kell, ha az oldalad adatot kezel.",
        promise_body=(
            "Belépés, ügyfélkapu, űrlapok mentése, feltöltések — ezek mögött a Supabase áll. Egy egyszerű "
            "bemutatkozó oldalnak nincs rá szüksége, és ilyenkor ez a lépés kimarad."
        ),
        tag_items=["Adatbázis", "Belépés", "Feltöltések", "Kulcscsere"],
    )
    footer(c, FOOTER_SUPABASE, dark=True)
    c.showPage()

    page_base(c, "Szervezet", 2)
    y = page_heading(
        c,
        "01. lépés",
        "Hozz létre saját szervezetet.",
        "A Supabase-en a „szervezet” (Organization) a számlázási és jogosultsági egység. A projekt "
        "adatbázisa ide fog kerülni.",
    )
    for badge, title, body in [
        ("1", "Regisztráció", "Nyisd meg a supabase.com/dashboard oldalt, és regisztrálj a saját vagy céges email címeddel."),
        (
            "2",
            "Szervezet létrehozása",
            "A felület tetején van a szervezetválasztó. Ott a <b>New organization</b> lehetőséggel hozz létre egyet "
            "a cég nevével. Új projektet <b>ne</b> hozz létre — a meglévőt adjuk át.",
        ),
        (
            "3",
            "Írd be az ügyfélkapun",
            "Az átadási lépésnél add meg a szervezet nevét, hogy tudjuk, hová adjuk át a projektet.",
        ),
    ]:
        y = step_card(c, MARGIN, y, CONTENT_W, badge, title, body)
    y -= 2
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "Ezt előre tisztázzuk: ingyenes vagy fizetős?",
        "Az ingyenes csomagban a ritkán használt adatbázist a Supabase egy idő után felfüggeszti, és ilyenkor az "
        "oldal adatot kezelő része (belépés, űrlapmentés) leáll, amíg valaki újra el nem indítja. Éles, üzleti "
        "működéshez ezért fizetős csomagot javaslunk. Az aktuális árakat és a döntést az átadás előtt átbeszéljük — "
        "a díj az átadás után a te fiókodhoz tartozik.",
        tone="ember",
    )
    link_row(c, MARGIN, y, [("Supabase irányítópult", "https://supabase.com/dashboard"), ("Dokumentáció", "https://supabase.com/docs")])
    footer(c, FOOTER_SUPABASE)
    c.showPage()

    page_base(c, "Meghívás és átadás", 3, dark=True)
    y = page_heading(
        c,
        "02. lépés",
        "Hívj meg minket, a többit mi végezzük.",
        "A projekt átadásához tagnak kell lennünk a szervezetedben. Adatbázis jelszót és titkos kulcsot "
        "<b>ne</b> küldj — nincs rá szükség.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "1",
        "Meghívás",
        "A szervezetnél: <b>Team → Invite member</b>, az info@projectedge.hu címre.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "2",
        "Mi átadjuk a projektet",
        "Átadjuk a projektet a szervezetedbe, majd végigteszteljük a belépést, a jogosultsági szabályokat és a "
        "fájlfeltöltéseket.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "3",
        "Kulcscsere",
        "Az átadás után lecseréljük a fejlesztés közben használt titkos kulcsokat. Így a régi kulcsokkal "
        "<b>senki</b> — mi sem — nem tud hozzáférni az adataidhoz.",
        dark=True,
        accent=EMBER,
    )
    y -= 2
    y = terminal(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "projectedge.handover",
        [
            "$ projectedge.supabase --verify",
            "→ auth: ok   rls: ok   storage: ok",
            "→ service_role kulcs: rotálva",
        ],
    )
    footer(c, FOOTER_SUPABASE, dark=True)
    c.showPage()

    page_base(c, "Ellenőrzés", 4)
    y = page_heading(
        c,
        "03. lépés",
        "Próbáld ki élesben.",
        "Egy pár perces ellenőrzés a te lépésed — így biztos, hogy nem csak a felület, hanem a működés is átment.",
    )
    y = checklist(
        c,
        MARGIN,
        y,
        CONTENT_W,
        [
            "A projekt a saját Supabase szervezetemben látszik.",
            "Az éles weboldalon a belépés vagy a regisztráció működik.",
            "Egy űrlap elküldése után az adat megjelenik.",
            "A számlázás az én szervezetemhez tartozik.",
        ],
    )
    y -= 6
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "Mentések",
        "A fizetős csomagok automatikus mentést is tartalmaznak. Az átadás után a mentések és a helyreállítás "
        "felelőssége a te oldalán van — ha kérdés van, az ügyfélkapun szólj, és megmutatjuk, hol állítható.",
        tone="aqua",
    )
    tags(c, MARGIN, y, ["Saját szervezet", "Kulcsok rotálva", "Mentés beállítható"])
    footer(c, FOOTER_SUPABASE)

    return finish(c, name, "supabase-guide-cover.png")


# ═════════════════════════════════════════════════════════════════════════════
# 4. Resend (levélküldés)
# ═════════════════════════════════════════════════════════════════════════════
def build_resend_guide():
    name = "projectedge-resend-email.pdf"
    c = new_canvas(name, "ProjectEdge — Resend levélküldés útmutató")

    cover(
        c,
        eyebrow="ProjectEdge · átadási útmutató",
        title_lines=["A leveleket", "a te domained", "küldi."],
        subtitle="Resend beállítás: fiók, DNS, API kulcs.",
        terminal_label="projectedge.handover",
        terminal_lines=[
            "$ projectedge.handover --service resend",
            "→ te: fiók + domain  ·  te: SPF/DKIM rekordok",
            "→ te: API kulcs a saját Vercelbe  ·  mi: teszt",
        ],
        promise_title="Az API kulcsot soha ne küldd el nekünk.",
        promise_body=(
            "A kulcsot a saját Resend fiókodban készíted, és a saját Vercel projektedbe illeszted be. Nálunk nem "
            "halad át, és nem is tároljuk — az ügyfélkapun csak annyit jelölsz, hogy megtörtént."
        ),
        tag_items=["Saját fiók", "SPF + DKIM", "Kulcs csak nálad", "Spam-teszt"],
    )
    footer(c, FOOTER_RESEND, dark=True)
    c.showPage()

    page_base(c, "Fiók és domain", 2)
    y = page_heading(
        c,
        "01. lépés",
        "Fiók, majd a domain hozzáadása.",
        "A Resend küldi a weboldal leveleit: értesítéseket és űrlap-visszaigazolásokat. Ahhoz, hogy a levelek "
        "a te címedről (pl. info@vallalkozasod.hu) menjenek, a domainedet igazolni kell.",
    )
    for badge, title, body in [
        ("1", "Regisztráció", "Nyisd meg a resend.com/signup oldalt, és regisztrálj a saját vagy céges email címeddel."),
        (
            "2",
            "Domain hozzáadása",
            "A bal oldali menüben: <b>Domains → Add Domain</b>. Írd be a domainedet (pl. vallalkozasod.hu), "
            "ékezet és www nélkül.",
        ),
        (
            "3",
            "Írd be az ügyfélkapun",
            "Add meg, milyen email címmel készült a fiók — így tudjuk, melyik fiókkal dolgozunk a teszt során.",
        ),
    ]:
        y = step_card(c, MARGIN, y, CONTENT_W, badge, title, body)
    y -= 2
    link_row(c, MARGIN, y, [("Resend regisztráció", "https://resend.com/signup"), ("Resend dokumentáció", "https://resend.com/docs")])
    footer(c, FOOTER_RESEND)
    c.showPage()

    page_base(c, "DNS rekordok", 3, dark=True)
    y = page_heading(
        c,
        "02. lépés",
        "Vedd fel a levelezés rekordjait.",
        "A Resend kiír néhány DNS rekordot (SPF és DKIM). Ezeket a domain szolgáltatódnál kell felvenni — "
        "Rackhost esetén a <b>Domain → DNS zónák</b> résznél.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "1",
        "Másold, ne írd újra",
        "Minden rekord mellett van egy másoló ikon. Használd azt: egy elírt karakter miatt a levelek spambe "
        "kerülnek vagy egyáltalán nem mennek ki.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "2",
        "Verify",
        "A rekordok felvétele után nyomd meg a Resend <b>Verify</b> gombját. A DNS változás pár perctől pár óráig "
        "bárhol átfordulhat — ha nem sikerül elsőre, várj, és próbáld újra.",
        dark=True,
    )
    y = step_card(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "!",
        "Ha elakadsz",
        "Ne kezdj el random rekordokat törölni. Jelezd az ügyfélkapun, és képernyőmegosztással végigmegyünk rajta.",
        dark=True,
        accent=EMBER,
    )
    y -= 2
    terminal(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "projectedge.email",
        [
            "$ projectedge.email --verify vallalkozasod.hu",
            "→ SPF:  ok",
            "→ DKIM: ok  →  domain verified",
        ],
    )
    footer(c, FOOTER_RESEND, dark=True)
    c.showPage()

    page_base(c, "API kulcs", 4)
    y = page_heading(
        c,
        "03. lépés",
        "A kulcs a tiéd — te is illeszted be.",
        "Ez az egyetlen lépés, ahol titok kerül a képbe. Pont ezért nem mi kezeljük: te készíted, és te teszed a "
        "saját Vercel projektedbe.",
    )
    for badge, title, body in [
        ("1", "Kulcs készítése", "A Resendben: <b>API Keys → Create API Key</b>. Adj neki felismerhető nevet, pl. „weboldal”."),
        (
            "2",
            "Beillesztés a Vercelbe",
            "A saját Vercel projektedben: <b>Settings → Environment Variables → Add New</b>. "
            "Név: <b>RESEND_API_KEY</b>, érték: a most készített kulcs. Mentés után jelezd az ügyfélkapun.",
        ),
        (
            "3",
            "Mi teszteljük",
            "Újraindítjuk a telepítést, kipróbáljuk az éles levélküldést, és megnézzük, hogy a levél nem a spam "
            "mappában landol-e. Az eredményt az ügyfélkapun írjuk meg.",
        ),
    ]:
        y = step_card(c, MARGIN, y, CONTENT_W, badge, title, body)
    y -= 2
    y = callout(
        c,
        MARGIN,
        y,
        CONTENT_W,
        "A kulcsot ne írd be az ügyfélkapuba.",
        "Ott csak annyit jelölsz, hogy megtörtént. Ha valaki — bárki — API kulcsot, jelszót vagy bankkártyaadatot "
        "kér tőled a ProjectEdge nevében, az nem mi vagyunk.",
        tone="ember",
    )
    link_row(c, MARGIN, y, [("Vercel irányítópult", "https://vercel.com/dashboard"), ("Resend dokumentáció", "https://resend.com/docs")])
    footer(c, FOOTER_RESEND)

    return finish(c, name, "resend-guide-cover.png")


def main():
    register_fonts()
    built = [
        build_domain_guide(),
        build_vercel_guide(),
        build_supabase_guide(),
        build_resend_guide(),
    ]
    print("Elkészült:")
    for path in built:
        print(f"  {path.relative_to(ROOT)}")
    print(f"Borítók: {GUIDES_DIR.relative_to(ROOT)}/*-cover.png")


if __name__ == "__main__":
    main()
