import type { Metadata } from "next";
import { ServiceLanding, type ServiceLandingContent } from "@/components/ServiceLanding";

export const metadata: Metadata = {
  title: "Weboldal készítés vállalkozásoknak | ProjectEdge",
  description: "Egyedi, mobilbarát üzleti weboldal teljesen online folyamattal, átlátható árazással és technikai átadással vagy üzemeltetéssel.",
  alternates: { canonical: "/weboldal-keszites" }
};

const content: ServiceLandingContent = {
  slug: "weboldal-keszites",
  eyebrow: "Weboldal készítés · Magyarország",
  title: "Weboldal, ami érthetően elmondja, miért téged válasszanak.",
  lead: "Stratégia, szöveg, egyedi megjelenés és fejlesztés egy kézben. Az egész projekt online, követhető ügyfélkapun keresztül zajlik.",
  promise: "Nem sablont töltesz ki: a vállalkozásod ajánlatára építem fel az oldalt.",
  audience: ["országosan elérhető", "mobilra tervezett", "gyors és keresőbarát", "kényelmes, rugalmas folyamat"],
  outcomes: [
    { title: "Tiszta ajánlat", copy: "A látogató néhány másodperc alatt megérti, miben segítesz és mi legyen a következő lépése." },
    { title: "Egyedi megjelenés", copy: "A design a márkádhoz és a célközönségedhez készül, nem egy előre gyártott sablon átszínezése." },
    { title: "Működő rendszer", copy: "Űrlapok, mérés, mobilnézet, domain és élesítés együtt készülnek el, dokumentált átadással." }
  ],
  process: [
    { title: "Részletes brief", copy: "Leírod a vállalkozást, a célokat, a tartalmat és a vizuális irányt." },
    { title: "Ajánlat és szerződés", copy: "Egyszeri projektnél pontos ajánlatot kapsz; előfizetésnél rögtön látod a csomagdíjat." },
    { title: "Tervezés és fejlesztés", copy: "Látod a haladást, visszajelzel, én pedig végigviszem a projektet az élesítésig." }
  ],
  faq: [
    ["Mennyi idő alatt készül el?", "A csomagtól függően jellemzően 2–14 munkanap, a hiánytalan brief, az anyagok és az induló fizetés beérkezésétől."],
    ["Szükséges telefonon egyeztetni?", "Nem kötelező. A brief, az ajánlat, a szerződés, a visszajelzések és a fizetés is kényelmesen kezelhető írásban az ügyfélkapun — de ha személyesen vagy telefonon beszélnéd át, természetesen állok rendelkezésedre."],
    ["Saját tulajdonomba kerülhet?", "Igen. Egyszeri vásárlásnál a teljes fizetés után átadom a forráskódot és a szükséges hozzáféréseket."]
  ]
};

export default function WeboldalKeszitesPage() { return <ServiceLanding content={content} />; }
