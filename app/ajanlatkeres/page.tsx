import { QuoteForm } from "@/components/QuoteForm";
import { SiteNav } from "@/components/SiteNav";

export default function QuotePage() {
  return (
    <main className="site-shell quote-page">
      <SiteNav />
      <section className="quote-layout">
        <aside>
          <p className="micro-label">Ajánlatkérés</p>
          <h1>Írd le a projektet. A többit rendszerbe rakjuk.</h1>
          <p>
            Pár konkrét válaszból már látszik, milyen weboldalra, milyen lead folyamatra és milyen
            admin háttérre van szükség.
          </p>
          <div className="quote-note">
            <strong>Mi történik utána?</strong>
            <span>Megnézem az igényt, összerakom az irányt, és kapsz egy következő lépést.</span>
          </div>
        </aside>
        <QuoteForm />
      </section>
    </main>
  );
}
