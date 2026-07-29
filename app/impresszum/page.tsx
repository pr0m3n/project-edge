import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { PROVIDER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impresszum | ProjectEdge",
  description: "A ProjectEdge üzemeltetőjének és tárhelyszolgáltatójának adatai."
};

// A szolgáltatói adatok a lib/legal.ts-ben, EGY helyen élnek (ÁSZF és a
// vállalkozási szerződés is onnan olvassa). Cégalapítás / egyéni vállalkozás
// bejegyzése után elég ott kitölteni az adószámot és a nyilvántartási számot,
// és pontosítani a jogi formát — ez az oldal automatikusan követi
// (Ektv. 2001. évi CVIII. tv. 4. §).
export default function ImpressumPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Impresszum</p>
        <h1>Üzemeltetői adatok</h1>
        <p>
          A projectedge.hu weboldal üzemeltetőjének és tárhelyszolgáltatójának adatai az
          elektronikus kereskedelmi törvény (Ektv.) szerint.
        </p>
      </section>

      <section className="legal-prose">
        <h2>Szolgáltató</h2>
        <ul>
          <li><strong>Név:</strong> {PROVIDER.legalName}</li>
          <li><strong>Székhely / cím:</strong> {PROVIDER.address}</li>
          <li><strong>Jogi forma:</strong> {PROVIDER.legalForm}{PROVIDER.taxNumber ? "" : " — nincs adószám / cégjegyzékszám"}</li>
          {PROVIDER.taxNumber ? <li><strong>Adószám:</strong> {PROVIDER.taxNumber}</li> : null}
          {PROVIDER.registrationNumber ? (
            <li><strong>Nyilvántartási szám:</strong> {PROVIDER.registrationNumber}</li>
          ) : null}
          <li><strong>E-mail:</strong> {PROVIDER.email}</li>
          <li><strong>Telefon:</strong> {PROVIDER.phone}</li>
        </ul>

        <h2>Tárhelyszolgáltató</h2>
        <ul>
          <li><strong>Név:</strong> Vercel Inc.</li>
          <li><strong>Cím:</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</li>
          <li><strong>E-mail:</strong> privacy@vercel.com</li>
          <li><strong>Web:</strong> vercel.com</li>
        </ul>

        <h2>Adatbázis- és hitelesítési szolgáltató</h2>
        <ul>
          <li><strong>Név:</strong> Supabase Inc.</li>
          <li><strong>Web:</strong> supabase.com</li>
        </ul>

        <p className="legal-note">
          Az adatkezeléssel kapcsolatos részletekért lásd az{" "}
          <a href="/adatkezeles">Adatkezelési tájékoztatót</a>, a szolgáltatás feltételeiért az{" "}
          <a href="/aszf">ÁSZF-et</a>.
        </p>
      </section>
    </main>
  );
}
