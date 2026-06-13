import { QuoteForm } from "@/components/QuoteForm";
import { SiteNav } from "@/components/SiteNav";

export default function QuotePage() {
  return (
    <main className="site-shell quote-page">
      <SiteNav />
      <section className="quote-layout">
        <aside>
          <p className="micro-label">Ajánlatkérés</p>
          <h1>Írd le röviden, min szeretnél javítani.</h1>
          <p>
            Nem baj, ha még nincs kész briefed. Elég, ha leírod, van-e már oldalad, mi zavar benne,
            vagy milyen új irányt szeretnél.
          </p>
          <div className="quote-note">
            <strong>Mi történik utána?</strong>
            <span>Átnézem, válaszolok, és megmondom, szerintem mi lenne a legésszerűbb első lépés.</span>
          </div>
        </aside>
        <QuoteForm />
      </section>
    </main>
  );
}
