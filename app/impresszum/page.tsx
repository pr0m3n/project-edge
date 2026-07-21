import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Impresszum | ProjectEdge",
  description: "A ProjectEdge üzemeltetőjének és tárhelyszolgáltatójának adatai."
};

// A ProjectEdge jelenleg magánszemélyként, nem bejegyzett egyéni tevékenység
// keretében működik — nincs adószám / cégjegyzékszám. Ha ez változik (pl.
// egyéni vállalkozás bejegyzése), ezt az oldalt frissíteni kell a hivatalos
// adatokkal (Ektv. 2001. évi CVIII. tv. 4. §).
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
          <li><strong>Név:</strong> Boczán Patrik</li>
          <li><strong>Székhely / cím:</strong> Budapest, 1141</li>
          <li><strong>Jogi forma:</strong> magánszemély, jelenleg nem bejegyzett egyéni tevékenység — nincs adószám / cégjegyzékszám</li>
          <li><strong>E-mail:</strong> info@projectedge.hu</li>
          <li><strong>Telefon:</strong> +36 20 406 4954</li>
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
