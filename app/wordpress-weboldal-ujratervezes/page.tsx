import type { Metadata } from "next";
import { ServiceLanding, type ServiceLandingContent } from "@/components/ServiceLanding";

export const metadata: Metadata = {
  title: "WordPress weboldal újratervezés | ProjectEdge",
  description: "Lassú vagy elavult WordPress weboldal átvizsgálása és újratervezése. A jó alap megtartható, a korlátozó rendszer modern megoldásra cserélhető.",
  alternates: { canonical: "/wordpress-weboldal-ujratervezes" }
};

const content: ServiceLandingContent = {
  slug: "wordpress-weboldal-ujratervezes",
  eyebrow: "WordPress redesign · egyszeri projekt",
  title: "A régi weboldaladból ne csak szebb, hanem használhatóbb rendszer legyen.",
  lead: "Átnézem a meglévő WordPress-oldalt, a tartalmat, a sebességet és a működést. Ami jó, megtartható; ami korlátoz, azt modern rendszerre cserélem.",
  promise: "Nem döntöm el előre, hogy mindent újra kell építeni. Előbb azt nézem meg, mi szolgálja jobban a vállalkozást.",
  audience: ["elavult megjelenés", "lassú mobiloldal", "nehezen kezelhető bővítmények", "gyenge ajánlatkérési folyamat"],
  outcomes: [
    { title: "Megőrzött értékek", copy: "A használható tartalom, domain és keresőben értékes URL-ek nem vesznek el feleslegesen." },
    { title: "Gyorsabb, tisztább felület", copy: "A mobilnézet, a tartalmi sorrend és a technikai alap együtt kap új struktúrát." },
    { title: "Biztonságos átállás", copy: "Az élesítés, az átirányítások, a domain és a szükséges hozzáférések dokumentált folyamatban kerülnek át." }
  ],
  process: [
    { title: "Felmérés", copy: "Megadod a jelenlegi oldal címét és a hozzáférési helyzetet, én pedig feltérképezem a megtartandó részeket." },
    { title: "Javaslat", copy: "Írásos ajánlatot kapsz arról, érdemes-e WordPressen maradni vagy jobb egy modern újraépítés." },
    { title: "Redesign és átállás", copy: "A jóváhagyott irány alapján elkészítem, tesztelem és kontrolláltan élesítem az új oldalt." }
  ],
  faq: [
    ["Mindenképpen elhagyjuk a WordPresst?", "Nem. Ha a jelenlegi alap megfelelő és gazdaságosabban javítható, a WordPress maradhat."],
    ["Megmaradnak a Google-ben szereplő oldalak?", "Az értékes URL-eket és tartalmakat feltérképezem; változásnál megfelelő átirányítási terv készül."],
    ["Ez előfizetésben kérhető?", "Meglévő oldal átalakítása egyszeri projekt. Az elkészült oldalhoz később külön gondozás kérhető."]
  ]
};

export default function WordpressRedesignPage() { return <ServiceLanding content={content} />; }
