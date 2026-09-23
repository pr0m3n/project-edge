import type { Plan } from "./plan";

export type Home = {
  id: number;
  code: string;
  district: string;
  type: string;
  title: string;
  price: number;
  size: number;
  rooms: number;
  image: string;
  address: string;
  floor: string;
  terrace: string;
  parking: string;
  energy: string;
  ceiling: string;
  built: string;
  updated: string;
  description: string;
  features: string[];
  nearby: [string, string][];
  plan: Plan;
};

export const homes: Home[] = [
  {
    id: 1,
    code: "BO-2417",
    district: "I. kerület",
    type: "Penthouse",
    title: "Dunára nyíló csend",
    price: 329,
    size: 148,
    rooms: 4,
    image: "/demo/budai-otthonok/hero.webp",
    address: "Várkert rakpart",
    floor: "5. emelet / liftes",
    terrace: "46 m² panorámás terasz",
    parking: "2 teremgarázs-hely",
    energy: "A+",
    ceiling: "3,1 m",
    built: "2021",
    updated: "2 napja",
    description:
      "A lakás teljes szélességében a Dunára fordul. A nappali és a konyha egyetlen, világos tér, a hálók egy csendesebb, külön szárnyban kaptak helyet. Egyedi asztalosbútorok, természetes kő és árnyékolt üvegfelületek.",
    features: ["Dunai panoráma", "Saját lift", "Mennyezethűtés", "Okosotthon", "Borhűtő", "Portaszolgálat"],
    nearby: [["Várkert Bazár", "3 perc"], ["Clark Ádám tér", "7 perc"], ["19-es, 41-es villamos", "2 perc"]],
    plan: {
      facing: 90,
      level: "5. emelet",
      blind: ["top"],
      rooms: [
        { name: "Nappali · étkező", kind: "living", withKitchen: true, x: 0, z: 0, w: 10, d: 8 },
        { name: "Háló", kind: "bed", x: 10, z: 0, w: 4.5, d: 4.5 },
        { name: "Háló", kind: "bed", x: 14.5, z: 0, w: 3.5, d: 4.5 },
        { name: "Fürdő", kind: "bath", x: 10, z: 4.5, w: 3, d: 3.5 },
        { name: "Dolgozó", kind: "study", x: 13, z: 4.5, w: 5, d: 3.5 },
        { name: "Terasz", kind: "terrace", x: 0, z: 8, w: 15.5, d: 3 }
      ]
    }
  },
  {
    id: 2,
    code: "BO-2398",
    district: "XII. kerület",
    type: "Villa",
    title: "Fenyők felett",
    price: 485,
    size: 236,
    rooms: 6,
    image: "/demo/budai-otthonok/villa.webp",
    address: "Mártonhegyi út",
    floor: "2 szint + pince",
    terrace: "82 m² kert és terasz",
    parking: "2 állásos garázs",
    energy: "A++",
    ceiling: "2,9 m",
    built: "2019",
    updated: "5 napja",
    description:
      "Önálló, kortárs villa védett, fás telken. A közösségi terek közvetlenül a kertre nyílnak, az emeleti hálókhoz saját erkély tartozik. Hőszivattyú, napelem és rejtett árnyékolás.",
    features: ["Önálló telek", "Panorámás kert", "Hőszivattyú", "Napelem", "Kandalló", "Szauna-előkészítés"],
    nearby: [["Normafa", "6 perc autóval"], ["Német iskola", "9 perc"], ["MOM Park", "11 perc autóval"]],
    plan: {
      facing: 180,
      level: "Földszint",
      blind: ["top"],
      rooms: [
        { name: "Nappali", kind: "living", x: 0, z: 0, w: 8, d: 7 },
        { name: "Konyha · étkező", kind: "kitchen", x: 8, z: 0, w: 6, d: 7 },
        { name: "Dolgozó", kind: "study", x: 14, z: 0, w: 4, d: 4 },
        { name: "Fürdő", kind: "bath", x: 14, z: 4, w: 4, d: 3 },
        { name: "Terasz és kert", kind: "garden", x: 0, z: 7, w: 18, d: 4.5 }
      ]
    }
  },
  {
    id: 3,
    code: "BO-2380",
    district: "V. kerület",
    type: "Polgári lakás",
    title: "Kortárs klasszikus",
    price: 219,
    size: 112,
    rooms: 3,
    image: "/demo/budai-otthonok/polgari.webp",
    address: "Sas utca",
    floor: "3. emelet / liftes",
    terrace: "Franciaerkély",
    parking: "Utcai parkolás",
    energy: "B",
    ceiling: "3,8 m",
    built: "1896 · felújítva 2024",
    updated: "tegnap",
    description:
      "Felújított, századfordulós lakás eredeti parkettával, kétszárnyú ajtókkal és 3,8 méteres belmagassággal. A gépészet teljesen új, miközben minden menthető építészeti részlet megmaradt.",
    features: ["3,8 m belmagasság", "Eredeti parketta", "Központi lokáció", "Klíma", "Prémium gépek", "Tehermentes"],
    nearby: [["Szent István-bazilika", "2 perc"], ["M1, M2, M3 Deák tér", "5 perc"], ["Szabadság tér", "4 perc"]],
    plan: {
      facing: 90,
      level: "3. emelet",
      blind: ["left", "right"],
      rooms: [
        { name: "Szalon", kind: "living", x: 0, z: 0, w: 6, d: 5.5 },
        { name: "Háló", kind: "bed", x: 6, z: 0, w: 4.5, d: 5.5 },
        { name: "Dolgozó", kind: "study", x: 10.5, z: 0, w: 4, d: 5.5 },
        { name: "Előszoba", kind: "hall", x: 0, z: 5.5, w: 7, d: 2 },
        { name: "Konyha", kind: "kitchen", x: 7, z: 5.5, w: 4, d: 3 },
        { name: "Fürdő", kind: "bath", x: 11, z: 5.5, w: 3.5, d: 3 }
      ]
    }
  },
  {
    id: 4,
    code: "BO-2366",
    district: "II. kerület",
    type: "Új építésű",
    title: "Reggeli fény",
    price: 178,
    size: 89,
    rooms: 3,
    image: "/demo/budai-otthonok/kert.webp",
    address: "Hűvösvölgyi út",
    floor: "Földszint",
    terrace: "31 m² saját kert",
    parking: "1 teremgarázs-hely",
    energy: "A++",
    ceiling: "2,8 m",
    built: "2025",
    updated: "ma",
    description:
      "Kertkapcsolatos otthon egy alacsony lakásszámú, új budai társasházban. Keleti tájolású nappali, fedett terasz és jól használható saját kert. Azonnal költözhető, beépített konyhával és gardróbokkal.",
    features: ["Saját kert", "Új építés", "Hőszivattyú", "Elektromos töltő", "Tároló", "Akadálymentes"],
    nearby: [["Hűvösvölgy végállomás", "6 perc"], ["Budakeszi-erdő", "10 perc"], ["Rózsakert", "8 perc autóval"]],
    plan: {
      facing: 90,
      level: "Földszint",
      blind: ["top", "left"],
      rooms: [
        { name: "Nappali · konyha", kind: "living", withKitchen: true, x: 0, z: 0, w: 7.5, d: 5.5 },
        { name: "Háló", kind: "bed", x: 7.5, z: 0, w: 3.5, d: 4 },
        { name: "Gyerekszoba", kind: "bed", x: 11, z: 0, w: 3, d: 4 },
        { name: "Fürdő", kind: "bath", x: 7.5, z: 4, w: 3, d: 2.5 },
        { name: "Előszoba", kind: "hall", x: 10.5, z: 4, w: 3.5, d: 2.5 },
        { name: "Kert", kind: "garden", x: 0, z: 5.5, w: 7.5, d: 4 }
      ]
    }
  }
];
