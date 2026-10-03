import type { Metadata } from "next";
import { ServiceLanding, type ServiceLandingContent } from "@/components/ServiceLanding";

export const metadata: Metadata = {
  title: "WordPress weboldal újratervezés | ProjectEdge",
  description: "Lassú vagy elavult WordPress weboldal újratervezése havidíjjal vagy egyszeri megvásárlással. A tartalmat áthozom, a domainedet megtartod.",
  alternates: { canonical: "/wordpress-weboldal-ujratervezes" }
};

const content: ServiceLandingContent = {
  slug: "wordpress-weboldal-ujratervezes",
  eyebrow: "WordPress redesign · 14 900 Ft/hó-tól",
  title: "A régi weboldaladból ne csak szebb, hanem használhatóbb rendszer legyen.",
  lead: "Átnézem a meglévő WordPress-oldalt, a tartalmat és a működést, majd új oldal épül a helyére. Választhatsz menedzselt havidíjat belépési díj nélkül, vagy megvásárolhatod a választott csomagot saját technikai fiókokkal.",
  promise: "A régi oldalad nem akadály, hanem kiindulás: a tartalom már megvan, a domain már megvan.",
  audience: ["havidíj vagy egyszeri vásárlás", "a domainedet megtartod", "a tartalmat áthozom", "vezetett átállás"],
  outcomes: [
    { title: "Megőrzött értékek", copy: "A használható tartalom, domain és keresőben értékes URL-ek nem vesznek el feleslegesen." },
    { title: "Gyorsabb, tisztább felület", copy: "A mobilnézet, a tartalmi sorrend és a technikai alap együtt kap új struktúrát." },
    { title: "Biztonságos átállás", copy: "Az élesítés, az átirányítások, a domain és a szükséges hozzáférések dokumentált folyamatban kerülnek át." }
  ],
  process: [
    { title: "Felmérés", copy: "Megadod a jelenlegi oldal címét és a hozzáférési helyzetet, én pedig feltérképezem a megtartandó részeket." },
    { title: "Csomagválasztás", copy: "A meglévő oldal terjedelme alapján kiválasztjuk a megfelelő csomagot és a havidíjas vagy vásárlási konstrukciót, majd kitöltöd a hozzá igazított briefet." },
    { title: "Redesign és átállás", copy: "A jóváhagyott irány alapján elkészítem, tesztelem és kontrolláltan élesítem az új oldalt." }
  ],
  faq: [
    ["Mi lesz a régi WordPress oldallal?", "Az új oldal a saját rendszeremen épül fel, a régi tartalmat áthozom. Ha a jelenlegi oldaladat inkább megtartanád és csak figyelné valaki, arra külön gondozás kérhető havi 15 000 – 35 000 Ft között."],
    ["Megmaradnak a Google-ben szereplő oldalak?", "Az értékes URL-eket és tartalmakat feltérképezem; változásnál megfelelő átirányítási terv készül."],
    ["Ez is havidíjas?", "Választhatsz havidíjat vagy egyszeri megvásárlást, ugyanúgy, mint egy új weboldalnál. Havidíjnál én kezelem az üzemeltetést, és később is kivásárolhatod az oldalt. Vásárlásnál a forráskódot és a technikai hozzáféréseket átadom; a domain, tárhely és egyéb szolgáltatások működési díjait a saját fiókjaidban fizeted."]
  ]
};

export default function WordpressRedesignPage() { return <ServiceLanding content={content} />; }
