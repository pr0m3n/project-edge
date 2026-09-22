import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Leiratkozás | ProjectEdge",
  description: "Leiratkozás a ProjectEdge hírleveléről.",
  robots: { index: false, follow: false }
};

/**
 * A leiratkozás VISSZAIGAZOLÁSA.
 *
 * Maga a leiratkozás már megtörtént: az `/api/marketing/unsubscribe` végpont
 * végezte el, és ide irányított át. Ez az oldal szándékosan nem csinál semmit
 * az adatbázissal — csak elmondja, mi történt.
 *
 * Miért fontos, hogy legyen ilyen oldal: egy leiratkozás, ami után az ember
 * egy üres képernyőt vagy egy hibaoldalt lát, bizonytalanságban hagyja, és
 * jellemzően oda vezet, hogy másodszor a „levélszemét" gombot nyomja meg
 * helyette — ami a küldő domainnek sokkal rosszabb.
 */
export default async function UnsubscribePage(props: PageProps<"/leiratkozas">) {
  const params = await props.searchParams;
  const state = typeof params.allapot === "string" ? params.allapot : "";

  const copy = state === "ok"
    ? {
        title: "Leiratkoztál a hírlevélről",
        body: "Több hírlevelet nem küldök. Ha ügyfél vagy, a szolgáltatásodhoz tartozó leveleket — számla, fizetési emlékeztető, havi jelentés — továbbra is megkapod, mert azok a szolgáltatás részei.",
        tone: "ok"
      }
    : state === "ismeretlen"
      ? {
          title: "Ez a leiratkozó link már nem érvényes",
          body: "Elképzelhető, hogy korábban már leiratkoztál, vagy a link régi levélből származik. Ha továbbra is kapsz hírlevelet, írj az info@projectedge.hu címre, és kézzel intézem.",
          tone: "warn"
        }
      : {
          title: "Most nem sikerült a leiratkozás",
          body: "Átmeneti hiba történt. Próbáld újra néhány perc múlva, vagy írj az info@projectedge.hu címre — kézzel is el tudom intézni.",
          tone: "warn"
        };

  return (
    <main className="site-shell">
      <SiteNav />
      <section className="unsubscribe-page">
        <span className="micro-label">ProjectEdge · Hírlevél</span>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div className="unsubscribe-actions">
          <Link className="button primary" href="/">Vissza a főoldalra</Link>
          <a className="button secondary" href="mailto:info@projectedge.hu">Írok inkább</a>
        </div>
      </section>
    </main>
  );
}
