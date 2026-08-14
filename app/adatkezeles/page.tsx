import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { PROVIDER } from "@/lib/legal";

export const metadata: Metadata = { title: "Adatkezelési tájékoztató | ProjectEdge", description: "A ProjectEdge GDPR szerinti adatkezelési tájékoztatója.", alternates: { canonical: "/adatkezeles" } };

export default function PrivacyPage() {
  return <main className="site-shell light-page"><SiteNav />
    <section className="page-hero compact"><p className="micro-label dark">Adatvédelem</p><h1>Adatkezelési tájékoztató</h1><p>Átlátható információ arról, milyen adatot, milyen célból és meddig kezelünk.</p></section>
    <section className="legal-prose">
      <h2>1. Adatkezelő</h2><p><strong>{PROVIDER.legalName}</strong> ({PROVIDER.shortName}), {PROVIDER.address}; adószám: {PROVIDER.taxNumber}; e-mail: {PROVIDER.email}.</p>
      <h2>2. Adatkezelések</h2>
      <h3>Kapcsolatfelvétel és ajánlatkérés</h3><p>Adatok: név, e-mail, telefon, üzenet és az önként megadott üzleti információk. Cél: válaszadás és szerződéskötést megelőző egyeztetés. Jogalap: GDPR 6. cikk (1) b), illetve nem az érintett által indított megkeresésnél f). Megőrzés: az ügy lezárásától legfeljebb 1 év, kivéve ha szerződés jön létre.</p>
      <h3>Ügyfélkapu, brief, szerződés és teljesítés</h3><p>Adatok: fiókazonosító, név, e-mail, brief, feltöltött fájlok, üzenetek, domainválasztás, elfogadási időpontok és projektelőzmények. Cél és jogalap: szerződés előkészítése és teljesítése (GDPR 6. cikk (1) b)), jogi igényeknél jogos érdek (f). Megőrzés: a szerződés megszűnésétől számított általános elévülési idő végéig, rendszerint 5 év.</p>
      <h3>Számlázás és könyvelés</h3><p>Adatok: név/cégnév, cím/székhely, adószám, díj és fizetési adatok. Jogalap: jogi kötelezettség (GDPR 6. cikk (1) c)). A számviteli bizonylatokat a számviteli szabályok szerinti 8 évig őrizzük.</p>
      <h3>Rendszer- és biztonsági naplók</h3><p>Adatok: IP-cím, időpont, böngésző- és műveleti napló. Cél: visszaélések megelőzése, hibakeresés és az elektronikus nyilatkozat bizonyíthatósága. Jogalap: jogos érdek (GDPR 6. cikk (1) f)). Megőrzés: főszabály szerint 12 hónap.</p>
      <h2>3. Címzettek és adattovábbítás</h2><ul><li><strong>Vercel Inc.</strong> – alkalmazás futtatása és naplózás</li><li><strong>Supabase, Inc.</strong> – adatbázis, fájltárolás és hitelesítés</li><li><strong>Resend, Inc.</strong> – tranzakciós e-mail</li><li><strong>Stripe Payments Europe, Ltd.</strong> – bankkártyás fizetés és ismétlődő előfizetési díjak kezelése; a bankkártyaadatot a ProjectEdge nem tárolja</li><li><strong>Billingo Technologies Zrt.</strong> – számlakiállítás és NAV-adatszolgáltatás</li><li><strong>könyvelő</strong> – jogszabályi adminisztráció, ha alkalmazandó</li><li><strong>domainregisztrátor</strong> – a kiválasztott domain regisztrációjához szükséges adatok</li></ul><p>Az EGT-n kívüli adattovábbítás megfelelő garanciák – különösen az Európai Bizottság megfelelőségi határozata vagy általános szerződési feltételek – alapján történik.</p>
      <h2>4. Érintetti jogok</h2><p>Kérhető hozzáférés, helyesbítés, törlés, korlátozás és adathordozás; jogos érdeken alapuló kezelés ellen tiltakozás nyújtható be. A kérelmet a {PROVIDER.email} címen lehet elküldeni. A választ indokolatlan késedelem nélkül, főszabály szerint egy hónapon belül adjuk meg.</p>
      <h2>5. Jogorvoslat</h2><p>Panasz tehető a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (1055 Budapest, Falk Miksa utca 9–11.; naih.hu), továbbá bírósághoz lehet fordulni.</p>
      <h2>6. Sütik, mérés és hirdetés</h2><p>A belépéshez és a biztonsághoz szükséges sütik hozzájárulás nélkül használhatók. Statisztikai és hirdetési célú sütiket — Google Analytics 4 és Google Ads — kizárólag előzetes, kifejezett hozzájárulás alapján helyezünk el; a hozzájárulás megadásáig ezek tiltott állapotban vannak (Google Consent Mode). A hozzájárulás bármikor módosítható vagy visszavonható a weboldal láblécében található „Süti beállítások” gombbal; a böngésző tárolt adatainak törlése után a választósáv újra megjelenik. E sütik célja a látogatottság mérése és a hirdetések eredményességének követése; adatkezelő ilyenkor a Google Ireland Limited is. Nem végzünk joghatással járó automatizált döntéshozatalt. Nem kötelező adatot megadni, de a szerződéshez szükséges adatok hiányában a szolgáltatás nem teljesíthető.</p>
      <h2>7. Biztonság és módosítás</h2><p>Hozzáférés-szabályozást, titkosított adatkapcsolatot, naplózást és mentési eljárásokat alkalmazunk. A tájékoztató érdemi változásáról az ügyfeleket az ügyfélkapuban vagy e-mailben tájékoztatjuk.</p>
      <p className="legal-note">Hatályos: 2026. augusztus 9. · <a href="/impresszum">Impresszum</a> · <a href="/aszf">ÁSZF</a></p>
    </section>
  </main>;
}
