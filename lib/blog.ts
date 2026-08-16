/**
 * Blog — tartalom és típusok.
 *
 * Szándékosan nincs MDX vagy külső CMS: a cikkek strukturált blokkokból állnak,
 * így a megjelenés minden posztnál ugyanaz a designrendszer, és a build is
 * teljesen statikus marad. Új cikk = egy új objektum ebben a tömbben.
 *
 * A bekezdésszövegben `**félkövér**` és `[link](/cél)` használható; ezt a
 * `components/blog/RichText.tsx` bontja fel.
 */

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; title: string; text: string }
  /** Kipipálható lista — a látogató végig tudja vezetni magát a saját oldalán. */
  | { type: "checklist"; title: string; intro?: string; items: string[] }
  /** Két oszlop: mi a gyakori hiba és mi helyette a jó megoldás. */
  | { type: "compare"; title: string; rows: Array<{ label: string; bad: string; good: string }> };

export type BlogPost = {
  slug: string;
  title: string;
  /** Rövid, kereső- és kártyabarát összefoglaló. */
  excerpt: string;
  category: BlogCategory;
  /** ISO dátum — a rendezés és a strukturált adat alapja. */
  publishedAt: string;
  readingMinutes: number;
  /** A cikk fölött megjelenő egy mondat: kinek szól. */
  audience: string;
  blocks: BlogBlock[];
};

export const BLOG_CATEGORIES = ["Konverzió", "Árak és döntés", "Technikai alapok", "SEO"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

const posts: BlogPost[] = [
  {
    slug: "miert-nem-hoz-ugyfelet-a-szep-weboldal",
    title: "Miért nem hoz ügyfelet a szép weboldal?",
    excerpt:
      "A legtöbb oldal nem azért nem működik, mert csúnya. Azért nem működik, mert a látogató öt másodperc alatt nem érti meg, mit csinálsz és mit kellene tennie.",
    category: "Konverzió",
    publishedAt: "2026-08-14",
    readingMinutes: 7,
    audience: "Neked szól, ha van weboldalad, tetszik is — de alig érkezik róla megkeresés.",
    blocks: [
      {
        type: "p",
        text: "Sokszor hallom ugyanazt: „csináltattunk egy szép oldalt, de nem történik semmi”. Ez a mondat majdnem mindig igaz — és majdnem mindig ugyanaz mögötte az ok. A szépség és az eredmény két külön dolog: az egyik arról szól, milyen érzést kelt az oldal, a másik arról, hogy a látogató érti-e, hova kerül és mit nyer vele."
      },
      {
        type: "p",
        text: "Az emberek nem olvassák a weboldalakat, hanem **pásztázzák**. Néhány másodpercet kapsz arra, hogy három kérdésre válaszolj: hol vagyok, mit kapok itt, és mi a következő lépés. Ha ebből bármelyik hiányzik, a látogató visszalép — nem azért, mert nem tetszett neki, hanem mert nem érte meg neki gondolkodni rajta."
      },
      { type: "h2", text: "A négy leggyakoribb ok" },
      { type: "h3", text: "1. Az első képernyő magadról szól, nem a látogatóról" },
      {
        type: "p",
        text: "„Üdvözöljük honlapunkon! Cégünk 2011 óta van jelen a piacon.” Ez a mondat a látogató egyetlen kérdésére sem válaszol. Cseréld le arra, amit **ő** nyer: mit csinálsz, kinek, és mi a látható eredmény."
      },
      {
        type: "compare",
        title: "Ugyanaz a vállalkozás, kétféle első mondattal",
        rows: [
          {
            label: "Villanyszerelő",
            bad: "Cégünk teljes körű villanyszerelési szolgáltatást nyújt.",
            good: "Veszprém és 30 km-es körzete. Hibaelhárítás jellemzően 24 órán belül, fix áras felméréssel."
          },
          {
            label: "Könyvelő",
            bad: "Megbízható partner a pénzügyekben, több évtizedes tapasztalattal.",
            good: "Kisvállalkozásoknak könyvelés havi fix díjért. Te küldöd a számlákat, a NAV-ügyintézést én intézem."
          },
          {
            label: "Fodrász",
            bad: "Modern szalonunk várja kedves vendégeinket.",
            good: "Hajvágás és festés a belvárosban. Foglalj időpontot online, 30 másodperc alatt."
          }
        ]
      },
      { type: "h3", text: "2. Nincs egyetlen egyértelmű következő lépés" },
      {
        type: "p",
        text: "Ha az oldalon egyszerre van „Kérj ajánlatot”, „Iratkozz fel”, „Kövess minket”, „Töltsd le a katalógust” és „Hívj minket”, akkor a látogató valójában **egyetlen** lépést sem lát. Válassz egy elsődleges műveletet, és azt ismételd meg következetesen, oldalanként két-három helyen."
      },
      { type: "h3", text: "3. A telefonszám nem kattintható, az űrlap túl hosszú" },
      {
        type: "p",
        text: "Mobilon a látogatók többsége telefonálni akar, nem gépelni. Ha a szám nem `tel:` linkként van kitéve, kézzel kell átmásolnia — ott elveszíted. Az űrlapnál minden extra mező mérhető kiesés: a név, az email és egy szabad szöveges mező a legtöbb szolgáltatásnál bőven elég, a többit úgyis megkérdezed a válaszban."
      },
      { type: "h3", text: "4. Semmi nem bizonyítja, hogy jó vagy" },
      {
        type: "p",
        text: "A „megbízható”, „profi” és „minőségi” szavak nem bizonyítanak semmit, mert bárki leírhatja őket. Ami bizonyít: konkrét szám, konkrét eset, valódi fotó a saját munkádról, név szerinti vélemény. Egyetlen valódi ügyfélmondat többet ér, mint három bekezdés önjellemzés."
      },
      {
        type: "callout",
        title: "A leggyakoribb hiba, amit látok",
        text: "Az oldal elmondja, mit CSINÁL a vállalkozás, de nem mondja el, mi a látogató PROBLÉMÁJA. Aki a saját helyzetét nem ismeri fel az első képernyőn, az nem fogja végigolvasni a szolgáltatáslistát."
      },
      {
        type: "checklist",
        title: "Nézd végig a saját oldaladat",
        intro:
          "Nyisd meg az oldalad mobilon, és menj végig ezen a nyolc ponton. Pipáld ki, ami igaz — amit nem tudsz kipipálni, azon érdemes változtatni.",
        items: [
          "Az első képernyőn látszik, mit csinálsz és kinek",
          "Az első képernyőn látszik, hol dolgozol (város, körzet, országos)",
          "Van egy darab, egyértelmű gomb a legfontosabb művelettel",
          "A telefonszám kattintható, és mobilon egy koppintásra hív",
          "Az űrlap legfeljebb négy mezőt kér",
          "Van legalább egy valódi referencia, vélemény vagy saját fotó",
          "Az árazásról van információ — akár csak sáv vagy induló ár",
          "Az oldal mobilon 3 másodpercen belül használható"
        ]
      },
      { type: "h2", text: "Mit csinálj holnap reggel?" },
      {
        type: "p",
        text: "Ne az egész oldalt kezdd el újratervezni. Írd át az első képernyő szövegét arra, amit a fenti táblázat jobb oszlopa mutat, tedd kattinthatóvá a telefonszámot, és dobj ki minden mezőt az űrlapból, ami nélkül is tudsz válaszolni. Ez a három lépés egy délután alatt megvan, és jellemzően többet hoz, mint egy teljes redesign."
      },
      {
        type: "p",
        text: "Ha kíváncsi vagy, nálad konkrétan mi akadályozza a megkereséseket, [kérj egy ingyenes 3 pontos elemzést](/ingyenes-weboldal-audit) — 24 órán belül küldöm, kötelezettség nélkül."
      }
    ]
  },
  {
    slug: "mennyibe-kerul-egy-weboldal",
    title: "Mennyibe kerül egy weboldal? Őszinte árazás, kertelés nélkül",
    excerpt:
      "50 ezertől több millióig minden ár létezik a piacon — és mindegyik mögött más tartalom van. Végigveszem, mit fizetsz ki valójában, és mikor éri meg bérelni a saját tulajdon helyett.",
    category: "Árak és döntés",
    publishedAt: "2026-08-12",
    readingMinutes: 8,
    audience: "Neked szól, ha most kérsz ajánlatokat, és nem érted, miért ilyen nagy a szórás.",
    blocks: [
      {
        type: "p",
        text: "A weboldal ára azért mozog ekkora sávban, mert a „weboldal” szó legalább öt különböző terméket jelöl. Egy sablonra ültetett egyoldalas bemutatkozó és egy egyedi, foglalási rendszerrel működő oldal ugyanúgy „weboldal”, csak épp tízszeres a különbség a mögötte lévő munkában."
      },
      { type: "h2", text: "Mit fizetsz ki valójában?" },
      {
        type: "ul",
        items: [
          "**Gondolkodás:** milyen oldalak kellenek, mi hova kerül, mi a látogató útja. Ez a legkevésbé látható és a leginkább meghatározó rész.",
          "**Szöveg:** aki érthetően megfogalmazza, mit csinálsz. Sokszor ez a legdrágább hiányzó elem.",
          "**Design:** sablon átszínezése vagy a márkádra épített egyedi rendszer.",
          "**Fejlesztés:** hogy gyors legyen, mobilon is működjön, és az űrlap tényleg megérkezzen.",
          "**Üzemeltetés:** domain, tárhely, SSL, frissítés, mentés, felügyelet — ez sosem egyszeri tétel."
        ]
      },
      {
        type: "callout",
        title: "Az árban a legfontosabb kérdés nem az összeg",
        text: "Hanem az, hogy mi NINCS benne. A domain? A tárhely? A szöveg? A későbbi módosítás? Két ajánlat közül gyakran az olcsóbb kerül többe, mire minden hiányzó tétel előkerül."
      },
      { type: "h2", text: "Egyszeri vásárlás vagy havidíj?" },
      {
        type: "p",
        text: "Ez a döntés nem arról szól, melyik „olcsóbb”, hanem arról, hogy **kinél legyen a technikai teher**. Egyszeri vásárlásnál a tiéd lesz minden, de tiéd lesz a domain megújítása, a tárhelyszámla, a frissítés és a hibakeresés is. Havidíjnál nincs nagy induló kiadás és nincs technikai feladatod, cserébe amíg fizetsz, addig a szolgáltatónál marad a rendszer."
      },
      {
        type: "compare",
        title: "A két konstrukció őszintén",
        rows: [
          {
            label: "Induló kiadás",
            bad: "Egyszeri: több százezer forint egy összegben, jellemzően foglalóval",
            good: "Havidíj: nincs külön belépési díj, az első havidíj indítja a munkát"
          },
          {
            label: "Technikai teendő",
            bad: "Egyszeri: a domain, a tárhely, a frissítés és a mentés a tiéd",
            good: "Havidíj: nincs teendőd, a szolgáltató kezel mindent"
          },
          {
            label: "Tulajdon",
            bad: "Havidíj: a forráskód a szolgáltatónál marad, amíg elő nem fizetsz ki",
            good: "Egyszeri: a forráskód és minden hozzáférés a tiéd"
          },
          {
            label: "Hosszú táv",
            bad: "Havidíj: néhány év után összeadva több lehet, mint az egyszeri ár",
            good: "Egyszeri: a díj után csak az üzemeltetés költsége marad"
          }
        ]
      },
      {
        type: "p",
        text: "Nincs univerzálisan jó válasz. Ha most indulsz, vagy nem akarsz technikai fiókokat kezelni, a havidíj kockázatmentesebb. Ha stabil a vállalkozásod, van kitől üzemeltetni, és zavar, hogy nem a tiéd — akkor a tulajdon a jobb. A [vételi opció](/#veteli-opcio) pont azért létezik, hogy ne kelljen ezt már az elején eldöntened."
      },
      { type: "h2", text: "Mire figyelj az ajánlatokban?" },
      {
        type: "checklist",
        title: "Kérdések, amiket tegyél fel minden ajánlatnál",
        intro: "Ha ezekre nem kapsz írásban választ, az ár nem összehasonlítható.",
        items: [
          "Benne van a domain és a tárhely? Meddig, és utána mennyi?",
          "Ki írja a szövegeket, és az benne van az árban?",
          "Hány oldal és hány módosítási kör tartozik hozzá?",
          "Mi történik, ha élesítés után javítani kell valamit?",
          "Kinél lesznek a hozzáférések és a forráskód?",
          "Mennyi idő alatt készül el, és mitől csúszhat?",
          "Van-e hűségidő, és hogyan lehet kilépni?"
        ]
      },
      {
        type: "p",
        text: "A [csomagok és árak](/#arak) nálam nyilvánosak, és mindegyiknél ki van írva, mi tartozik bele, meg az is, mi nem. Ha bizonytalan vagy, melyik méret a te helyzeted, a részletes összehasonlító táblázat pont ezt a döntést segíti."
      }
    ]
  },
  {
    slug: "domain-tarhely-ssl-mi-micsoda",
    title: "Domain, tárhely, SSL: mi micsoda, és kinél legyen?",
    excerpt:
      "Három szó, ami minden ajánlatban ott van, és amitől a legtöbb vállalkozó ideges lesz. Elmagyarázom érthetően, és megmutatom, mikor kerülsz bajba miattuk.",
    category: "Technikai alapok",
    publishedAt: "2026-08-08",
    readingMinutes: 6,
    audience: "Neked szól, ha most készül az oldalad, és nem akarsz később kiszolgáltatott helyzetbe kerülni.",
    blocks: [
      {
        type: "p",
        text: "Ezt a hármat sokan összemossák, pedig három külön dolog, külön számlával és külön kockázattal. Ha egy mondatban kell összefoglalni: a **domain** a cím, a **tárhely** az épület, az **SSL** pedig a bejárati ajtón lévő zár."
      },
      { type: "h2", text: "Domain — a cím" },
      {
        type: "p",
        text: "Ez a `cegnev.hu`. Évente megújítandó, és mindig van egy nyilvántartott **használója** meg egy **kezelője**. Ez a kettő nem ugyanaz, és pont ebből lesz a baj: sok vállalkozó azt hiszi, övé a domain, aztán kiderül, hogy a régi fejlesztő saját fiókjában van, ő pedig nem elérhető."
      },
      {
        type: "callout",
        title: "A legfontosabb mondat ebben a cikkben",
        text: "Kérdezd meg írásban, hogy kinek a nevén és kinek a fiókjában lesz a domain, és mi történik vele, ha megszűnik az együttműködés. Ha erre a kérdésre kitérő választ kapsz, az önmagában válasz."
      },
      { type: "h2", text: "Tárhely — az épület" },
      {
        type: "p",
        text: "Itt fut a weboldal. A klasszikus tárhely egy bérelt hely egy szerveren; a modern felhőplatformok (például a Vercel, amit én is használok) ennél rugalmasabbak és gyorsabbak. A látogató szempontjából egy dolog számít: milyen gyorsan jelenik meg az oldal a telefonján."
      },
      {
        type: "ul",
        items: [
          "**Sebesség:** a lassú oldal a Google rangsorában és a látogatónál is veszít.",
          "**Mentés:** legyen automatikus, és tudni kell, hány napra vissza.",
          "**Frissítés:** a rendszereket folyamatosan frissíteni kell, különben biztonsági rés lesz belőlük.",
          "**Rendelkezésre állás:** a kiesés nem elkerülhetetlen ritkaság, hanem kezelendő kockázat."
        ]
      },
      { type: "h2", text: "SSL — a zár" },
      {
        type: "p",
        text: "Ettől lesz `https://` a cím elején és lakat a böngészőben. Ma már nem opció: enélkül a böngészők figyelmeztetést írnak ki a látogatóknak, a Google pedig hátrébb sorol. A jó hír, hogy ingyenes tanúsítványokkal megoldható, és minden rendes szolgáltatónál alapból jár."
      },
      { type: "h2", text: "Céges email — a negyedik, amiről kevesen beszélnek" },
      {
        type: "p",
        text: "Ha van saját domained, akkor lehet `info@cegnev.hu` címed is. Ez apróságnak tűnik, de a bizalomra mérhető hatása van: egy ajánlatkérés `kovacsjanos78@freemail.hu` címről más benyomást kelt, mint `info@kovacsklima.hu` címről. A legegyszerűbb megoldás az **átirányítás**: a céges címre érkező levél automatikusan a meglévő postafiókodba fut be, nem kell külön fiókot kezelned."
      },
      {
        type: "checklist",
        title: "Mielőtt aláírsz, tisztázd ezeket",
        items: [
          "Kinek a nevén lesz a domain, és ki fizeti a megújítást?",
          "Mi történik a domainnel, ha vége az együttműködésnek?",
          "Ki fizeti a tárhelyet, és mennyi az éves díja?",
          "Automatikus-e a mentés, és hány napra visszamenőleg?",
          "Benne van-e az SSL, vagy külön tétel?",
          "Kapok-e céges email címet vagy átirányítást?"
        ]
      },
      {
        type: "p",
        text: "Nálam mindezt a havidíj tartalmazza, és nincs vele dolgod: a domaint én veszem meg és újítom meg, a tárhelyet, az SSL-t és a mentést is én kezelem. Ha később a saját tulajdonodba vennéd az egészet, [a vételi opcióval](/#veteli-opcio) átveszed a fiókokat is — vezetett, írásos átadással."
      }
    ]
  },
  {
    slug: "helyi-vallalkozas-google-kereses",
    title: "Hogyan találjon meg a Google, ha helyben dolgozol?",
    excerpt:
      "A helyi keresés nem ugyanaz, mint az országos SEO. Sokkal kevesebb munkával lehet az első találatok közé kerülni — ha a megfelelő négy dolgot csinálod.",
    category: "SEO",
    publishedAt: "2026-08-04",
    readingMinutes: 6,
    audience: "Neked szól, ha egy városban vagy körzetben dolgozol, és onnan várod az ügyfeleket.",
    blocks: [
      {
        type: "p",
        text: "Ha „villanyszerelő Veszprém” vagy „fodrász Budapest 13. kerület” típusú keresésekből várod az ügyfeleket, akkor nem az országos SEO-val kell versenyezned. A helyi találatok jóval kisebb mezőnyben dőlnek el, és a Google itt egészen konkrét jeleket keres."
      },
      { type: "h2", text: "1. Google Cégprofil — ez a legfontosabb" },
      {
        type: "p",
        text: "A térképes találati doboz, ami a keresés tetején megjelenik, nem a weboldaladból jön, hanem a **Google Cégprofilból** (korábban Google Cégem). Ingyenes, és sokkal nagyobb hatása van a helyi megtalálhatóságra, mint bárminek, amit az oldaladon csinálsz."
      },
      {
        type: "ul",
        items: [
          "Töltsd ki hiánytalanul: kategória, nyitvatartás, szolgáltatási körzet, telefonszám.",
          "Tölts fel **saját** fotókat, ne stockot — a valódi munkádról készült képek jobban teljesítenek.",
          "Kérj értékeléseket. Ez a legerősebb helyi rangsoroló jel, és a legkevesebben kérik.",
          "Válaszolj az értékelésekre, a rosszakra is — udvariasan, tényszerűen."
        ]
      },
      { type: "h2", text: "2. Legyen kiírva, hol dolgozol" },
      {
        type: "p",
        text: "Meglepően sok oldalról hiányzik a város neve. Ha a szöveged csak annyi, hogy „gyors és megbízható szolgáltatás”, a Google-nek nincs mihez kötnie a helyet. Írd le természetesen a szövegben, hol dolgozol, és sorold fel a településeket vagy kerületeket, ahova kimész."
      },
      {
        type: "callout",
        title: "Ne told túl",
        text: "A településnevek gépies felsorolása („villanyszerelő Veszprém, villanyszerelő Balatonfüred, villanyszerelő Ajka…”) ma már inkább árt. Írd bele mondatokba, ahogy egy embernek magyaráznád."
      },
      { type: "h2", text: "3. Sebesség és mobilnézet" },
      {
        type: "p",
        text: "A helyi keresések többsége telefonról indul, gyakran mozgás közben. Ha az oldalad lassan tölt be vagy nehezen használható mobilon, azt a Google is méri és a látogató is megérzi. Ez az a pont, ahol a technikai minőség közvetlenül pénzben mérhető."
      },
      { type: "h2", text: "4. Egy oldal minden fő szolgáltatásnak" },
      {
        type: "p",
        text: "Ha háromféle dolgot csinálsz, ne egy összevont „Szolgáltatásaink” oldalt tegyél ki. Külön oldal mindegyiknek, saját címmel és saját szöveggel — a Google így tudja külön-külön rangsorolni őket, a látogató pedig azt találja meg, amit keresett."
      },
      {
        type: "checklist",
        title: "Helyi láthatóság ellenőrzőlista",
        intro: "Ezek nagy részét egyetlen délután alatt meg tudod csinálni, ingyen.",
        items: [
          "Van kitöltött Google Cégprofilom, saját fotókkal",
          "Legalább 5 valódi értékelésem van, és válaszoltam rájuk",
          "A weboldalon szerepel a város és a szolgáltatási körzet",
          "A telefonszám kattintható, mobilon egy koppintásra hív",
          "Minden fő szolgáltatásomnak van saját oldala",
          "Az oldal mobilon 3 másodperc alatt használható",
          "A nyitvatartás mindenhol ugyanaz (weboldal, Google, Facebook)"
        ]
      },
      {
        type: "p",
        text: "Ha a technikai része az, ami elakadt, [nézd meg a csomagokat](/#arak) — az alap keresőoptimalizálás és a mérés mindegyikben benne van, a mobilos sebességre pedig külön figyelek."
      }
    ]
  }
];

/** Legfrissebb elöl — a listaoldal és a sitemap is ezt a sorrendet használja. */
export const BLOG_POSTS = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function blogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

/** Ajánlott továbbolvasás: azonos kategória előnyben, aztán a legfrissebbek. */
export function relatedPosts(slug: string, limit = 2) {
  const current = blogPost(slug);
  if (!current) return [];
  const others = BLOG_POSTS.filter((post) => post.slug !== slug);
  const sameCategory = others.filter((post) => post.category === current.category);
  return [...sameCategory, ...others.filter((post) => post.category !== current.category)].slice(0, limit);
}

export function formatBlogDate(iso: string) {
  return new Date(iso).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * A H2 címekből épül a tartalomjegyzék és a görgetéskövetés, ezért az
 * azonosítót egy helyen képezzük — a listát és a címet is ez köti össze.
 */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function postHeadings(post: BlogPost) {
  return post.blocks
    .filter((block): block is { type: "h2"; text: string } => block.type === "h2")
    .map((block) => ({ id: headingId(block.text), text: block.text }));
}
