import { PURCHASE_OPTION_PRICES, formatHuf } from "@/lib/subscriptions";

/**
 * A főoldal gyakori kérdései — EGY helyen.
 *
 * A főoldal GYIK-blokkja és a chat AI-asszisztensének tudásanyaga is innen
 * olvas, így a bot nem mondhat mást, mint ami az oldalon áll. Ha egy választ
 * átírsz, mindkét helyen egyszerre változik.
 */
export const HOME_FAQS: Array<[question: string, answer: string]> = [
  [
    "Mennyibe kerül a weboldal?",
    `Egyszeri vásárlással a Jelenlét ${formatHuf(PURCHASE_OPTION_PRICES.presence)}, az Üzleti ${formatHuf(PURCHASE_OPTION_PRICES.business)}, az Egyedi ${formatHuf(PURCHASE_OPTION_PRICES.custom)}. Itt 10 000 Ft foglaló indítja a munkát, amely a vételár része; a működtetés külön költség. Menedzselt bérlésben 14 900 Ft/hó-tól indulsz. Előleg, foglaló és belépési díj nincs: a megrendelés után elkészítem az oldalt, és csak akkor fizetsz, ha a kész oldalt jóváhagytad. A domain, a tárhely meg a karbantartás is benne van ugyanabban az összegben. Ha később a sajátodként szeretnéd a forráskóddal és a technikai fiókokkal együtt, a rögzített vételi opcióval bármikor megvásárolhatod.`
  ],
  [
    "Mennyi idő alatt készül el?",
    "A szerződés elfogadásától és a szükséges anyagok beérkezésétől számítva a Jelenlét oldal jellemzően 2–4 munkanap, az Üzleti 3–6 munkanap, az Egyedi 5–14 munkanap. Összetett webappnál külön ütemezést adok."
  ],
  [
    "Mi van, ha nem tetszik az irány?",
    "Az élesítés előtt megkapod a kész oldalt egy privát előnézeti linken, és ott kérsz módosítást — annyiszor, ahányszor kell, amíg jó nem lesz. Havidíjas konstrukcióban csak a jóváhagyás után fizetsz, és ha végül nem tetszik, nem fizetsz semmit. Egyszeri vásárlásnál a foglaló és a fizetési ütemezés feltételeit az ajánlat és a szerződés rögzíti."
  ],
  [
    "Jár céges email cím a weboldalhoz?",
    "Igen, a domainhez tartozó email címről (pl. info@cegnev.hu) díjmentesen biztosítunk automata email továbbítást a meglévő privát vagy céges fiókodba (pl. Gmail). Ha külön önálló Google Workspace vagy Microsoft 365 postafiókokat szeretnél, annak a beállításában és DNS konfigurációjában is segítünk."
  ],
  [
    "Kell hozzá saját domain és tárhely?",
    "Havidíjas konstrukcióban nem kell semmit külön venned: a .hu vagy .com domaint, az SSL-tanúsítványt és a gyors felhőtárhelyet is intézem a havidíj részeként. Egyszeri vásárlásnál segítek a beállításban, a domain és a tárhely díját a saját fiókjaidban fizeted."
  ],
  [
    "Mi van az élesítés után?",
    "Egyszeri vásárlásnál az átadást követő 30 napban díjmentesen javítom a technikai hibákat; folyamatos karbantartásra külön megállapodást kérhetsz. A havidíj tartalmazza a folyamatos technikai felügyeletet, az automata biztonsági mentéseket, a technikai hibák javítását és a csomagodhoz tartozó kisebb tartalmi/design módosításokat. Menedzselt szolgáltatásnál a kiesést díjmentesen és soron kívül kezelem; százalékos rendelkezésre állást nem ígérek, mert az üzemidő részben külső szolgáltatóktól függ."
  ],
  [
    "Kinél lesznek a hozzáférések és ki fizeti a futtatást?",
    "Havidíjnál a domaint, a tárhelyet és a technikai infrastruktúrát én kezelem. Egyszeri vásárlásnál a teljes díj rendezése után a saját fiókjaidba adom át az oldalt. Ha egyszer úgy döntesz, hogy kivásárolod az oldalt, a forráskódot és a teljes infrastruktúrát átadom a saját fiókjaidba."
  ]
];
