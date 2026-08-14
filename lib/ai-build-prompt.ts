/**
 * Az ügyfél briefjéből összeállított, AI-nak beilleszthető építési prompt.
 *
 * Miért van külön, tiszta modulban: az admin felület csak megjeleníti és
 * másolja a szöveget, a tényleges tudás (mit kell egy AI-nak tudnia ahhoz,
 * hogy kérdés nélkül fel tudja építeni az oldalt) itt él, tesztelhetően.
 *
 * A `components/portal/brief-fields` importja szándékos: az ott lévő paletta-
 * és címketáblák tiszta adatok (nincs React), és pontosan azok, amiket az
 * ügyfél a briefben látott — így a prompt ugyanazt a szótárat használja.
 */

import { paletteOptions, priorityLabels, platformLabels } from "@/components/portal/brief-fields";
import { formatHuf, subscriptionPlan, type CommercialModel, type SubscriptionPlanKey } from "@/lib/subscriptions";
import { PROVIDER } from "@/lib/legal";

export type PromptStack = "nextjs" | "static" | "astro";
export type PromptDepth = "compact" | "full";

export type PromptSectionKey =
  | "role"
  | "stack"
  | "business"
  | "audience"
  | "sitemap"
  | "features"
  | "design"
  | "content"
  | "assets"
  | "seo"
  | "quality"
  | "legal"
  | "integrations"
  | "acceptance";

export const AI_PROMPT_SECTIONS: Array<{ key: PromptSectionKey; label: string; hint: string }> = [
  { key: "role", label: "Szerep és küldetés", hint: "Ki az AI, mit kell leszállítania." },
  { key: "stack", label: "Technológia és korlátok", hint: "Keretrendszer, fájlszerkezet, tiltott megoldások." },
  { key: "business", label: "Vállalkozás és ajánlat", hint: "Cégnév, mivel foglalkozik, mi a cél." },
  { key: "audience", label: "Célközönség és konverzió", hint: "Kinek szól, mit tegyen a látogató." },
  { key: "sitemap", label: "Oldaltérkép és blokkok", hint: "Milyen oldalak, oldalanként milyen szekciók." },
  { key: "features", label: "Funkciók", hint: "Űrlap, foglalás, térkép, galéria és társai." },
  { key: "design", label: "Designrendszer", hint: "Színek hexben, tipográfia, hangulat, komponensek." },
  { key: "content", label: "Szövegírás", hint: "Hangnem, nyelv, mennyiség, tiltott közhelyek." },
  { key: "assets", label: "Anyagok és linkek", hint: "Logó, képek, közösségi profilok, elérhetőségek." },
  { key: "seo", label: "SEO és metaadatok", hint: "Title, description, sitemap, strukturált adat." },
  { key: "quality", label: "Minőség: sebesség és akadálymentesség", hint: "Mérhető elvárások a kész oldalra." },
  { key: "legal", label: "Jogi oldalak", hint: "Impresszum, adatkezelés, süti — magyar kötelezettségek." },
  { key: "integrations", label: "Integrációk", hint: "Űrlapküldés, mérés, külső rendszerek." },
  { key: "acceptance", label: "Átadási ellenőrzőlista", hint: "Mikor tekinthető késznek a munka." }
];

export type AiPromptOptions = {
  stack: PromptStack;
  depth: PromptDepth;
  sections: Record<PromptSectionKey, boolean>;
  /** Az ügyfél neve, e-mailje, telefonja bekerüljön-e. Alapból nem. */
  includeContact: boolean;
  /** A feltöltött fájlok aláírt/publikus URL-jei bekerüljenek-e. */
  includeAssetUrls: boolean;
  /** Szabad szöveg, ami a prompt végére kerül külön blokként. */
  extraInstructions: string;
};

export const defaultAiPromptOptions: AiPromptOptions = {
  stack: "nextjs",
  depth: "full",
  sections: AI_PROMPT_SECTIONS.reduce((all, section) => {
    all[section.key] = true;
    return all;
  }, {} as Record<PromptSectionKey, boolean>),
  includeContact: false,
  includeAssetUrls: true,
  extraInstructions: ""
};

/** Amit a prompt építéséhez a projektből ki kell olvasni. */
export type AiPromptProject = {
  title: string;
  company: string | null;
  website: string | null;
  commercialModel: CommercialModel;
  subscriptionPlanKey: SubscriptionPlanKey | null;
  monthlyPrice: number | null;
  managedDomain: string | null;
  logoUrl: string | null;
  adminNotes: string | null;
  contactName: string | null;
  contactEmail: string | null;
  /** A brief nyers mezői (`client_projects.brief_data`). */
  brief: Record<string, unknown> | null;
  /** A brief szöveges változatából kinyert kulcs-érték párok. */
  parsed: Record<string, string>;
};

const STACK_RULES: Record<PromptStack, string[]> = {
  nextjs: [
    "Next.js (App Router) + React + TypeScript, `app/` könyvtárral.",
    "Szerver komponens az alapértelmezett; `\"use client\"` csak ott, ahol tényleg kell (állapot, esemény, böngésző API).",
    "Stílus: egyetlen globális CSS fájl CSS változókkal. Ne húzz be UI keretrendszert (Tailwind, Bootstrap, MUI) külön kérés nélkül.",
    "Metaadat a `metadata` exporttal oldalanként, nem `<head>` kézi írásával.",
    "Képek `next/image`-dzsel, megadott szélesség/magasság aránnyal."
  ],
  static: [
    "Sima statikus oldal: HTML + CSS + minimális vanilla JavaScript. Nincs build lépés.",
    "Egy `index.html` és aloldalanként egy-egy `.html`, közös `styles.css` és `script.js`.",
    "Ne használj CDN-ről betöltött keretrendszert; a betűtípusokat is helyben tárold.",
    "A közös fejléc/lábléc ismétlődik a fájlokban — tartsd betű szerint azonosan."
  ],
  astro: [
    "Astro + TypeScript, `src/pages` útvonalakkal és `src/components` komponensekkel.",
    "Alapból nulla kliensoldali JavaScript; `client:*` direktíva csak ott, ahol interakció kell.",
    "Stílus: komponensszintű `<style>` blokkok, globális CSS változókkal a designrendszerhez."
  ]
};

const VIBE_LABELS: Record<string, string> = {
  premium: "Prémium",
  clean: "Letisztult",
  bold: "Merész",
  friendly: "Barátságos"
};

const VIBE_DIRECTIVES: Record<string, string> = {
  premium: "Prémium: nagy kontraszt, bőséges levegő (96–140px szekcióköz), nagy méretű, feszes tipográfia, visszafogott mozgás. Kerüld a színes díszítést és a lekerekített „vidám” formákat.",
  clean: "Letisztult: sok fehér tér, legfeljebb két betűméret-szint szekciónként, egyszerű rácsok, halvány elválasztó vonalak árnyék helyett.",
  bold: "Merész: nagy display-tipográfia (min. 56px hero), erős színblokkok, karakteres szekcióváltások, széles gombok.",
  friendly: "Barátságos: lágyabb sarkok (14–20px), melegebb árnyalatok, közvetlen mikroszövegek, emberi fotók előtérben."
};

const PRIMARY_ACTION_RULES: Record<string, string> = {
  "Ajánlatot kérek": "Az ajánlatkérő űrlap a fő konverzió: legyen elérhető a heróból, minden szekció végéről és a láblécből is.",
  Kapcsolatfelvétel: "A kapcsolati űrlap a fő konverzió: rövid (név, e-mail, üzenet), és minden oldalon egy kattintásra legyen.",
  Telefonálok: "A telefonhívás a fő konverzió: `tel:` link a fejlécben ragadva, mobilon fix alsó hívásgombbal.",
  "Időpontot foglalok": "Az időpontfoglalás a fő konverzió: a hero elsődleges gombja ide visz, és külön foglalási szekció is kell."
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return text(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function paletteColors(brief: Record<string, unknown> | null, parsedName: string): string[] {
  const key = text(brief?.palette);
  if (key === "custom") {
    return [text(brief?.customBg), text(brief?.customAccent), text(brief?.customText), text(brief?.customCta)].filter(Boolean);
  }
  const byKey = paletteOptions.find(([value]) => value === key);
  if (byKey) return byKey[2];
  const byName = paletteOptions.find(([, label]) => label === parsedName);
  return byName ? byName[2] : paletteOptions[0][2];
}

function paletteName(brief: Record<string, unknown> | null, parsedName: string): string {
  const key = text(brief?.palette);
  if (key === "custom") return "Egyedi paletta (az ügyfél állította be)";
  const byKey = paletteOptions.find(([value]) => value === key);
  return byKey?.[1] || parsedName || paletteOptions[0][1];
}

/** Oldalanként javasolt szekciók — ez teszi a promptot azonnal építhetővé. */
const PAGE_BLUEPRINTS: Array<[RegExp, string[]]> = [
  [/^(fő|nyitó|home)/i, ["hero állítással és elsődleges gombbal", "3 bizalmi pont vagy szám", "szolgáltatások rövid rácsban", "miért minket / folyamat 3–4 lépésben", "referencia vagy vélemény", "GYIK rövid kivonat", "záró CTA sáv"]],
  [/szolgáltat/i, ["bevezető a problémáról", "szolgáltatáskártyák (egyenként cím, 2 mondat, mit kap)", "árazási vagy csomag blokk, ha van", "folyamat", "CTA"]],
  [/(rólunk|bemutat)/i, ["ki áll a vállalkozás mögött", "történet 2 bekezdésben", "értékek 3 pontban", "fotó vagy csapatblokk", "CTA"]],
  [/(referen|munkák|galéria|portfólió)/i, ["rácsos elrendezés képekkel", "elemenként cím + egy mondat kontextus", "opcionális szűrés kategóriára", "CTA"]],
  [/(ár|price)/i, ["2–3 csomag egymás mellett", "csomagonként ár, kinek való, mit tartalmaz", "kiemelt középső csomag", "ármagyarázó megjegyzés", "CTA"]],
  [/(gyik|faq|kérdés)/i, ["6–10 valódi kérdés lenyíló válaszokkal", "záró CTA, ha nem találta meg a választ"]],
  [/kapcsolat/i, ["űrlap (a szükséges mezőkkel)", "közvetlen elérhetőségek kattinthatóan", "nyitvatartás, ha releváns", "térkép, ha van fizikai cím"]],
  [/blog/i, ["listaoldal kártyákkal (cím, dátum, kivonat)", "cikkoldal olvasható tipográfiával (max 72 karakter sorhossz)", "kapcsolódó cikkek"]],
  [/(vélemény|értékel)/i, ["3–6 vélemény névvel és kontextussal", "vizuálisan ne legyen kitalált logó vagy hamis csillagszám"]]
];

function blueprintFor(page: string): string[] {
  const match = PAGE_BLUEPRINTS.find(([pattern]) => pattern.test(page));
  return match ? match[1] : ["bevezető blokk", "fő tartalom logikus alszekciókban", "záró CTA"];
}

function bullets(items: Array<string | false | null | undefined>): string {
  return items.filter(Boolean).map((item) => `- ${item}`).join("\n");
}

function fieldLines(pairs: Array<[string, string]>): string {
  return pairs.filter(([, value]) => Boolean(value)).map(([label, value]) => `- **${label}:** ${value}`).join("\n");
}

/**
 * A teljes prompt összeállítása. Determinisztikus: ugyanaz a projekt és
 * ugyanaz a beállítás mindig ugyanazt a szöveget adja (nincs benne dátum
 * vagy véletlen), így a másolt prompt összehasonlítható és verziózható.
 */
export function buildAiBuildPrompt(project: AiPromptProject, options: AiPromptOptions): string {
  const brief = project.brief;
  const parsed = project.parsed;
  const on = (key: PromptSectionKey) => options.sections[key] !== false;
  const full = options.depth === "full";

  const company = project.company || project.title || "A vállalkozás";
  const goals = text(brief?.goals) || parsed["Cél"] || "";
  const audience = text(brief?.audience) || parsed["Célközönség / vásárlók"] || "";
  const primaryAction = text(brief?.primaryAction) || parsed["Elsődleges látogatói művelet"] || "";
  const contentBrief = text(brief?.contentBrief) || parsed["Szövegek"] || "";
  const pages = list(brief?.pages ?? parsed["Fontos oldalak"]);
  const features = list(brief?.features ?? parsed["Kért funkciók"]);
  const vibe = text(brief?.vibe) || parsed["Vizuális karakter"] || "";
  const style = text(brief?.style) || parsed["Stílus / hangulat"] || "";
  const font = text(brief?.fontPreference) || parsed["Betűtípus"] || "";
  const brandColors = text(brief?.brandColors) || parsed["Márkaszín"] || "";
  const priority = priorityLabels[text(brief?.priority)] || parsed["Prioritás"] || "";
  const platform = platformLabels[text(brief?.existingPlatform)] || parsed["Jelenlegi rendszer"] || "";
  const colors = paletteColors(brief, parsed["Színirány"] ?? "");
  const domain = project.managedDomain || text(brief?.domainName) || parsed["Domain"] || "";
  const publicEmail = text(brief?.contactEmail) || parsed["Kapcsolati email"] || "";
  const publicPhone = text(brief?.contactPhone) || parsed["Telefon"] || "";
  const plan = project.subscriptionPlanKey ? subscriptionPlan(project.subscriptionPlanKey) : null;

  const socials = fieldLines([
    ["Facebook", text(brief?.facebookUrl)],
    ["Instagram", text(brief?.instagramUrl)],
    ["LinkedIn", text(brief?.linkedinUrl)],
    ["TikTok", text(brief?.tiktokUrl)],
    ["YouTube", text(brief?.youtubeUrl)],
    ["Egyéb", text(brief?.otherSocialLinks) || text(brief?.socialLinks)]
  ]);

  const photoUrls = options.includeAssetUrls ? list(brief?.photoUrls) : [];
  const contentUrls = options.includeAssetUrls ? list(brief?.contentFileUrls) : [];

  const out: string[] = [];
  const push = (heading: string, body: string) => {
    if (body.trim()) out.push(`## ${heading}\n\n${body.trim()}`);
  };

  out.push(`# Weboldal építési brief — ${company}`);

  if (on("role")) {
    push(
      "0. Szerep és feladat",
      [
        `Tapasztalt webfejlesztő és UX-szövegíró vagy. A feladatod, hogy az alábbi brief alapján **egy teljes, éles használatra kész weboldalt** építs a(z) „${company}" nevű vállalkozásnak.`,
        "",
        bullets([
          "Ne tegyél fel visszakérdezést. Ahol hiányzik adat, hozz szakmailag védhető döntést, és a végén sorold fel külön listában, mit feltételeztél.",
          "Ne írj helykitöltő szöveget („Lorem ipsum”, „Ide jön a szöveg”). Minden szöveg valódi, magyar nyelvű, publikálható legyen.",
          "Ne találj ki tényt: konkrét ügyfélszámot, díjat, évszámot, referencianevet vagy értékelést csak akkor írj, ha a brief tartalmazza.",
          "Először add meg a fájlszerkezetet egy listában, aztán fájlonként a teljes tartalmat. Ne hagyj ki fájlt „a rövidség kedvéért”."
        ])
      ].join("\n")
    );
  }

  if (on("stack")) {
    push("1. Technológia és korlátok", bullets(STACK_RULES[options.stack]));
  }

  if (on("business")) {
    push(
      "2. A vállalkozás",
      [
        fieldLines([
          ["Név", company],
          ["Projekt megnevezése", project.title],
          ["Jelenlegi weboldal", project.website || "nincs"],
          ["Jelenlegi rendszer", platform],
          ["Tervezett domain", domain],
          ["Konstrukció", project.commercialModel === "subscription"
            ? `menedzselt előfizetés${plan ? ` — ${plan.name} csomag (${plan.pages})` : ""}${project.monthlyPrice ? `, ${formatHuf(project.monthlyPrice)}/hó` : ""}`
            : "egyszeri fejlesztés, az ügyfél tulajdonába kerül"],
          ["Fő üzleti cél", goals],
          ["Prioritás", priority]
        ]),
        contentBrief ? `\n**Amit az ügyfél mesélt magáról — ez a szövegírás nyersanyaga, dolgozd fel, ne másold:**\n\n> ${contentBrief.replace(/\n+/g, "\n> ")}` : "",
        project.commercialModel === "subscription" && plan
          ? `\n**Terjedelmi korlát:** a csomag terjedelme: ${plan.pages.toLowerCase()}. Ne építs többet — ami nem fér bele, azt jelezd külön listában bővítési javaslatként.`
          : ""
      ].join("\n")
    );
  }

  if (on("audience")) {
    push(
      "3. Célközönség és konverzió",
      [
        fieldLines([
          ["Kinek szól", audience || "általános magyar kisvállalkozói ügyfélkör"],
          ["Elsődleges látogatói művelet", primaryAction || "kapcsolatfelvétel"]
        ]),
        "",
        bullets([
          PRIMARY_ACTION_RULES[primaryAction] || "A fő konverziós gomb minden oldalon egy kattintásra legyen elérhető.",
          "Minden szekció végén legyen továbbvivő lépés — ne érjen véget az oldal „zsákutcában”.",
          "A szövegek a látogató problémájáról szóljanak, ne a cég belső folyamatairól.",
          full && "Az első képernyőn (görgetés nélkül) derüljön ki: mit csinál a cég, kinek, hol, és mit tegyen a látogató."
        ])
      ].join("\n")
    );
  }

  if (on("sitemap")) {
    const pageList = pages.length ? pages : ["Főoldal", "Szolgáltatások", "Rólunk", "Kapcsolat"];
    push(
      "4. Oldaltérkép és oldalankénti szerkezet",
      [
        pageList
          .map((page, index) => {
            const blocks = blueprintFor(page);
            return full
              ? `### ${index + 1}. ${page}\n\n${bullets(blocks)}`
              : `- **${page}:** ${blocks.join(", ")}`;
          })
          .join(full ? "\n\n" : "\n"),
        "",
        bullets([
          "Fejléc: logó, oldalmenü, egy kiemelt konverziós gomb. Mobilon teljes képernyős menü.",
          "Lábléc: elérhetőségek, oldaltérkép linkek, jogi oldalak, közösségi profilok.",
          full && "Minden aloldalnak legyen saját, tartalomhoz illő fejléc-blokkja — ne ugyanaz a hero ismétlődjön."
        ])
      ].join("\n")
    );
  }

  if (on("features")) {
    push(
      "5. Funkciók",
      [
        features.length ? bullets(features) : "- Kapcsolati űrlap",
        "",
        bullets([
          "Minden űrlaphoz: kliens- és szerveroldali validáció, látható hibaüzenet, sikeres állapot visszajelzés, kettős beküldés elleni védelem.",
          "Az űrlap ne veszítse el a beírt adatot hiba esetén.",
          full && "Ahol lista vagy galéria van, oldd meg üres állapottal is (mi látszik, ha még nincs elem)."
        ])
      ].join("\n")
    );
  }

  if (on("design")) {
    const [bg, accent, ink, cta] = colors;
    push(
      "6. Designrendszer",
      [
        fieldLines([
          ["Paletta", paletteName(brief, parsed["Színirány"] ?? "")],
          ["Háttér", bg],
          ["Kiemelő szín", accent],
          ["Szövegszín", ink],
          ["Gomb / CTA szín", cta],
          ["Márkaszínek az ügyféltől", brandColors],
          ["Betűtípus irány", font || "modern groteszk"],
          ["Hangulat", VIBE_LABELS[vibe] || vibe],
          ["Stílus megjegyzés", style]
        ]),
        "",
        VIBE_DIRECTIVES[vibe] ? `**Vizuális irány:** ${VIBE_DIRECTIVES[vibe]}` : "",
        "",
        bullets([
          "A színeket CSS változóként definiáld egy helyen (`--bg`, `--accent`, `--ink`, `--cta`), és mindenhol ezekre hivatkozz.",
          "Konzisztens térköz-skála: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 px.",
          "Maximum két betűcsalád. Törzsszöveg legalább 16px, sormagasság 1.5–1.7.",
          "Tartalmi sáv maximum 1200px széles, oldalt legalább 20px margóval mobilon.",
          full && "Töréspontok: 640 / 900 / 1200px. Mobilon tervezz először, aztán bővítsd.",
          full && "Kattintható felület minimum 44×44px. Fókuszgyűrű látható legyen minden interaktív elemen.",
          full && "Mozgás: csak finom, 150–250ms átmenetek; tiszteld a `prefers-reduced-motion` beállítást."
        ])
      ].join("\n")
    );
  }

  if (on("content")) {
    push(
      "7. Szövegírás",
      bullets([
        "Nyelv: magyar. Természetes, magázó hangnem, rövid mondatok.",
        "Kerüld ezeket: „innovatív megoldások”, „ügyfélközpontú szemlélet”, „több éves tapasztalat” konkrétum nélkül, „minőség és megbízhatóság”.",
        "Minden szekciócím állítás legyen, ne kategórianév („Gyors, korrekt villanyszerelés Veszprémben” jobb, mint „Szolgáltatások”).",
        "Hosszúság: hero 1 cím + 1–2 mondat; szekciónként 40–120 szó; szolgáltatáskártya 2 mondat.",
        `A gombfeliratok konkrétak legyenek („${primaryAction || "Kérek ajánlatot"}”), ne „Tovább” vagy „Kattints ide”.`,
        full && "A GYIK valódi vevői kérdésekre válaszoljon (ár, határidő, terület, garancia), ne marketingszövegre.",
        full && "Ahol a briefből hiányzik a tény (pl. pontos ár), írj olyan mondatot, ami konkrétum nélkül is hiteles, és jelöld a végén a feltételezés-listában."
      ])
    );
  }

  if (on("assets")) {
    push(
      "8. Anyagok, elérhetőségek, linkek",
      [
        fieldLines([
          ["Logó", project.logoUrl ? (options.includeAssetUrls ? project.logoUrl : "van feltöltve (URL kihagyva)") : "nincs — készíts letisztult szöveges (wordmark) logót a márkanévből"],
          ["Nyilvános e-mail", publicEmail],
          ["Nyilvános telefon", publicPhone],
          ["Kapcsolattartó", options.includeContact ? [project.contactName, project.contactEmail].filter(Boolean).join(" · ") : ""]
        ]),
        socials ? `\n**Közösségi profilok:**\n${socials}` : "",
        photoUrls.length ? `\n**Az ügyfél által feltöltött képek (${photoUrls.length} db):**\n${photoUrls.map((url) => `- ${url}`).join("\n")}` : "",
        contentUrls.length ? `\n**Az ügyfél által feltöltött szöveges anyagok (${contentUrls.length} db):**\n${contentUrls.map((url) => `- ${url}`).join("\n")}` : "",
        !photoUrls.length ? "\n**Képek:** nincs saját fotó megadva. Használj semleges helyettesítőket (egyszínű blokk vagy CSS-mintázat) a helyes képaránnyal, és jelöld meg a helyüket — ne linkelj be külső fotóbankos képet." : ""
      ].join("\n")
    );
  }

  if (on("seo")) {
    push(
      "9. SEO és metaadatok",
      bullets([
        `Oldalanként egyedi title (max 60 karakter) és description (max 155 karakter), a fő kulcsszóval és${domain ? ` a domainnel (${domain})` : " a településsel"}.`,
        "Pontosan egy `<h1>` oldalanként, alatta logikus h2/h3 hierarchia.",
        "Canonical link, `lang=\"hu\"`, Open Graph és Twitter kártyák kép nélkül is működjenek.",
        "`sitemap.xml` és `robots.txt` minden nyilvános oldallal.",
        full && "Strukturált adat: `LocalBusiness` (név, cím, telefon, nyitvatartás) és `FAQPage`, ha van GYIK.",
        full && "Beszédes, ékezet nélküli URL-ek (pl. `/szolgaltatasok/villanyszerelés` helyett `/szolgaltatasok/villanyszereles`)."
      ])
    );
  }

  if (on("quality")) {
    push(
      "10. Sebesség és akadálymentesség",
      bullets([
        "Lighthouse mobil: teljesítmény ≥ 90, akadálymentesség ≥ 95, SEO ≥ 95.",
        "A hero kép kivételével minden kép `loading=\"lazy\"`, megadott mérettel (ne ugráljon a layout).",
        "Szövegkontraszt legalább 4.5:1; a kiemelő színt ne használd vékony szövegre világos háttéren.",
        "Minden képnek értelmes `alt`, minden űrlapmezőnek látható címke (nem csak placeholder).",
        full && "Az oldal legyen teljesen használható billentyűzettel: logikus tab-sorrend, „ugrás a tartalomra” link.",
        full && "Ne töltsön be külső szkriptet vagy betűtípust harmadik fél szerveréről a mérőkódon kívül."
      ])
    );
  }

  if (on("legal")) {
    push(
      "11. Kötelező jogi elemek (magyar szabályozás)",
      [
        bullets([
          "Impresszum oldal: szolgáltató neve, székhelye, adószáma, nyilvántartási száma, e-mail címe, tárhelyszolgáltató adatai.",
          "Adatkezelési tájékoztató: milyen adatot gyűjt az űrlap, milyen célból, meddig őrzi, kihez lehet fordulni. Az űrlapnál kötelező checkbox a tájékoztató elfogadására, előre bepipálás nélkül.",
          "Süti-tájékoztató: ha van bármilyen mérés, előzetes hozzájárulás kell, elutasítási lehetőséggel; a mérőkód csak hozzájárulás után töltődhet be.",
          "A lábléc minden oldalon linkeljen az impresszumra és az adatkezelési tájékoztatóra."
        ]),
        project.commercialModel === "subscription"
          ? `\n**Az üzemeltető adatai a menedzselt konstrukcióban** (ezek kerülnek a tárhely/üzemeltető rovatba): ${PROVIDER.legalName}, ${PROVIDER.address}, adószám: ${PROVIDER.taxNumber}, e-mail: ${PROVIDER.email}.`
          : "\nA szolgáltatói adatokat az ügyfél adja meg; ahol még hiányzik, hagyj jól láthatóan megjelölt kitöltendő helyet, és sorold fel a hiányzó adatokat a végén."
      ].join("\n")
    );
  }

  if (on("integrations")) {
    push(
      "12. Integrációk",
      bullets([
        publicEmail
          ? `Az űrlap beküldése e-mailben érkezzen a(z) ${publicEmail} címre; a küldést szerveroldali végpont végezze, hogy a kulcs ne kerüljön a böngészőbe.`
          : "Az űrlap beküldését szerveroldali végpont dolgozza fel; az e-mail címzettjét környezeti változóból olvasd.",
        "Semmilyen API kulcs, jelszó vagy titok ne kerüljön a forráskódba — környezeti változó, és `.env.example` a nevekkel.",
        "Mérés (ha kell): egyetlen mérőkód, hozzájáruláshoz kötve, konverziós esemény az űrlap sikeres beküldésekor.",
        publicPhone && `A telefonszám (${publicPhone}) mindenhol \`tel:\` linkként legyen kattintható.`,
        full && "Térkép beágyazása csak hozzájárulás után töltődjön be (előtte statikus helyettesítő)."
      ])
    );
  }

  if (on("acceptance")) {
    push(
      "13. Átadási ellenőrzőlista — ezt fusd végig a válaszod végén",
      bullets([
        "Minden felsorolt oldal elkészült, valódi szöveggel, helykitöltő nélkül.",
        "Az elsődleges konverziós művelet minden oldalról elérhető.",
        "Mobil (390px), tablet (768px) és desktop (1440px) nézetben sem törik a layout, nincs vízszintes görgetés.",
        "Az űrlap validál, hibát jelez, sikeres állapotot mutat.",
        "Jogi oldalak és a lábléc linkek megvannak.",
        "Nincs konzolhiba és nincs törött link.",
        "A végén sorold fel: (a) mit feltételeztél, (b) milyen adat hiányzik az ügyféltől, (c) mit javasolsz következő lépésnek."
      ])
    );
  }

  const adminNote = text(project.adminNotes);
  if (adminNote || options.extraInstructions.trim()) {
    push(
      "14. Kiegészítő utasítások",
      [options.extraInstructions.trim(), adminNote ? `Belső jegyzet a projekthez: ${adminNote}` : ""].filter(Boolean).join("\n\n")
    );
  }

  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Nagyságrendi tokenbecslés — magyar szövegnél ~3 karakter/token. */
export function estimatePromptTokens(prompt: string) {
  return Math.round(prompt.length / 3);
}

/** Fájlnév az exportált prompthoz. */
export function promptFileName(project: { company: string | null; title: string }) {
  const base = (project.company || project.title || "projekt")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "projekt"}-ai-brief.md`;
}
