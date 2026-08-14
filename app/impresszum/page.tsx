import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { PROVIDER } from "@/lib/legal";

export const metadata: Metadata = { title: "Impresszum | ProjectEdge", description: "A ProjectEdge szolgáltatójának és tárhelyszolgáltatójának adatai.", alternates: { canonical: "/impresszum" } };

export default function ImpressumPage() {
  return <main className="site-shell light-page"><SiteNav />
    <section className="page-hero compact"><p className="micro-label dark">Impresszum</p><h1>Szolgáltatói adatok</h1><p>A projectedge.hu üzemeltetőjének kötelező azonosító és kapcsolattartási adatai.</p></section>
    <section className="legal-prose">
      <h2>Szolgáltató és üzemeltető</h2>
      <ul>
        <li><strong>Név / vállalkozó:</strong> {PROVIDER.legalName}</li><li><strong>Rövidített megjelölés:</strong> {PROVIDER.shortName}</li>
        <li><strong>Székhely:</strong> {PROVIDER.address}</li><li><strong>EV-nyilvántartási szám:</strong> {PROVIDER.registrationNumber}</li>
        <li><strong>Adószám:</strong> {PROVIDER.taxNumber}</li>
        <li><strong>Nyilvántartás:</strong> {PROVIDER.registrationAuthority}</li>
        <li><strong>E-mail:</strong> {PROVIDER.email}</li><li><strong>Weboldal:</strong> {PROVIDER.website}</li>
      </ul>
      <h2>Tárhely- és infrastruktúra-szolgáltató</h2>
      <ul><li><strong>Név:</strong> Vercel Inc.</li><li><strong>Web:</strong> vercel.com</li><li><strong>Kapcsolat:</strong> privacy@vercel.com</li></ul>
      <h2>További technikai szolgáltatók</h2>
      <ul><li><strong>Supabase, Inc.</strong> – adatbázis és hitelesítés (supabase.com)</li><li><strong>Resend, Inc.</strong> – rendszerüzenetek kézbesítése (resend.com)</li></ul>
      <h2>Kapcsolódó szabályzatok</h2><p>Az elektronikus szerződéskötés és szolgáltatás feltételeit az <a href="/aszf">ÁSZF</a>, a személyes adatok kezelését az <a href="/adatkezeles">Adatkezelési tájékoztató</a> rendezi.</p>
      <p className="legal-note">Hatályos: 2026. augusztus 9.</p>
    </section>
  </main>;
}
