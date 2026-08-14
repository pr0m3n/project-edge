import type { Metadata } from "next";
import { ServiceLanding, type ServiceLandingContent } from "@/components/ServiceLanding";

export const metadata: Metadata = {
  title: "Weboldal kisvállalkozásoknak | ProjectEdge",
  description: "Gyors, átlátható és mobilbarát weboldal kisvállalkozásoknak: ajánlat, bizalomépítés és kapcsolatfelvétel felesleges technikai teher nélkül.",
  alternates: { canonical: "/weboldal-kisvallalkozasoknak" }
};

const content: ServiceLandingContent = {
  slug: "weboldal-kisvallalkozasoknak",
  eyebrow: "Kisvállalkozásoknak · országosan",
  title: "Ne neked kelljen elmagyaráznod minden érdeklődőnek ugyanazt.",
  lead: "A weboldal bemutatja a szolgáltatásodat, kezeli a legfontosabb kérdéseket, bizalmat épít és egyértelműen továbbvezeti az érdeklődőt.",
  promise: "Csak azt építem meg, amire valóban szükséged van — felesleges funkciók és technikai zsargon nélkül.",
  audience: ["egyéni vállalkozóknak", "helyi és országos szolgáltatóknak", "induló márkáknak", "növekedő kisvállalkozásoknak"],
  outcomes: [
    { title: "Profibb első benyomás", copy: "A közösségi profilok mellett lesz egy saját, rendezett felületed, ahol minden fontos információ megtalálható." },
    { title: "Kevesebb ismétlődő kérdés", copy: "A szolgáltatások, a folyamat, az árképzés és a gyakori kérdések előre tisztázhatók." },
    { title: "Több értelmes érdeklődő", copy: "Az oldal nem csak mutatós: világos kapcsolatfelvételi útvonalat és mérhető eseményeket kap." }
  ],
  process: [
    { title: "Elmondod, mit csinálsz", copy: "Nem kell kész marketinganyag. A briefben egyszerűen leírod az ajánlatodat és a célközönségedet." },
    { title: "Én rendszerezem", copy: "Összeállítom a tartalmi sorrendet, a vizuális irányt és a szükséges funkciókat." },
    { title: "Egy helyen követed", copy: "Az ügyfélkapuban látod az ajánlatot, a haladást, a visszajelzéseket és az átadást." }
  ],
  faq: [
    ["A szöveget is megírod?", "Vázlatból segítek érthető weboldalszöveget készíteni és megszerkesztem a tartalmi sorrendet."],
    ["Mi van, ha még nincs logóm vagy saját képem?", "A briefben ezt jelezheted. A vizuális irányt logó nélkül is el lehet kezdeni, képekhez pedig stock vagy külön fotós megoldást keresünk."],
    ["Lehet előfizetéses és egyszeri is?", "Igen. Ugyanazt a projektet választhatod menedzselt havidíjas szolgáltatásként vagy teljes átadással járó egyszeri projektként."]
  ]
};

export default function KisvallalkozasPage() { return <ServiceLanding content={content} />; }
