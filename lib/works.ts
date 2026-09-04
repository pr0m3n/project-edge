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
};

export const WORKS: Work[] = [
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
    height: 900
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
    height: 814
  },
  {
    id: "zamat",
    name: "Zamat",
    goal: "Webshop kosárral",
    industry: "Kereskedelem",
    copy:
      "Termékvariánsok, kosár, termékoldalak és megőrzött állapot — a teljes vásárlási út végigjátszható.",
    href: "/demo/zamat",
    external: false,
    src: "/work/demos/zamat.webp",
    width: 1440,
    height: 900
  },
  {
    id: "liget",
    name: "Liget Bőrstúdió",
    goal: "Időpontfoglalás",
    industry: "Szépségipar",
    copy:
      "Prémium márka és teljes, több lépéses foglalási folyamat: szolgáltatás, időpont, adatok, visszaigazolás.",
    href: "/demo/liget-borstudio",
    external: false,
    src: "/work/demos/liget-borstudio.webp",
    width: 1440,
    height: 900
  },
  {
    id: "varga",
    name: "Varga Villany",
    goal: "Helyi érdeklődőszerzés",
    industry: "Szakipar",
    copy:
      "Árkalkulátor, körzetellenőrzés és gyors ajánlatkérés — annak, aki holnapra keres szakembert.",
    href: "/demo/varga-villany",
    external: false,
    src: "/work/demos/varga-villany.webp",
    width: 1440,
    height: 900
  },
  {
    id: "budai",
    name: "Budai Otthonok",
    goal: "Ingatlankereső",
    industry: "Ingatlan",
    copy:
      "Szűrés, mentés, részletes adatlap, hitelbecslés és érdeklődés — katalógus, amiben tényleg lehet keresni.",
    href: "/demo/budai-otthonok",
    external: false,
    src: "/work/demos/budai-otthonok.webp",
    width: 1440,
    height: 900
  },
  {
    id: "veyra",
    name: "Veyra",
    goal: "SaaS és dashboard",
    industry: "Szoftver",
    copy:
      "Termékbemutatás, dashboard felület, interaktív árazás és mozgás — szoftvertermék teljes bemutató oldala.",
    href: "/demo/veyra",
    external: false,
    src: "/work/demos/veyra.webp",
    width: 1440,
    height: 900
  }
];
