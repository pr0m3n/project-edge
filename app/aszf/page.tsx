import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "ÁSZF | ProjectEdge",
  description: "A ProjectEdge szolgáltatásaira vonatkozó Általános Szerződési Feltételek."
};

// TODO (KITÖLTENDŐ): a [...] helyek valós adatokkal, és éles használat előtt
// jogi ellenőrzés ajánlott. A fogyasztói elállási jog (45/2014. Korm. r.) és a
// szerzői jogi átruházás megfogalmazását érdemes szakértővel véglegesíttetni.
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
          [KITÖLTENDŐ – név / cégnév], székhely: [KITÖLTENDŐ], e-mail: info@projectedge.hu
          (a továbbiakban: Vállalkozó). A részletes adatokat az{" "}
          <a href="/impresszum">Impresszum</a> tartalmazza.
        </p>

        <h2>2. A szolgáltatás</h2>
        <p>
          A Vállalkozó egyedi weboldalak, webalkalmazások és kapcsolódó digitális rendszerek
          tervezését és fejlesztését vállalja. A konkrét tartalmat (scope), határidőt és díjat a
          projektre adott egyedi ajánlat rögzíti, amelyet a Megrendelő az Ügyfélkapun fogad el.
        </p>

        <h2>3. A szerződés létrejötte</h2>
        <p>
          A szerződés a Megrendelő és a Vállalkozó között az ajánlat, majd a vállalkozási szerződés
          Ügyfélkapun keresztüli, elektronikus elfogadásával jön létre. Az elfogadás elektronikus
          jognyilatkozatnak minősül (Ptk. 6:7. §), amelyet a rendszer időbélyeggel rögzít.
        </p>

        <h2>4. Díjazás és fizetés</h2>
        <p>
          A vállalási díj az egyedi ajánlatban szerepel. A munka megkezdésének feltétele egy fix,
          10 000 Ft összegű foglaló megfizetése, amely a végösszegbe beleszámít. A kész munkát a
          Vállalkozó csak a teljes vállalási díj beérkezése után adja át és élesíti; a fennmaradó
          összeg tehát az átadás feltétele. A fizetés az Ügyfélkapun keresztül történik.
        </p>

        <h2>5. Fogyasztói elállási jog</h2>
        <p>
          Ha a Megrendelő fogyasztónak minősülő magánszemély, a 45/2014. (II. 26.) Korm. rendelet
          szerint a szerződéskötéstől számított 14 napon belül indokolás nélkül elállhat.
          Szolgáltatásnyújtás esetén, ha a Megrendelő kifejezetten kéri a teljesítés 14 napon belüli
          megkezdését, tudomásul veszi, hogy a teljesítés megkezdése után az elállási jogát a már
          teljesített, arányos rész tekintetében elveszíti. Mivel a munka megkezdésének feltétele
          csak a fix összegű foglaló, elállás esetén ennek erejéig áll fenn az elszámolási igény.
        </p>

        <h2>6. Szerzői jog és felhasználás</h2>
        <p>
          A teljes vállalási díj megfizetését követően a Megrendelő időbeli és területi korlátozás
          nélküli felhasználási jogot kap az elkészült egyedi munkára. A felhasznált harmadik féltől
          származó elemekre (pl. betűtípusok, könyvtárak, stock tartalom) azok saját licencfeltételei
          irányadók. A díj teljes megfizetéséig a szerzői jogok a Vállalkozót illetik.
        </p>

        <h2>7. Együttműködés és határidők</h2>
        <p>
          A határidők a Megrendelő által biztosított anyagok, hozzáférések és visszajelzések
          határidőben történő megadását feltételezik. A Megrendelő késedelme a teljesítési
          határidőt arányosan meghosszabbítja.
        </p>

        <h2>8. Felelősség</h2>
        <p>
          A Vállalkozó a tőle elvárható szakmai gondossággal jár el. Nem felel a Megrendelő által
          szolgáltatott tartalmakért, harmadik felek szolgáltatásainak kieséséért, illetve az
          átadás után a Megrendelő vagy harmadik fél által végzett módosításokból eredő hibákért.
        </p>

        <h2>9. Vitarendezés</h2>
        <p>
          A felek a vitáikat elsődlegesen békés úton rendezik. Ennek eredménytelensége esetén a
          hatáskörrel és illetékességgel rendelkező magyar bíróság jár el. Fogyasztói jogvita esetén
          a Megrendelő a lakóhelye szerinti békéltető testülethez fordulhat.
        </p>

        <p className="legal-note">
          Lásd még az <a href="/impresszum">Impresszumot</a> és az{" "}
          <a href="/adatkezeles">Adatkezelési tájékoztatót</a>.
        </p>
      </section>
    </main>
  );
}
