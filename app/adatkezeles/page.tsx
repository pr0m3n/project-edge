import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Adatkezelési tájékoztató | ProjectEdge",
  description: "Hogyan kezeli a ProjectEdge a személyes adataidat — GDPR szerinti tájékoztató."
};

// A ProjectEdge jelenleg magánszemélyként, nem bejegyzett egyéni tevékenység
// keretében működik — ha ez változik (pl. egyéni vállalkozás bejegyzése),
// ezt az oldalt, az impresszumot és az ÁSZF-et frissíteni kell. Éles,
// nagyobb volumenű használat előtt érdemes jogásszal / adatvédelmi
// szakértővel átnézetni (GDPR / 2011. évi CXII. tv.).
export default function PrivacyPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Adatkezelés</p>
        <h1>Adatkezelési tájékoztató</h1>
        <p>
          Ez a tájékoztató bemutatja, milyen személyes adatokat kezelünk, milyen célból, és milyen
          jogaid vannak. Az adatkezelés az EU 2016/679 rendelet (GDPR) és a hazai jogszabályok
          szerint történik.
        </p>
      </section>

      <section className="legal-prose">
        <h2>1. Az adatkezelő</h2>
        <ul>
          <li><strong>Adatkezelő:</strong> Boczán Patrik (magánszemély, ProjectEdge néven)</li>
          <li><strong>Székhely:</strong> Budapest, 1141</li>
          <li><strong>E-mail:</strong> info@projectedge.hu</li>
          <li><strong>Telefon:</strong> +36 20 406 4954</li>
        </ul>

        <h2>2. Milyen adatokat kezelünk és miért</h2>
        <h3>a) Kapcsolatfelvétel / support (chat widget, ticket)</h3>
        <p>
          Kezelt adatok: név, e-mail cím, az üzenet tartalma. Cél: a megkeresésed megválaszolása.
          Jogalap: szerződéskötést megelőző lépések, illetve jogos érdek (GDPR 6. cikk (1) b) és f)).
        </p>
        <h3>b) Ügyfélkapu (regisztráció, projektek)</h3>
        <p>
          Kezelt adatok: e-mail cím, név, jelszó (titkosítva), a projekt briefjében megadott adatok,
          számlázási adatok. Cél: a fiók és a projekt kezelése, a szolgáltatás teljesítése. Jogalap:
          szerződés teljesítése (GDPR 6. cikk (1) b)).
        </p>
        <h3>c) Számlázás</h3>
        <p>
          A jogszabály által előírt számlázási adatokat a számviteli törvény szerinti ideig
          megőrizzük. Jogalap: jogi kötelezettség (GDPR 6. cikk (1) c)).
        </p>

        <h2>3. Adatfeldolgozók</h2>
        <ul>
          <li><strong>Vercel Inc.</strong> – tárhely / hosting</li>
          <li><strong>Supabase Inc.</strong> – adatbázis és hitelesítés</li>
          <li><strong>Resend</strong> – tranzakciós e-mailek küldése</li>
        </ul>
        <p>
          A foglaló és a vállalási díj fennmaradó része banki átutalással történik, közvetlenül az
          Adatkezelő bankszámlájára — ehhez külön fizetési szolgáltatót (pl. bankkártya-elfogadó) nem
          veszünk igénybe, az utaláshoz szükséges adatokat a bankod/Revolutod kezeli a saját
          feltételei szerint.
        </p>

        <h2>4. Az adatok megőrzési ideje</h2>
        <p>
          A fiókodhoz kötött adatokat a fiók törléséig, a számlázási adatokat a jogszabályban előírt
          ideig őrizzük. A fiókod bármikor törölheted az Ügyfélkapun, ami a kapcsolódó adatok
          törlését is elindítja.
        </p>

        <h2>5. A te jogaid</h2>
        <ul>
          <li>Tájékoztatáshoz és hozzáféréshez való jog</li>
          <li>Helyesbítéshez való jog</li>
          <li>Törléshez való jog („elfeledtetés")</li>
          <li>Az adatkezelés korlátozásához való jog</li>
          <li>Adathordozhatósághoz való jog</li>
          <li>Tiltakozáshoz való jog</li>
        </ul>
        <p>
          Jogaid gyakorlásához írj az info@projectedge.hu címre. Panaszt a Nemzeti Adatvédelmi és
          Információszabadság Hatóságnál (NAIH) tehetsz.
        </p>

        <h2>6. Sütik (cookie-k)</h2>
        <p>
          A weboldal a bejelentkezés fenntartásához technikailag szükséges sütiket használ. Ezek
          nélkül az Ügyfélkapu nem működne, így külön hozzájárulás nélkül alkalmazhatók.
        </p>

        <p className="legal-note">
          Lásd még az <a href="/impresszum">Impresszumot</a> és az <a href="/aszf">ÁSZF-et</a>.
        </p>
      </section>
    </main>
  );
}
