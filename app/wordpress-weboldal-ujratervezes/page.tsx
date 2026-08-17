import type { Metadata } from "next";
import { ServiceLanding, type ServiceLandingContent } from "@/components/ServiceLanding";

export const metadata: Metadata = {
  title: "WordPress weboldal újratervezés | ProjectEdge",
  description: "Lassú vagy elavult WordPress weboldal újratervezése havidíjas konstrukcióban. A tartalmat áthozom, a domainedet megtartod, az üzemeltetés az én dolgom.",
  alternates: { canonical: "/wordpress-weboldal-ujratervezes" }
};

const content: ServiceLandingContent = {
  slug: "wordpress-weboldal-ujratervezes",
  eyebrow: "WordPress redesign · 14 900 Ft/hó-tól",
  title: "A régi weboldaladból ne csak szebb, hanem használhatóbb rendszer legyen.",
  lead: "Átnézem a meglévő WordPress-oldalt, a tartalmat és a működést, majd új oldal épül a helyére — ugyanabban a havidíjas konstrukcióban, mint bármelyik új weboldal. Külön belépési díj nincs.",
  promise: "A régi oldalad nem akadály, hanem kiindulás: a tartalom már megvan, a domain már megvan.",
  audience: ["nincs belépési díj", "a domainedet megtartod", "a tartalmat áthozom", "az üzemeltetés az én dolgom"],
  outcomes: [
    { title: "Megőrzött értékek", copy: "A használható tartalom, domain és keresőben értékes URL-ek nem vesznek el feleslegesen." },
    { title: "Gyorsabb, tisztább felület", copy: "A mobilnézet, a tartalmi sorrend és a technikai alap együtt kap új struktúrát." },
    { title: "Biztonságos átállás", copy: "Az élesítés, az átirányítások, a domain és a szükséges hozzáférések dokumentált folyamatban kerülnek át." }
  ],
  process: [
    { title: "Felmérés", copy: "Megadod a jelenlegi oldal címét és a hozzáférési helyzetet, én pedig feltérképezem a megtartandó részeket." },
    { title: "Csomagválasztás", copy: "A meglévő oldal terjedelme alapján kiválasztjuk a megfelelő havi csomagot, és kitöltöd a hozzá igazított briefet." },
    { title: "Redesign és átállás", copy: "A jóváhagyott irány alapján elkészítem, tesztelem és kontrolláltan élesítem az új oldalt." }
  ],
  faq: [
    ["Mi lesz a régi WordPress oldallal?", "Az új oldal a saját rendszeremen épül fel, a régi tartalmat áthozom. Ha a jelenlegi oldaladat inkább megtartanád és csak figyelné valaki, arra külön gondozás kérhető havi 15 000 – 35 000 Ft között."],
    ["Megmaradnak a Google-ben szereplő oldalak?", "Az értékes URL-eket és tartalmakat feltérképezem; változásnál megfelelő átirányítási terv készül."],
    ["Ez is havidíjas?", "Igen. A felújítás ugyanaz a menedzselt, havidíjas szolgáltatás, mint egy új weboldal — a régi oldalad csak jobb kiindulási anyag. Ha később a saját tulajdonodba vennéd, a rögzített vételi opcióval bármikor kivásárolhatod."]
  ]
};

export default function WordpressRedesignPage() { return <ServiceLanding content={content} />; }
