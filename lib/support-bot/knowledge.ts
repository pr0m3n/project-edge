import "server-only";

import { HOME_FAQS } from "@/lib/faq";
import { PROVIDER } from "@/lib/legal";
import {
  ANNUAL_FREE_MONTHS,
  BILLING_TERMS,
  CHANGE_LEAD_REALITY,
  CHANGE_QUOTA_EXCLUDED,
  CHANGE_QUOTA_FREE,
  CHANGE_QUOTA_INCLUDED,
  LOGO_DESIGN_PRICE,
  PARKING_MONTHLY_PRICE,
  PRICE_TAX_NOTE,
  PURCHASE_OPTION_PRICES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_SHARED_INCLUDED,
  buyoutCreditMonths,
  buyoutFloorPrice,
  formatHuf,
  termTotal
} from "@/lib/subscriptions";

/**
 * Az AI-asszisztens tudásanyaga.
 *
 * Minden szám és csomagjellemző a kódból jön (`lib/subscriptions.ts`,
 * `lib/faq.ts`, `lib/legal.ts`), nem kézzel van ide beírva: ha egy ár vagy
 * feltétel változik, a bot ugyanazt mondja, amit az oldal. A kézzel írt
 * részek csak olyan tényeket tartalmaznak, amik nyilvánosan az oldalon
 * állnak (/szolgaltatasok, /folyamat, /ingyenes-weboldal-audit).
 *
 * Ha ide új tényt veszel fel, előbb kerüljön ki az oldalra — a bot nem
 * tudhat többet, mint amit a látogató maga is el tud olvasni.
 */

function bullet(items: readonly string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function planSection() {
  return SUBSCRIPTION_PLANS.map((plan) => {
    const annual = BILLING_TERMS.find((term) => term.key === "annual");
    const annualLine = annual
      ? `Éves fizetéssel ${formatHuf(termTotal(plan.price, annual))} / év (${annual.freeMonths} hónap ingyen).`
      : "";
    return [
      `### ${plan.name} — ${formatHuf(plan.price)} / hó, vagy egyszeri vásárlással ${formatHuf(PURCHASE_OPTION_PRICES[plan.key])}`,
      `Kinek: ${plan.idealFor} (${plan.short})`,
      `Terjedelem: ${plan.pages}. Elkészül: ${plan.buildTime.toLowerCase()}.`,
      `Megjelenés: ${plan.designLevel}. Kapcsolatfelvétel: ${plan.leadFlow}. Mérés és SEO: ${plan.measurement}.`,
      `Módosítási keret (havidíjnál): ${plan.changes}; a kért módosítás ${plan.changeLeadDays} munkanapon belül elkészül.`,
      annualLine,
      `Kivásárlás bérlés után: a vételár ${buyoutCreditMonths(plan.key)} hónap bérlés után a felére, ${formatHuf(buyoutFloorPrice(plan.key))}-ra csökken.`
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n\n");
}

function faqSection() {
  return HOME_FAQS.map(([question, answer]) => `K: ${question}\nV: ${answer}`).join("\n\n");
}

export function buildSupportKnowledge() {
  return `# ProjectEdge — tudásanyag

## Ki vagyunk
A ProjectEdge egy egyszemélyes webfejlesztő stúdió. Patrik (${PROVIDER.contactName}) tervez, fejleszt és üzemeltet — minden egy kézben, nincs alvállalkozó, nincs ügynökség.
Kapcsolat: ${PROVIDER.email}, ${PROVIDER.phone}. Székhely: ${PROVIDER.address}. Számlázás: ${PROVIDER.shortName}, ${PROVIDER.taxStatus.toLowerCase()}.
${PRICE_TAX_NOTE}

## Mit csinálunk
- Egyedi, mobilra tervezett céges weboldalak kisvállalkozásoknak — nem sablon, nem WordPress-bővítmények halmaza. Technológia: Next.js, Vercel tárhely, Supabase, Stripe.
- Kétféle konstrukció ugyanarra a weboldalra:
  1. Havidíjas (bérelt, menedzselt) weboldal: induló díj nélkül; én kezelem a domaint, a tárhelyet, a karbantartást és a felügyeletet.
  2. Egyszeri vásárlás: a kész oldalt a forráskóddal és a hozzáférésekkel együtt átadom; a domain és a tárhely díját az ügyfél a saját fiókjaiban fizeti.
- Meglévő oldal felújítása: a régi tartalmat áthozom, és havidíjjal vagy egyszeri vásárlással épül újra.
- Mástól származó, meglévő oldal gondozása (frissítés, mentés, mérés, apró javítások, havi riport): havi 15 000 – 35 000 Ft. Ez NEM a weboldal-bérlés; ott a gondozás már benne van a havidíjban.
- Egyedi rendszer (belépés, adatbázis, jogosultságkezelés, ügyfélkapu, webapp): nem bérelhető, egyedi fejlesztés saját ajánlattal — ezt Patrik egyezteti.
- Ingyenes weboldal-audit: a projectedge.hu/ingyenes-weboldal-audit oldalon kérhető, 24 órán belül 3 pontos, emberi elemzést küldök emailben (sebesség, mobilos használhatóság, konverzió). Díjmentes, nincs elköteleződés.

## Csomagok és árak
${planSection()}

Mindhárom havidíjas csomagban benne van:
${bullet(SUBSCRIPTION_SHARED_INCLUDED)}

Fizetési ütemezés havidíjnál: havonta bankkártyával (automatikus megújulás, bármikor lemondható), félévente vagy évente bankkártyával vagy banki átutalással. Éves fizetésnél ${ANNUAL_FREE_MONTHS} hónapot nem számolunk fel. A kártyás fizetést a Stripe kezeli, a kártyaadat hozzám nem jut el.
Szüneteltetés: a havidíjas oldal szüneteltethető; ilyenkor parkolóállapotba kerül ${formatHuf(PARKING_MONTHLY_PRICE)} / hó díjért, a domain és a fiókok megmaradnak.
Logótervezés: ha nincs logó, letisztult szöveges logót készítek felár nélkül; teljes logótervezés ${formatHuf(LOGO_DESIGN_PRICE)} egyszeri felárért kérhető.
Szövegek: az ár tartalmazza, vázlatból megírom. Képek: saját fotó a legjobb, ha nincs, stock képpel megoldom.

## Mikor kell fizetni
- Havidíjnál: nincs előleg, foglaló, belépési díj és hűségidő. A szerződés elfogadása indítja az építést fizetés nélkül; a díj csak a kész oldal jóváhagyása után esedékes. Ha nem tetszik, nem fizetsz. Élesbe csak a fizetés után kerül.
- Egyszeri vásárlásnál: 10 000 Ft foglaló indítja a munkát, ami a vételár része. Az átadás a teljes díj rendezése után történik, utána 30 nap díjmentes technikai hibajavítás jár.

## Kivásárlás (bérlésből tulajdon)
A bérelt oldal bármikor megvásárolható egyszeri díjért: a forráskód, a domain és a hozzáférések az ügyfélé lesznek, az előfizetés lezárul. A befizetett havidíj fele beszámít a vételárba, egészen addig, amíg a vételár a felére nem csökken (nagyjából egy-másfél év bérlés után feleáron vehető meg). Felmondáskor a fel nem használt beszámítás elvész. A megvásárlást az ügyfélkapun lehet elindítani.

## Módosítások a havidíjban
Beleszámít a keretbe:
${bullet(CHANGE_QUOTA_INCLUDED)}
Külön ajánlat:
${bullet(CHANGE_QUOTA_EXCLUDED)}
Mindig ingyenes, nem fogyasztja a keretet:
${bullet(CHANGE_QUOTA_FREE)}
${CHANGE_LEAD_REALITY}

## A folyamat
1. Csomagválasztás és adatlap (kb. 15 perc) — a projectedge.hu oldalon a „Projektet indítok" gombbal vagy az ügyfélkapun (projectedge.hu/ugyfelkapu).
2. Digitális szerződés az ügyfélkapun — ez indítja az építést, fizetés nélkül.
3. Egyedi építés mobilra tervezve; az ügyfélkapun végig látszik, hol tart.
4. Privát előnézeti linken megnézed a működő oldalt, és annyi módosítást kérsz, amennyi kell.
5. Fizetés, ha tetszik.
6. Élesítés a saját domaineden, utána üzemeltetés és finomítás.
Az elkészítési idő a hiánytalan adatlap és a szükséges anyagok beérkezésétől számít.

Induláskor hasznos, ha megvan (de nem kötelező, később pótolható): vágyott domain 3 névötlettel, logó (lehetőleg vektoros), márkaszínek, szövegek vagy vázlat, saját fotók, közösségi linkek, megjelenő elérhetőségek, számlázási adatok.

## Hasznos oldalak
- projectedge.hu/szolgaltatasok — csomagok, árak, összehasonlítás, kivásárlás
- projectedge.hu/folyamat — a közös munka lépései
- projectedge.hu/munkak — referenciák és bemutató projektek
- projectedge.hu/ingyenes-weboldal-audit — ingyenes elemzés a meglévő oldalról
- projectedge.hu/ugyfelkapu — belépés, projekt indítása, meglévő ügyfeleknek a kérések
- projectedge.hu/aszf és projectedge.hu/adatkezeles — jogi dokumentumok

## Gyakori kérdések a főoldalról
${faqSection()}
`;
}
