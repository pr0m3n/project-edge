import type { Metadata } from "next";
import { ServiceLanding, type ServiceLandingContent } from "@/components/ServiceLanding";

export const metadata: Metadata = {
  title: "Havidíjas weboldal induló díj nélkül | ProjectEdge",
  description: "Menedzselt, havidíjas weboldal domainnel, tárhellyel, SSL-lel és technikai felügyelettel. Nincs külön induló díj vagy hűségidő.",
  alternates: { canonical: "/havidijas-weboldal" }
};

const content: ServiceLandingContent = {
  slug: "havidijas-weboldal",
  eyebrow: "Menedzselt weboldal · 14 900 Ft/hó-tól",
  title: "A weboldalad működik. Neked nem kell üzemeltetned.",
  lead: "Egyetlen havidíjban kapod az egyedi weboldalt, a domaint, a tárhelyet, az SSL-t és a folyamatos technikai felügyeletet — külön induló díj nélkül.",
  promise: "Jó választás, ha nem szeretnél több számlát, szolgáltatót és technikai fiókot kezelni.",
  audience: ["0 Ft induló díj", "nincs hűségidő", "domain és tárhely egyben", "díjmentes email továbbítás", "csomag szerinti módosítások"],
  outcomes: [
    { title: "Új, saját arculatú oldal", copy: "A havidíj nem egy bérelt sablont jelent: új weboldal készül a választott csomag keretei között." },
    { title: "Folyamatos felügyelet", copy: "Figyelem a működést, kezelem a technikai frissítéseket, a tárhelyet, az email továbbítást és az SSL-t." },
    { title: "Kiszámítható költség", copy: "Előre látható havidíjat fizetsz; a csomagon túli igényre külön, előzetes ajánlatot kapsz." }
  ],
  process: [
    { title: "Csomagválasztás", copy: "Kiválasztod a Jelenlét, Üzleti vagy Egyedi csomagot, majd kitöltöd a hozzá igazított briefet." },
    { title: "Szerződés és első havidíj", copy: "Elfogadod az online szerződést, majd biztonságosan elindítod a Stripe-előfizetést." },
    { title: "Elkészítés és gondozás", copy: "Megépítem és élesítem az oldalt, utána pedig folyamatosan gondoskodom a technikai működéséről." }
  ],
  faq: [
    ["Van hűségidő?", "Nincs. Az előfizetés bármikor lemondható, a már kifizetett időszak végéig használható az oldal."],
    ["Jár céges email cím a weboldalhoz?", "Igen, a domainhez tartozó email címről (pl. info@cegnev.hu) díjmentesen biztosítunk automata email továbbítást a meglévő fiókodba (pl. Gmail). Ha külön Google Workspace fiókot szeretnél, a beállításában is segítünk."],
    ["Kié lesz a forráskód?", "Előfizetésnél a technikai rendszer a ProjectEdge kezelésében marad. Ha a saját tulajdonodba szeretnéd venni, a rögzített vételi opcióval bármikor kivásárolhatod a forráskóddal együtt."],
    ["Milyen gyorsan készül el?", "A Jelenlét csomag jellemzően 2–4, az Üzleti 3–6, az Egyedi 5–14 munkanap alatt készül el a szükséges anyagok beérkezésétől."]
  ]
};

export default function HavidijasWeboldalPage() { return <ServiceLanding content={content} />; }
