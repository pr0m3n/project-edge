import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { PROVIDER } from "@/lib/legal";
import { PRICE_TAX_NOTE } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "ÁSZF | ProjectEdge",
  description: "A ProjectEdge szolgáltatásaira vonatkozó Általános Szerződési Feltételek.",
  alternates: { canonical: "/aszf" }
};

export default function TermsPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">ÁSZF</p>
        <h1>Általános Szerződési Feltételek</h1>
        <p>
          Ezek a feltételek a ProjectEdge által nyújtott webfejlesztési és kapcsolódó
          szolgáltatásokra vonatkoznak. A projekt elindításával elfogadod az itt leírtakat.
        </p>
      </section>

      <section className="legal-prose">
        <h2>1. A szolgáltató</h2>
        <p>
          {PROVIDER.legalName} ({PROVIDER.shortName}; {PROVIDER.legalForm}), székhely: {PROVIDER.address},
          EV-nyilvántartási szám: {PROVIDER.registrationNumber}, adószám: {PROVIDER.taxNumber}, {PROVIDER.taxStatus}, e-mail:{" "}
          {PROVIDER.email} (a továbbiakban: Szolgáltató). Kapcsolattartó: {PROVIDER.contactName}. A részletes adatokat az{" "}
          <a href="/impresszum">Impresszum</a> tartalmazza.
        </p>

        <h2>2. A szolgáltatás</h2>
        <p>
          A Vállalkozó kétféle konstrukcióban nyújt weboldalkészítési szolgáltatást: menedzselt,
          havi díjas weboldal-szolgáltatásként, valamint egyszeri díjas weboldalvásárlásként. A
          választott konstrukciót, csomagot, tartalmat és díjat az Ügyfélkapun rögzített adatlap,
          ajánlat vagy szolgáltatási szerződés tartalmazza.
        </p>
        <p>
          A menedzselt konstrukció szolgáltatás, nem részletfizetéses adásvétel. A Vállalkozó
          elkészíti, futtatja, felügyeli és a csomag keretein belül karbantartja a weboldalt. Az
          egyszeri vásárlásnál az elkészült rendszer a teljes díj megfizetése után átadásra kerül,
          folyamatos üzemeltetés pedig csak külön megállapodás alapján jár hozzá.
        </p>

        <h2>3. A szerződés létrejötte</h2>
        <p>
          A szerződés az Ügyfélkapuban megjelenített egyedi szerződés és az ÁSZF kifejezett elektronikus
          elfogadásával jön létre. A rendszer az elfogadás időpontját rögzíti, a visszaigazolást e-mailben
          megküldi. A szerződés nyelve magyar, az Ügyfélkapuban hozzáférhető. Adatbeviteli hiba a beküldés
          előtt visszalépéssel, utána ügyfélkapus üzenettel vagy e-mailben javítható. A Szolgáltató magatartási
          kódexnek nem vetette alá magát.
        </p>

        <h2>4. Díjazás és fizetés</h2>
        <p>
          Menedzselt weboldalnál nincs külön induló díj: a munka megkezdésének feltétele az első
          havidíj előre történő megfizetése. Az ezt követő havidíjak minden szolgáltatási időszak
          elején esedékesek. Egyszeri vásárlásnál a vállalási díj az egyedi ajánlatban szerepel, a
          munka megkezdésének feltétele pedig 10 000 Ft foglaló, amely a végösszegbe beleszámít. A
          menedzselt előfizetés díjának megfizetése bankkártyával, a Stripe biztonságos fizetési
          felületén történik; a kártyát a Stripe a későbbi ismétlődő díjakhoz elmenti. Az egyszeri
          vásárlás foglalója, végösszege és a weboldal vételára banki átutalással fizetendő, az
          Ügyfélkapun megjelenő adatok alapján; a beérkezést a Szolgáltató ellenőrzi és igazolja vissza.
          {PRICE_TAX_NOTE} A Szolgáltató a fizetésről számlát állít ki.
        </p>
        <p>
          Egyszeri vásárlásnál a teljesítés sorrendje: a Vállalkozó az elkészült oldalt a Megrendelő jóváhagyása után
          élesíti, ezt követően esedékes a fennmaradó összeg, és a <strong>hozzáférések teljes
          átadása (7. pont) a teljes vállalási díj beérkezése után történik</strong>. Az élesítés
          tehát nem jelenti a hozzáférések átadását: a felhasználási jog is a teljes díj
          megfizetésével száll át (6. pont).
        </p>

        <h2>5. Fogyasztói elállási jog</h2>
        <p>
          Ha a Megrendelő fogyasztónak minősülő magánszemély, a 45/2014. (II. 26.) Korm. rendelet
          szerint szolgáltatási szerződésnél a szerződéskötéstől számított 14 napon belül indokolás nélkül felmondhatja.
          Szolgáltatásnyújtás esetén, ha a Megrendelő kifejezetten kéri a teljesítés 14 napon belüli
          megkezdését, tudomásul veszi, hogy az addig ténylegesen teljesített szolgáltatás arányos
          díja fizetendő. Ha a szolgáltatás a fogyasztó előzetes, kifejezett kérésére és tudomásulvételével
          teljes egészében befejeződik, a felmondási jog megszűnik. A 14 napos határidő után a megkezdett havi
          időszak díja nem visszatérítendő. A nyilatkozat az Ügyfélkapuban vagy a {PROVIDER.email} címen tehető meg.
          Ez nem érinti a fogyasztó kötelező szavatossági és egyéb jogait.
        </p>

        <h2>6. Szerzői jog és felhasználás</h2>
        <p>
          Egyszeri vásárlásnál a teljes vállalási díj megfizetését követően a Megrendelő időbeli és területi korlátozás
          nélküli felhasználási jogot kap az elkészült egyedi munkára. Menedzselt szolgáltatásnál a
          Megrendelő a rendezett előfizetés időtartamára kap használati jogot a működő weboldalhoz;
          a forráskód és a technikai fiókok feletti rendelkezési jog nem száll át. A Megrendelő saját
          neve, márkája, logója és általa biztosított tartalma továbbra is a Megrendelőt illeti. A felhasznált harmadik féltől
          származó elemekre (pl. betűtípusok, könyvtárak, stock tartalom) azok saját licencfeltételei
          irányadók. A díj teljes megfizetéséig a szerzői jogok a Vállalkozót illetik.
        </p>

        <h2>7. Üzemeltetés, harmadik feles szolgáltatások és átadás</h2>
        <p>
          Az elkészült weboldal harmadik felek szolgáltatásain fut. Ezek jellemzően: a domain
          regisztrátora (pl. Rackhost), a futtatási környezet (Vercel), szükség esetén az adatbázis
          és belépéskezelés (Supabase), valamint a levélküldés (Resend). Ezeknek a szolgáltatásoknak
          saját szerződési feltételei és díjszabása van.
        </p>
        <p>
          Menedzselt szolgáltatásnál ezeket a technikai fiókokat a Vállalkozó hozza létre és kezeli,
          a domain regisztrációját és megújítását is ő intézi, ezek díját pedig a havidíj tartalmazza
          a választott csomag rendeltetésszerű használatáig. A domain használatát a Szolgáltató a
          Megrendelő márkájához biztosítja, a regisztrátori kezelés és – ha a nyilvántartási szabályok lehetővé teszik –
          a domainhasználói jogosultság a szolgáltatás ideje alatt a Szolgáltatónál marad. A kért név nem sértheti
          más név-, védjegy- vagy egyéb jogát; az ügyfél az általa kért név jogszerűségéért felel. Egyszeri vásárlásnál a szolgáltatások a Megrendelő saját vagy céges
          fiókjába kerülnek, folyamatos díjaikat és megújításukat a Megrendelő fizeti.
        </p>
        <p>
          Az alábbi átadási folyamat kizárólag egyszeri vásárlásnál alkalmazandó. Az átadás az Ügyfélkapu vezetett átadási folyamatában, lépésenként, visszakövethetően
          történik. A Vállalkozó a hozzáféréseket meghívásos jogosultsággal, illetve
          projektátadással adja át; <strong>jelszót, bankkártyaadatot és titkos kulcsot egyik fél sem
          küld a másiknak</strong>. Az átadás lezárása után a fiókok, a számlázás, a megújítás és a
          mentések felelőssége a Megrendelőt terheli. Az egyes szolgáltatásoknál a Megrendelő
          közreműködése (fiók létrehozása, meghívás elfogadása, DNS rekordok felvétele) az átadás
          feltétele; ennek késedelme a 8. pont szerint hosszabbítja a határidőt.
        </p>

        <h2>8. A menedzselt szolgáltatás módosítása, szüneteltetése és lemondása</h2>
        <p>
          A menedzselt előfizetéshez nincs hűségidő. A Megrendelő az Ügyfélkapun bármely hónapban
          kérheti a szolgáltatás lemondását; a felmondás a folyó, kifizetett időszak végére hatályos, a weboldal addig működik,
          ezt követően leállítható. A megkezdett időszak díja nem jár vissza. Szüneteltetés kérhető
          havi 2 900 Ft parkolási díj mellett: ilyenkor a nyilvános oldal leállhat, de a domain és a
          technikai rendszer megmarad, így később újraaktiválható.
        </p>
        <p>
          A havidíj a csomagban leírt mennyiségű kisebb tartalmi vagy designmódosítást tartalmazza.
          Új funkció, teljes újratervezés vagy a vállalt keretet meghaladó munka külön ajánlat tárgya.
          Lemondáskor a weboldal, a forráskód és a kezelt technikai fiókok nem kerülnek automatikusan
          átadásra. A Megrendelő külön, az Ügyfélkapuban jelzett egyszeri vételi ajánlat alapján
          megvásárolhatja az átadható rendszert; a már kifizetett havidíjak nem számítanak bele a vételárba.
        </p>

        <h2>9. Díjmentes technikai garancia és folyamatos felügyelet</h2>
        <p>
          Egyszeri vásárlásnál az utolsó, Ügyfélkapuban igazolt technikai átadási lépéstől számított 30 napig a Vállalkozó díjmentesen
          kivizsgálja és javítja az átadáskor vállalt működés igazolt hibáit. A garancia nem
          tartalmaz új funkciót, új tartalmat, utólagos módosítást, harmadik felek szolgáltatásainak
          kieséséből eredő hibát, sem a Megrendelő vagy harmadik fél által végzett módosítások
          következményeit. A garancia nem karbantartási előfizetés; a hibát a Megrendelő az
          Ügyfélkapun jelzi. Menedzselt előfizetésnél a technikai felügyelet és a vállalt működés
          hibáinak javítása a rendezett szolgáltatás teljes időtartama alatt része a havidíjnak.
        </p>

        <h2>10. Együttműködés és határidők</h2>
        <p>
          A határidők a Megrendelő által biztosított anyagok, hozzáférések és visszajelzések
          határidőben történő megadását feltételezik. A Megrendelő késedelme a teljesítési
          határidőt arányosan meghosszabbítja.
        </p>

        <h2>11. Felelősség</h2>
        <p>
          A Vállalkozó a tőle elvárható szakmai gondossággal jár el. Nem felel a Megrendelő által
          szolgáltatott tartalmakért, harmadik felek szolgáltatásainak kieséséért, illetve az
          átadás után a Megrendelő vagy harmadik fél által végzett módosításokból eredő hibákért.
        </p>

        <h2>12. Vitarendezés</h2>
        <p>
          A felek a vitáikat elsődlegesen békés úton rendezik. Ennek eredménytelensége esetén a
          hatáskörrel és illetékességgel rendelkező magyar bíróság jár el. Panasz a {PROVIDER.email} címen
          nyújtható be; az írásbeli panaszt a Szolgáltató főszabály szerint 30 napon belül megválaszolja.
          Fogyasztói jogvita esetén a Megrendelő a lakóhelye vagy tartózkodási helye szerinti békéltető
          testülethez fordulhat, amelynek eljárásában a Szolgáltatót együttműködési kötelezettség terheli.
        </p>

        <h2>13. Hibás teljesítés, rendelkezésre állás és vis maior</h2>
        <p>A Szolgáltató a Ptk. szerint felel a hibás teljesítésért. A csomag nem jelent megszakítás nélküli,
          100%-os rendelkezésre állási ígéretet; tervezett karbantartásról lehetőség szerint előre tájékoztat.
          Egyik fél sem felel az ellenőrzési körén kívüli, elháríthatatlan esemény miatti késedelemért, de a másik
          felet értesítenie és a következményeket észszerűen mérsékelnie kell.</p>

        <h2>14. Hatály és módosítás</h2>
        <p>Az egyedi szerződés eltérő rendelkezése elsőbbséget élvez. Az ÁSZF jövőre néző, előfizetőt hátrányosan
          érintő lényeges módosításáról legalább 30 nappal korábban értesítés készül; az ügyfél a hatálybalépésig
          díjmentesen felmondhat. Egyszeri projektre a szerződéskötéskor elfogadott változat irányadó.</p>

        <p className="legal-note">
          Lásd még az <a href="/impresszum">Impresszumot</a> és az{" "}
          <a href="/adatkezeles">Adatkezelési tájékoztatót</a>. Hatályos: 2026. augusztus 9.
        </p>
      </section>
    </main>
  );
}
