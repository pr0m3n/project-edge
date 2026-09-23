/**
 * A munkák EGYETLEN forrása.
 *
 * Korábban ugyanez a lista három helyen élt külön-külön (`WorkDeck` a
 * főoldalon, `LiveWorkBand` és `DemoPicker` a `/munkak` oldalon), és a két
 * utóbbi ketté is vágta őket „élesben futó" és „mintaprojekt" csoportra. Ez a
 * bontás önmaga ellen dolgozott: a látogató megszámolta, hogy csak kettő fut
 * élesben, és abból arra következtetett, hogy nincs több ügyfél.
 *
 * Itt egy lista van, rangsor nélkül. A különbséget nem címke hordozza, hanem
 * maga a link: egy futó oldal a saját domainjére visz, egy bemutató a
 * `/demo/...` útvonalra. Ez igaz marad anélkül, hogy a lap rangsorolná őket.
 *
 * ÚJ MUNKA FELVÉTELE = EGY ELEM EBBEN A TÖMBBEN. A hero csíkja, a rács és a
 * főoldali pakli mind innen olvas, a CSS pedig elemszám-független — nincs
 * beégetett darabszám sehol, és nincs mit átírni utána.
 *
 * A sorrend számít: ez a megjelenés sorrendje mindhárom felületen.
 */

export type Work = {
  id: string;
  name: string;
  /** A kártya fő üzenete: milyen üzleti célt old meg. Ezt olvassa el először. */
  goal: string;
  /** Szakma és hely, ha van értelme. */
  industry: string;
  copy: string;
  /** Külső domain vagy belső `/demo/...` útvonal. */
  href: string;
  /** Külső oldal esetén a link új ablakban nyílik, és a domain a linkfelirat. */
  external: boolean;
  src: string;
  width: number;
  height: number;
  /**
   * Rövid vélemény a kártya aljára. CSAK valódi, az adott ügyféltől kapott
   * mondat kerülhet ide, a nevével és hozzájárulásával — kitalált vélemény
   * nem (fogyasztóvédelmi tilalom, és lebukáskor az összes referenciát viszi).
   */
  quote?: { text: string; name: string; role?: string };
  /**
   * Ugyanabban a címkében egy ellenőrizhető tény, ha nincs ügyfélvélemény.
   * Idézőjel és személynév nélkül jelenik meg, hogy ne lehessen véleménynek nézni.
   */
  fact?: { text: string; caption: string };
};

export const WORKS: Work[] = [
  {
    id: "leadscope",
    name: "LeadScope.hu",
    goal: "B2B lead generálás",
    industry: "Értékesítés · SaaS",
    copy:
      "Célzott cégkutatás, személyre szabott megkeresések és mérhető kampányok egyetlen, letisztult rendszerben — több releváns beszélgetésért.",
    href: "https://leadscope.hu",
    external: true,
    src: "/work/refs/leadscope-cover.webp",
    width: 1600,
    height: 908,
    fact: {
      text: "Előfizetéses termék: AI-cégkeresés, e-mail-ellenőrzés és automatikus kiküldés.",
      caption: "Élesben · leadscope.hu"
    }
  },
  {
    id: "checky",
    name: "Checky.hu",
    goal: "Full-stack rendszer",
    industry: "Napi használatban",
    copy:
      "Nem látványterv, hanem naponta használt rendszer. Felület, adatkezelés és háttérfolyamatok — mind egy kézben épült, a tervezéstől az éles indulásig.",
    href: "https://checky.hu",
    external: true,
    src: "/work/refs/checky.webp",
    width: 1440,
    height: 814,
    fact: {
      text: "Kétoldalú piactér: chat, foglalás és átvizsgálási jelentés egy rendszerben.",
      caption: "Élesben · checky.hu"
    }
  },
  {
    id: "autoaesthetik",
    name: "Auto Aesthetik",
    goal: "Telefonhívás a keresőből",
    industry: "Autóápolás · Sopron",
    copy:
      "Kézi autómosó a Sopron Pláza mélygarázsában. Kétnyelvű oldal, végig kéznél lévő telefonszámmal — egyetlen dolgot csinál: hívássá alakítja a keresőből érkezőt.",
    href: "https://autoaesthetik.hu",
    external: true,
    src: "/work/refs/autoaesthetik.webp",
    width: 1440,
    height: 900,
    quote: { text: "Nagyon gyors szolgáltatás, szép eredmény.", name: "Ferenc", role: "tulajdonos" }
  },
  {
    id: "zamat",
    name: "Zamat",
    goal: "Webshop kosárral",
    industry: "Kereskedelem",
    copy:
      "Nagy, forgó 3D zacskó, ami egy pördüléssel átöltözik a választott kávéra — webshop működő kosárral és termékoldalakkal.",
    href: "/demo/zamat",
    external: false,
    src: "/work/demos/zamat-zacsko.webp",
    width: 1440,
    height: 900
  },
  {
    id: "liget",
    name: "Liget Bőrstúdió",
    goal: "Időpontfoglalás",
    industry: "Szépségipar",
    copy:
      "Görgetésre szétnyíló 3D bőrmetszet, ami megmutatja, melyik kezelés meddig hat — és onnan egy kattintással foglalás.",
    href: "/demo/liget-borstudio",
    external: false,
    src: "/work/demos/liget-borretegek.webp",
    width: 1440,
    height: 900
  },
  {
    id: "budai",
    name: "Budai Otthonok",
    goal: "Ingatlankereső",
    industry: "Ingatlan",
    copy:
      "Görgetésre szétnyíló 3D makett, forgatható alaprajz és napfény-számítás minden hirdetéshez.",
    href: "/demo/budai-otthonok",
    external: false,
    src: "/work/demos/budai-otthonok-makett.webp",
    width: 1440,
    height: 900
  },
  {
    id: "veyra",
    name: "Veyra",
    goal: "SaaS és dashboard",
    industry: "Szoftver",
    copy:
      "Egy szalon hete 3D-ben: görgetésre beesnek a foglalások, a lemondott időpontot a várólista tölti be — SaaS landing, ami megmutatja a terméket.",
    href: "/demo/veyra",
    external: false,
    src: "/work/demos/veyra-het.webp",
    width: 1440,
    height: 900
  }
];
