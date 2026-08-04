export type Product = {
  slug: string;
  name: string;
  origin: string;
  roast: "Világos" | "Közepes" | "Sötét";
  process: string;
  altitude: string;
  notes: string[];
  price: number;
  oldPrice?: number;
  badge?: string;
  rating: number;
  reviews: number;
  short: string;
  long: string;
  brew: string[];
  /* az ajándékcsomagnál nincs értelme kiszerelést és őrlést választani */
  variants?: boolean;
  palette: { body: string; fold: string; label: string; accent: string };
};

export const FREE_SHIPPING_LIMIT = 15000;

export const grinds = [
  { id: "szemes", label: "Szemes" },
  { id: "filter", label: "Filter őrlés" },
  { id: "espresso", label: "Espresso őrlés" },
  { id: "french", label: "French press" }
];

export const sizes = [
  { id: "250", label: "250 g", multiplier: 1 },
  { id: "500", label: "500 g", multiplier: 1.85 },
  { id: "1000", label: "1 kg", multiplier: 3.4 }
];

export const products: Product[] = [
  {
    slug: "etiopia-guji",
    name: "Etiópia Guji",
    origin: "Etiópia · Guji, Hambela",
    roast: "Világos",
    process: "Mosott",
    altitude: "1 950–2 150 m",
    notes: ["bergamott", "őszibarack", "jázmin"],
    price: 5490,
    badge: "Új tétel",
    rating: 4.9,
    reviews: 84,
    short: "Virágos, teás filterkávé — a legtisztább etióp profil, amit idén találtunk.",
    long: "Ez a tétel a Guji régió magasan fekvő teraszairól érkezik, ahol a lassú érés miatt a szemek sűrűbbek és aromásabbak. Kézzel szedett, mosott feldolgozású kávé, amit kifejezetten világosra pörkölünk, hogy a bergamottos-jázminos jelleg ne égjen ki belőle.",
    brew: ["V60", "Aeropress", "Chemex"],
    palette: { body: "#c8543a", fold: "#a33f2b", label: "#f7efe3", accent: "#8f2f1f" }
  },
  {
    slug: "kolumbia-huila",
    name: "Kolumbia Huila",
    origin: "Kolumbia · Huila, Pitalito",
    roast: "Közepes",
    process: "Mosott",
    altitude: "1 700–1 900 m",
    notes: ["karamell", "piros alma", "mogyoró"],
    price: 4790,
    rating: 4.8,
    reviews: 132,
    short: "A mindennapi kedvenc: kerek, karamelles, tejjel is működik.",
    long: "Ha egyetlen kávét vinnél magaddal, valószínűleg ez lenne az. Kiegyensúlyozott savtartalom, vastag test és tiszta karamell-édesség. Filterben gyümölcsösebb, espressóban csokoládésabb arcát mutatja.",
    brew: ["Espresso", "V60", "Moka"],
    palette: { body: "#c9922f", fold: "#a5751f", label: "#fdf6e7", accent: "#8a6013" }
  },
  {
    slug: "brazil-cerrado",
    name: "Brazília Cerrado",
    origin: "Brazília · Minas Gerais",
    roast: "Sötét",
    process: "Natural",
    altitude: "1 100–1 250 m",
    notes: ["étcsokoládé", "dió", "melasz"],
    price: 4290,
    oldPrice: 4890,
    badge: "Espresso alap",
    rating: 4.7,
    reviews: 211,
    short: "Sűrű, csokoládés espresso alap, amiből gyönyörű crema lesz.",
    long: "A klasszikus olaszos élményhez tervezve, de modern pörköléssel: sötét, mégsem kesernyés. Tejes italokban átüt a diós-csokoládés karakter, magában sűrű és hosszan tartó.",
    brew: ["Espresso", "Moka", "French press"],
    palette: { body: "#4a3226", fold: "#33211a", label: "#efe3d2", accent: "#241611" }
  },
  {
    slug: "kenya-nyeri",
    name: "Kenya Nyeri AA",
    origin: "Kenya · Nyeri, Karatina",
    roast: "Világos",
    process: "Mosott",
    altitude: "1 800–2 000 m",
    notes: ["fekete ribizli", "grapefruit", "nádcukor"],
    price: 6290,
    badge: "Limitált",
    rating: 5,
    reviews: 47,
    short: "Robbanó gyümölcsösség azoknak, akik szeretik, ha egy kávé emlékezetes.",
    long: "A kenyai AA szemméret és a kettős fermentáció adja azt az intenzív fekete ribizlis savat, amiről ez a származási hely híres. Nem szelíd kávé — de ha egyszer eltaláltad a receptet, nehéz visszatérni bármi máshoz.",
    brew: ["V60", "Chemex", "Aeropress"],
    palette: { body: "#2f5d50", fold: "#1f463c", label: "#f0f5f0", accent: "#153229" }
  },
  {
    slug: "guatemala-antigua",
    name: "Guatemala Antigua",
    origin: "Guatemala · Antigua völgy",
    roast: "Közepes",
    process: "Mosott",
    altitude: "1 500–1 700 m",
    notes: ["tejcsokoládé", "narancshéj", "vaníliás keksz"],
    price: 5190,
    rating: 4.8,
    reviews: 96,
    short: "Vulkanikus talaj, kakaós mélység, finom narancsos csillanással.",
    long: "Az Antigua völgy vulkanikus talaja mineralitást és sűrű testet ad. Közepes pörköléssel a kakaós alap mellé narancshéjas frissesség kerül — az a fajta kávé, amit a vendégeid megjegyeznek.",
    brew: ["Espresso", "V60", "Moka"],
    palette: { body: "#7a4b8c", fold: "#5d3670", label: "#f6eefa", accent: "#452553" }
  },
  {
    slug: "zamat-kostolo",
    name: "Kóstoló csomag",
    origin: "4 × 100 g · válogatás",
    roast: "Közepes",
    process: "Vegyes",
    altitude: "—",
    notes: ["négy origó", "négy karakter"],
    price: 7990,
    badge: "Ajándéknak",
    rating: 4.9,
    reviews: 168,
    short: "Négy tétel egy dobozban — a legjobb belépő, ha még keresed a kedvenced.",
    long: "Négy különböző származási hely, egyenként 100 grammban, kóstolási jegyzettel és brew guide-dal. Ajándéknak is tökéletes: díszdobozban, saját üzenettel küldjük.",
    brew: ["Bármelyik"],
    variants: false,
    palette: { body: "#25406b", fold: "#182c4c", label: "#eef2f8", accent: "#101f38" }
  }
];

export function findProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function formatFt(value: number) {
  return `${Math.round(value).toLocaleString("hu-HU")} Ft`;
}
