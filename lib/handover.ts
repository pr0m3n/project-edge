/**
 * Vezetett átadás — a Vercel / Supabase / Resend / GitHub / DNS átadás lépései.
 *
 * Miért van külön fájlban: ugyanezt a definíciót használja az ügyfélkapu és az
 * admin felület is, és így a lépések SZÖVEGE a kódban él, nem az adatbázisban.
 * A `client_projects.handover_steps` jsonb csak az állapotot tárolja
 * (id / owner / done / done_at / value), tehát egy szövegjavításhoz nem kell
 * hozzányúlni a meglévő projektekhez.
 *
 * A cél: az átadás ne telefonon és üzenetben történjen. Minden lépésnek pontosan
 * egy felelőse van, sorrendben jön, és ha adat kell hozzá (pl. a Vercel csapat
 * neve vagy a beállítandó DNS rekordok), azt a lépés `input` mezője gyűjti be —
 * így a másik fél ott látja, ahol dolgozik.
 *
 * Biztonság: SOHA nem kérünk jelszót, bankkártyaadatot vagy API kulcsot ezen a
 * felületen. Ahol titok kell (pl. Resend API kulcs), ott az ügyfél a SAJÁT
 * fiókjában hozza létre, és a SAJÁT Vercel projektjébe illeszti be — nálunk nem
 * halad át.
 */

export type HandoverService = "vercel" | "supabase" | "resend" | "github" | "dns" | "domain";
export type HandoverOwner = "client" | "admin";

export type HandoverStepState = {
  id: string;
  owner: HandoverOwner;
  done: boolean;
  done_at?: string | null;
  value?: string | null;
};

export type HandoverStepDef = {
  id: string;
  service: HandoverService;
  owner: HandoverOwner;
  title: string;
  detail: string;
  /** Mit fog látni a felületen — a nem technikai ügyfélnek ez a legfontosabb. */
  where?: string;
  links?: Array<{ label: string; url: string }>;
  guide?: { label: string; href: string };
  input?: {
    label: string;
    placeholder: string;
    multiline?: boolean;
    /** A beírt érték a másik felet segíti (pl. admin adja meg a DNS rekordokat). */
    sharedWith?: HandoverOwner;
  };
  warning?: string;
};

export const HANDOVER_SERVICE_LABELS: Record<HandoverService, string> = {
  vercel: "Vercel (a weboldal futtatása)",
  supabase: "Supabase (adatbázis és belépés)",
  resend: "Resend (email küldés)",
  github: "GitHub (a forráskód)",
  dns: "Domain és DNS",
  domain: "Domain átírása a nevedre"
};

export const HANDOVER_STEP_DEFS: HandoverStepDef[] = [
  // ── Vercel ────────────────────────────────────────────────────────────────
  {
    id: "vercel_account",
    service: "vercel",
    owner: "client",
    title: "Hozz létre egy saját Vercel fiókot",
    detail:
      "A Vercel futtatja a weboldaladat. Regisztrálj a saját (vagy céges) email címeddel, majd hozz létre egy csapatot (Team) a cég nevével. Ez lesz a weboldal végleges otthona.",
    where:
      "Regisztráció után a bal felső sarokban látod a fiókválasztót. Ott a „Create Team” gombbal tudsz céges csapatot létrehozni.",
    links: [
      { label: "Vercel regisztráció", url: "https://vercel.com/signup" },
      { label: "Vercel irányítópult", url: "https://vercel.com/dashboard" }
    ],
    guide: { label: "Vercel átadási útmutató (PDF)", href: "/guides/projectedge-vercel-atadas.pdf" },
    input: {
      label: "A létrehozott Vercel csapat neve",
      placeholder: "pl. vallalkozasod",
      sharedWith: "admin"
    }
  },
  {
    id: "vercel_invite",
    service: "vercel",
    owner: "client",
    title: "Hívj meg minket a csapatodba",
    detail:
      "Ahhoz, hogy át tudjuk adni a projektet, tagnak kell lennünk a csapatodban. A meghívást a csapat beállításai között, a „Members” résznél tudod elküldeni erre az email címre: info@projectedge.hu.",
    where: "Team → Settings → Members → Invite. Válaszd a „Member” szerepkört, „Owner” nem kell.",
    links: [{ label: "Vercel irányítópult", url: "https://vercel.com/dashboard" }],
    warning: "A jelszavadat soha ne oszd meg. A meghívás pont azért van, hogy ne kelljen."
  },
  {
    id: "vercel_transfer",
    service: "vercel",
    owner: "admin",
    title: "Projekt átadása a te csapatodba",
    detail:
      "Ezt mi végezzük. A projektet a csapatodba helyezzük, majd ellenőrizzük a domaint, a deploymentet, a környezeti változókat és a buildet. Az átadás jellemzően kiesés nélkül történik, de a célcsapatnak érvényes fizetési mód kellhet.",
    links: [
      { label: "Mit visz át a Vercel átadás?", url: "https://vercel.com/docs/projects/transferring-projects" }
    ],
    input: {
      label: "Átadási megjegyzés az ügyfélnek",
      placeholder: "pl. A projekt átadva. A Vercel-integrációkat és a vercel.json env/build.env változókat ellenőriztem vagy újrakötöttem; új deployment kész.",
      multiline: true,
      sharedWith: "client"
    }
  },
  {
    id: "vercel_confirm",
    service: "vercel",
    owner: "client",
    title: "Ellenőrizd: nálad van a projekt",
    detail:
      "Nyisd meg a Vercel irányítópultot a saját csapatoddal, és nézd meg, hogy a projekt ott van-e. Kattints a „Visit” gombra: az oldalnak be kell töltődnie.",
    where: "Ha látod a projektet és az oldal betölt, itt jelöld késznek.",
    links: [{ label: "Vercel irányítópult", url: "https://vercel.com/dashboard" }]
  },

  // ── Supabase ──────────────────────────────────────────────────────────────
  {
    id: "supabase_org",
    service: "supabase",
    owner: "client",
    title: "Hozz létre egy saját Supabase szervezetet",
    detail:
      "A Supabase tárolja az adatbázist és a belépéseket. Regisztrálj, majd hozz létre egy szervezetet (Organization) a cég nevével. Ide kerül majd a projekt adatbázisa.",
    where: "A Supabase irányítópult tetején van a szervezetválasztó, ott a „New organization” lehetőséggel.",
    links: [
      { label: "Supabase irányítópult", url: "https://supabase.com/dashboard" },
      { label: "Supabase dokumentáció", url: "https://supabase.com/docs" }
    ],
    guide: { label: "Supabase átadási útmutató (PDF)", href: "/guides/projectedge-supabase-atadas.pdf" },
    input: {
      label: "A létrehozott Supabase szervezet neve",
      placeholder: "pl. vallalkozasod",
      sharedWith: "admin"
    },
    warning:
      "Fontos: az ingyenes csomagban a ritkán használt adatbázis egy idő után felfüggesztésre kerül, és ilyenkor a weboldal adatot kezelő része leáll. Ha a projekted adatbázist használ, éles működéshez fizetős csomag kell — az árakat és a döntést az átadás előtt átbeszéljük."
  },
  {
    id: "supabase_invite",
    service: "supabase",
    owner: "client",
    title: "Hívj meg minket a szervezetedbe",
    detail:
      "A projekt átadásához tagnak kell lennünk a szervezetedben. Küldj meghívást az info@projectedge.hu címre a szervezet csapat-beállításai között.",
    where: "Organization → Team → Invite member.",
    links: [{ label: "Supabase irányítópult", url: "https://supabase.com/dashboard" }],
    warning: "Adatbázis jelszót és service role kulcsot ne küldj el nekünk — nincs rá szükség."
  },
  {
    id: "supabase_transfer",
    service: "supabase",
    owner: "admin",
    title: "Adatbázis átadása és kulcsok cserélése",
    detail:
      "Ezt mi végezzük: átadjuk a projektet a szervezetedbe, majd ellenőrizzük a belépést, az RLS-jogosultságokat és a feltöltéseket. A Supabase átadás feltétele, hogy te legyél a forrás szervezet tulajdonosa, tagja legyél a cél szervezetnek, és ne legyen aktív GitHub-integráció, projekt-szintű szerepkör vagy log drain. A cél szervezet csomagja és számlázása ezután a te felelősséged.",
    links: [{ label: "Supabase projektátadás", url: "https://supabase.com/docs/guides/platform/project-transfer" }],
    input: {
      label: "Átadási megjegyzés az ügyfélnek",
      placeholder: "pl. Átadva, kulcsok rotálva, RLS és Storage tesztelve.",
      multiline: true,
      sharedWith: "client"
    }
  },
  {
    id: "supabase_confirm",
    service: "supabase",
    owner: "client",
    title: "Ellenőrizd: működik a belépés",
    detail:
      "Nyisd meg az éles weboldalt, és próbálj belépni (vagy küldj el egy űrlapot). Ha működik, itt jelöld késznek.",
    links: [{ label: "Supabase irányítópult", url: "https://supabase.com/dashboard" }]
  },

  // ── Resend ────────────────────────────────────────────────────────────────
  {
    id: "resend_account",
    service: "resend",
    owner: "client",
    title: "Hozz létre egy saját Resend fiókot",
    detail:
      "A Resend küldi a weboldal leveleit (értesítések, űrlap-visszaigazolások). Regisztrálj a saját email címeddel, majd a „Domains” résznél add hozzá a domainedet.",
    where: "Resend → Domains → Add Domain, ide a saját domained kerül (pl. vallalkozasod.hu).",
    links: [
      { label: "Resend regisztráció", url: "https://resend.com/signup" },
      { label: "Resend dokumentáció", url: "https://resend.com/docs" }
    ],
    guide: { label: "Resend email útmutató (PDF)", href: "/guides/projectedge-resend-email.pdf" },
    input: {
      label: "A Resend fiókhoz használt email cím",
      placeholder: "pl. hello@vallalkozasod.hu",
      sharedWith: "admin"
    }
  },
  {
    id: "resend_dns",
    service: "resend",
    owner: "client",
    title: "Állítsd be a levelezés DNS rekordjait",
    detail:
      "A Resend megmutatja a szükséges DNS rekordokat (SPF és DKIM). Ezeket a domain szolgáltatódnál — Rackhost esetén a DNS zónák alatt — kell felvenni. Ha kész, a Resend „Verify” gombjával ellenőrizd: zöld, ellenőrzött állapot kell. Tranzakciós levelekhez külön email-alias vagy subdomain ajánlott, hogy a küldési hírnév elkülönüljön.",
    where: "Rackhost → Domain → DNS zónák → új rekord. A Resend oldalán minden rekord mellett van egy másoló ikon.",
    links: [{ label: "Resend dokumentáció", url: "https://resend.com/docs" }],
    warning:
      "Ha bármelyik rekord elírásra kerül, a levelek a spam mappába kerülnek vagy egyáltalán nem mennek ki. Bizonytalanság esetén jelöld itt, hogy elakadtál, és képernyőmegosztással végigmegyünk rajta."
  },
  {
    id: "resend_key",
    service: "resend",
    owner: "client",
    title: "Készíts API kulcsot — és csak a saját Vercel projektedbe illeszd be",
    detail:
      "A Resend „API Keys” résznél készíts egy új kulcsot. Ezt NE küldd el nekünk és ne írd be ide: a saját Vercel projektedben, a Settings → Environment Variables alatt hozz létre egy RESEND_API_KEY nevű változót, és oda illeszd be. Így a kulcs csak nálad van meg.",
    where: "Vercel → a projekted → Settings → Environment Variables → Add New. Név: RESEND_API_KEY.",
    links: [
      { label: "Vercel irányítópult", url: "https://vercel.com/dashboard" },
      { label: "Resend dokumentáció", url: "https://resend.com/docs" }
    ],
    warning: "A kulcsot ebbe a mezőbe soha ne írd be. Ide csak annyit jelölj, hogy megtörtént."
  },
  {
    id: "resend_test",
    service: "resend",
    owner: "admin",
    title: "Levélküldés végigtesztelése",
    detail:
      "Ezt mi végezzük: az új kulccsal újraindítjuk a telepítést, és kipróbáljuk az éles levélküldést (értesítés és űrlap). Megnézzük a spam-besorolást is.",
    input: {
      label: "Teszt eredménye az ügyfélnek",
      placeholder: "pl. Teszt levél megérkezett, SPF/DKIM rendben.",
      multiline: true,
      sharedWith: "client"
    }
  },

  // ── Domain / DNS ──────────────────────────────────────────────────────────
  {
    id: "dns_records",
    service: "dns",
    owner: "admin",
    title: "A beállítandó DNS rekordok megadása",
    detail:
      "Ezt mi végezzük: kiírjuk pontosan, milyen rekordokat kell felvenned a domainednél, hogy az éles cím a weboldalra mutasson. A rekordokat itt fogod látni, nem emailben.",
    input: {
      label: "A beállítandó rekordok (az ügyfél ezt fogja látni)",
      placeholder: "A  @  216.150.1.1\nCNAME  www  cname.vercel-dns.com",
      multiline: true,
      sharedWith: "client"
    }
  },
  {
    id: "dns_applied",
    service: "dns",
    owner: "client",
    title: "Vedd fel a rekordokat a domainednél",
    detail:
      "Írd be a fenti lépésben megadott rekordokat a domain szolgáltatódnál. Rackhost esetén: Domain → DNS zónák → rekord hozzáadása. Csak azt vedd fel, ami itt szerepel — a többi rekordhoz ne nyúlj. A DNS változás pár perc és pár óra között bárhol átfordulhat.",
    where: "Ha felvetted őket, itt jelöld készre — mi ellenőrizzük, hogy megérkezett-e.",
    warning:
      "Az MX rekordokat hagyd békén: azok a levelezésedet irányítják. Ha egy meglévő rekordot törölni kellene, azt előbb jelezzük — magadtól ne töröld. Ha nem boldogulsz a felülettel, jelezd, és képernyőmegosztással együtt vesszük fel őket (a jelszavad ilyenkor is nálad marad).",
    links: [
      { label: "Rackhost domain kezelés", url: "https://rackhost.hu/domain" },
      {
        label: "Rackhost: DNS rekordok beállítása",
        url: "https://rackhost.hu/tudasbazis/domain/hogyan-allithatom-be-a-domainhez-tartozo-rekordokat/"
      }
    ],
    guide: { label: "Domainvásárlási útmutató (PDF)", href: "/guides/projectedge-domainvasarlas-rackhost.pdf" }
  },

  // ── Domain átírása (CSAK bérlésből kivásárlásnál) ─────────────────────────
  //
  // Ez a blokk a `dns` szolgáltatás párja, nem a kiegészítője. A `dns` lépések
  // azt feltételezik, hogy a domain MÁR az ügyfélé, és csak a rekordokat kell
  // beállítani — ez igaz egy egyszeri projektnél. Bérlésnél viszont a domain a
  // Szolgáltató regisztrátori fiókjában, az ő nevén van (ÁSZF 7. pont), tehát
  // előbb át kell írni. Ezért a kivásárlási terv a `domain` szolgáltatást kapja
  // a `dns` helyett — a kettőt soha ne tedd ugyanabba a tervbe.
  {
    id: "domain_account",
    service: "domain",
    owner: "client",
    title: "Hozz létre saját fiókot a domain szolgáltatónál",
    detail:
      "Eddig a domaint mi tartottuk fenn a saját fiókunkban, és a díját a havidíj tartalmazta. Ahhoz, hogy a tiéd legyen, kell egy saját fiók a regisztrátornál. Regisztrálj, majd add meg itt a fiókhoz tartozó email címet — erre fogjuk átírni a domaint.",
    where:
      "A regisztráció után nem kell semmit beállítanod: a domain még nálunk van, mi indítjuk az átírást a következő lépésben.",
    links: [{ label: "Rackhost regisztráció", url: "https://rackhost.hu" }],
    guide: { label: "Domain útmutató (PDF)", href: "/guides/projectedge-domainvasarlas-rackhost.pdf" },
    input: {
      label: "A domain fiókodhoz tartozó email cím",
      placeholder: "pl. iroda@vallalkozasod.hu",
      sharedWith: "admin"
    }
  },
  {
    id: "domain_transfer",
    service: "domain",
    owner: "admin",
    title: "A domain átírásának elindítása",
    detail:
      "Ezt mi indítjuk: kezdeményezzük a domain használói jogának átírását a megadott fiókodra. A .hu domaineknél ehhez a regisztrátor írásos nyilatkozatot kér mindkét féltől — a pontos teendőidet és a kitöltendő űrlapot itt írjuk le, nem emailben.",
    input: {
      label: "Az ügyfél teendői az átíráshoz (ő ezt fogja látni)",
      placeholder: "pl. A regisztrátor küld egy megerősítő emailt a megadott címre — kattints benne a jóváhagyásra. A domainhasználó-váltási nyilatkozatot aláírva küldd vissza.",
      multiline: true,
      sharedWith: "client"
    }
  },
  {
    id: "domain_confirm",
    service: "domain",
    owner: "client",
    title: "Ellenőrizd: a domain a te fiókodban van",
    detail:
      "Lépj be a saját domain fiókodba, és nézd meg, hogy a domain ott szerepel. Ha látod, jelöld itt készre.",
    where: "A regisztrátor felületén a Domainek (vagy Domain kezelés) menüpontban kell látnod a nevet.",
    warning:
      "Innentől a domain megújítási díja téged terhel, és a megújítás elmulasztása az oldal leállásához vezet. Írd fel a lejárati dátumot, vagy kapcsold be az automatikus megújítást a fiókodban.",
    input: {
      label: "A domain lejárati dátuma, ahogy a fiókodban látod",
      placeholder: "pl. 2027-03-14",
      sharedWith: "admin"
    }
  },

  // ── GitHub ────────────────────────────────────────────────────────────────
  {
    id: "github_account",
    service: "github",
    owner: "client",
    title: "Adj meg egy GitHub fiókot a forráskódhoz",
    detail:
      "A forráskód a GitHubon van. Ha szeretnéd, hogy a tiéd legyen (és később más fejlesztő is folytathassa), hozz létre egy GitHub fiókot, és add meg itt a felhasználóneved.",
    links: [{ label: "GitHub regisztráció", url: "https://github.com/signup" }],
    input: {
      label: "GitHub felhasználónév vagy szervezet",
      placeholder: "pl. vallalkozasod",
      sharedWith: "admin"
    }
  },
  {
    id: "github_transfer",
    service: "github",
    owner: "admin",
    title: "Forráskód átadása",
    detail:
      "Ezt mi végezzük: admin jogosultsággal átadjuk a repository-t a megadott fióknak vagy szervezetnek, majd ellenőrizzük, hogy a Vercel telepítés utána is működik. A GitHub átadási megerősítő emailje rövid ideig élhet, ezért azt azonnal fogadd el.",
    input: {
      label: "Átadási megjegyzés az ügyfélnek",
      placeholder: "pl. Repository átadva, Vercel újrakötve.",
      multiline: true,
      sharedWith: "client"
    }
  },

  // ── Zárás ─────────────────────────────────────────────────────────────────
  {
    id: "final_check",
    service: "vercel",
    owner: "admin",
    title: "Teljes végigtesztelés az éles címen",
    detail:
      "Ezt mi végezzük: éles domain, www átirányítás, HTTPS, űrlapok, belépés és a fő funkciók végigpróbálása, mobilon is.",
    input: {
      label: "Tesztelési összegzés az ügyfélnek",
      placeholder: "pl. Éles domain, HTTPS, űrlapok és belépés rendben, mobilon is.",
      multiline: true,
      sharedWith: "client"
    }
  },
  {
    id: "owners_documented",
    service: "vercel",
    owner: "client",
    title: "Erősítsd meg: minden hozzáférés nálad van",
    detail:
      "Utolsó lépés. Nézd át, hogy a domain, a Vercel csapat, az adatbázis, a levélküldés és a forráskód a te (vagy a céged) fiókjában van-e, és hogy a megújítási számlák hozzád futnak-e be. Ha igen, itt zárd le az átadást.",
    where: "Ezután tudod lezárni a projektet. A 30 napos díjmentes technikai garancia az utolsó igazolt átadási lépéstől számít."
  }
];

const DEF_BY_ID = new Map(HANDOVER_STEP_DEFS.map((def) => [def.id, def]));

/**
 * A `dns` és a `domain` egymás alternatívái, nem kiegészítői:
 * - `dns`: az ügyfél már birtokolja a domaint, csak rekordot kell felvennie
 *   (egyszeri projekt).
 * - `domain`: a domain nálunk van, a mi nevünkön, tehát át kell írni
 *   (bérlésből kivásárlás).
 * Ezért a kettőt együtt nem szabad bekapcsolni — lásd `reconcileHandoverPlan`.
 */
export const ALL_HANDOVER_SERVICES: HandoverService[] = ["vercel", "supabase", "resend", "github", "dns", "domain"];

/**
 * Alapértelmezett összetevők, ha az admin nem jelölte ki őket.
 *
 * Minden projekt Vercelen fut és minden projektnek van domainje, tehát ez a két
 * csoport mindig kell. A Supabase / Resend / GitHub viszont NEM: egy statikus
 * bemutatkozó oldalnál csak fölösleges lépés lenne az ügyfélnek, plusz havi
 * számla és plusz dolog, ami elromolhat. Ezért ezek kifejezett kijelölésre
 * kerülnek be, nem alapból.
 */
export const DEFAULT_HANDOVER_SERVICES: HandoverService[] = ["vercel", "dns"];

/**
 * A domain kétféle kezelése kizárja egymást.
 *
 * Ha mindkettő bekerülne a tervbe, az ügyfél egyszerre kapna „vedd fel a
 * rekordokat a domainednél" és „hozz létre fiókot, mert átírjuk rád" lépést —
 * a kettő ellentmond. Az átírás a szűkebb, erősebb eset, ezért az nyer.
 */
function resolveDomainServices(services: HandoverService[]): HandoverService[] {
  if (services.includes("domain") && services.includes("dns")) {
    return services.filter((service) => service !== "dns");
  }
  return services;
}

/** Az átadási terv összeállítása: csak azok a szolgáltatások kerülnek bele, amiket a projekt valóban használ. */
export function buildHandoverPlan(services: HandoverService[]): HandoverStepState[] {
  const active = new Set(resolveDomainServices(services));
  return HANDOVER_STEP_DEFS.filter((def) => active.has(def.service)).map((def) => ({
    id: def.id,
    owner: def.owner,
    done: false,
    done_at: null,
    value: null
  }));
}

/** Egy meglévő tervbe felvesz / kivesz szolgáltatásokat úgy, hogy a már kész lépések állapota megmarad. */
export function reconcileHandoverPlan(
  current: HandoverStepState[] | null,
  services: HandoverService[]
): HandoverStepState[] {
  const previous = new Map((current ?? []).map((step) => [step.id, step]));
  const active = new Set(resolveDomainServices(services));
  return HANDOVER_STEP_DEFS.filter((def) => active.has(def.service)).map((def) => {
    const existing = previous.get(def.id);
    return {
      id: def.id,
      owner: def.owner,
      done: existing?.done ?? false,
      done_at: existing?.done_at ?? null,
      value: existing?.value ?? null
    };
  });
}

export function handoverServicesOf(steps: HandoverStepState[] | null): HandoverService[] {
  const services = new Set<HandoverService>();
  for (const step of steps ?? []) {
    const def = DEF_BY_ID.get(step.id);
    if (def) services.add(def.service);
  }
  return ALL_HANDOVER_SERVICES.filter((service) => services.has(service));
}

export type ResolvedHandoverStep = { def: HandoverStepDef; state: HandoverStepState; index: number };

/** Az állapot és a definíciók összefűzése. Ismeretlen id-t (régi terv) kihagyunk. */
export function resolveHandoverSteps(steps: HandoverStepState[] | null): ResolvedHandoverStep[] {
  return (steps ?? [])
    .map((state, index) => {
      const def = DEF_BY_ID.get(state.id);
      return def ? { def, state, index } : null;
    })
    .filter((item): item is ResolvedHandoverStep => item !== null);
}

/** A soron következő lépés: az első, ami még nincs kész. A lépések szigorúan sorrendben mennek. */
export function activeHandoverStep(steps: HandoverStepState[] | null): ResolvedHandoverStep | null {
  return resolveHandoverSteps(steps).find((item) => !item.state.done) ?? null;
}

export function handoverProgress(steps: HandoverStepState[] | null) {
  const resolved = resolveHandoverSteps(steps);
  const done = resolved.filter((item) => item.state.done).length;
  return { done, total: resolved.length, percent: resolved.length ? Math.round((done / resolved.length) * 100) : 0 };
}

export function isHandoverComplete(steps: HandoverStepState[] | null) {
  const resolved = resolveHandoverSteps(steps);
  return resolved.length > 0 && resolved.every((item) => item.state.done);
}

/** Kinél van a labda az átadásban — ezt mutatja a „Rajtad a sor” sáv is. */
export function handoverTurn(steps: HandoverStepState[] | null): HandoverOwner | null {
  return activeHandoverStep(steps)?.def.owner ?? null;
}

/**
 * Egy lépés befejezése. Csak a soron következő lépés zárható, és csak a
 * felelőse zárhatja — így nem lehet átugrani a sorrendet a felületről.
 */
export function completeHandoverStep(
  steps: HandoverStepState[] | null,
  stepId: string,
  actor: HandoverOwner,
  value?: string | null
): { steps: HandoverStepState[]; error?: string } {
  const current = steps ?? [];
  const active = activeHandoverStep(current);

  if (!active) {
    return { steps: current, error: "Az átadás minden lépése kész." };
  }
  if (active.state.id !== stepId) {
    return { steps: current, error: "Előbb a korábbi lépést kell befejezni." };
  }
  if (active.def.owner !== actor) {
    return { steps: current, error: "Ez a lépés a másik felet várja." };
  }

  const next = current.map((step) =>
    step.id === stepId
      ? { ...step, done: true, done_at: new Date().toISOString(), value: value?.trim() ? value.trim() : step.value ?? null }
      : step
  );
  return { steps: next };
}

/** Adat rögzítése lépéshez a lezárás nélkül (pl. az admin előre beírja a DNS rekordokat). */
export function setHandoverStepValue(
  steps: HandoverStepState[] | null,
  stepId: string,
  value: string
): HandoverStepState[] {
  return (steps ?? []).map((step) => (step.id === stepId ? { ...step, value } : step));
}

/** A lépéshez tartozó, a másik fél által megadott érték (pl. az admin DNS rekordjai). */
export function sharedValueFor(step: ResolvedHandoverStep): string | null {
  return step.def.input?.sharedWith ? step.state.value ?? null : null;
}
